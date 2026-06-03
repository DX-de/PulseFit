/**
 * PulseFit — Sync Supabase
 */
(function (global) {
  'use strict';

  const Store = () => global.PulseFitStore;

  function db() {
    return global.PulseFitSupabase?.getClient?.();
  }

  function isEnabled() {
    return global.PulseFitSupabase?.isConfigured?.();
  }

  async function getUserId() {
    const sb = db();
    if (!sb) return null;
    const { data: { user } } = await sb.auth.getUser();
    return user?.id || null;
  }

  function stateToProfileRow(state, userId) {
    const p = state.profile;
    const num = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));
    return {
      id: userId,
      first_name: p.firstName || '',
      last_name: p.lastName || '',
      age: num(p.age),
      gender: p.gender || null,
      height_cm: num(p.height),
      weight_kg: num(p.weight),
      target_weight_kg: num(p.targetWeight),
      start_weight_kg: num(p.startWeight),
      goal: p.goal || null,
      level: p.level || null,
      avatar_url: p.avatar || null,
      onboarding_done: !!state.onboardingDone,
      streak_current: state.streak?.current || 0,
      streak_longest: state.streak?.longest || 0,
      streak_last_date: state.streak?.lastActiveDate || null,
      xp: state.gamification?.xp || 0,
      badges: state.gamification?.badges || [],
      updated_at: new Date().toISOString(),
    };
  }

  function profileRowToState(row, state) {
    if (!row) return state;
    const p = state.profile;
    state.profile = {
      ...p,
      firstName: row.first_name ?? p.firstName,
      lastName: row.last_name ?? p.lastName,
      name: `${row.first_name ?? p.firstName ?? ''} ${row.last_name ?? p.lastName ?? ''}`.trim() || p.name || '',
      age: row.age != null ? row.age : p.age,
      gender: row.gender ?? p.gender,
      height: row.height_cm != null ? Number(row.height_cm) : p.height,
      weight: row.weight_kg != null ? Number(row.weight_kg) : p.weight,
      targetWeight: row.target_weight_kg != null ? Number(row.target_weight_kg) : p.targetWeight,
      startWeight: row.start_weight_kg != null ? Number(row.start_weight_kg) : p.startWeight,
      goal: row.goal ?? p.goal,
      level: row.level ?? p.level,
      avatar: row.avatar_url || p.avatar,
    };
    state.onboardingDone = row.onboarding_done;
    state.streak = {
      current: row.streak_current || 0,
      longest: row.streak_longest || 0,
      lastActiveDate: row.streak_last_date,
    };
    state.gamification = { xp: row.xp || 0, badges: row.badges || [] };
    return state;
  }

  function mergeLocalProfile(state, localProfile, row) {
    if (!localProfile) return false;
    let needsRepush = false;
    const pairs = [
      ['firstName', 'first_name', false],
      ['lastName', 'last_name', false],
      ['age', 'age', true],
      ['gender', 'gender', false],
      ['height', 'height_cm', true],
      ['weight', 'weight_kg', true],
      ['targetWeight', 'target_weight_kg', true],
      ['startWeight', 'start_weight_kg', true],
      ['goal', 'goal', false],
      ['level', 'level', false],
      ['avatar', 'avatar_url', false],
    ];
    pairs.forEach(([localKey, remoteKey, isNum]) => {
      const localVal = localProfile[localKey];
      const remoteVal = row ? row[remoteKey] : null;
      if (localVal != null && localVal !== '' && (remoteVal == null || remoteVal === '')) {
        state.profile[localKey] = isNum ? Number(localVal) : localVal;
        needsRepush = true;
      }
    });
    return needsRepush;
  }

  async function pullAll() {
    const sb = db();
    const userId = await getUserId();
    if (!sb || !userId) throw new Error('Non connecté à Supabase');

    const state = Store().load();
    const localProfile = { ...state.profile };
    state.demoSeeded = false;

    const { data: profile, error: profileErr } = await sb.from('users_profiles').select('*').eq('id', userId).maybeSingle();
    if (profileErr) throw new Error(profileErr.message);
    profileRowToState(profile, state);
    const needsRepush = mergeLocalProfile(state, localProfile, profile);

    const { data: sub } = await sb.from('subscriptions').select('plan').eq('user_id', userId).maybeSingle();
    state.subscription = sub?.plan || 'free';

    const { data: programs } = await sb.from('workout_programs').select('*').eq('user_id', userId).eq('is_active', true).order('created_at', { ascending: false }).limit(1);
    const prog = programs?.[0];
    if (prog) {
      state.program = {
        goal: prog.goal,
        level: prog.level,
        duration: prog.duration,
        sessions: prog.sessions_per_week,
        program: prog.program_name,
        createdAt: prog.created_at,
        _dbId: prog.id,
      };
      state.schedule = Array.isArray(prog.schedule) ? prog.schedule : [];
    } else {
      state.program = null;
      state.schedule = [];
    }

    const { data: sessions } = await sb.from('workout_sessions').select('*').eq('user_id', userId).order('session_date', { ascending: false });
    state.sessionLogs = (sessions || []).filter((s) => s.status === 'done').map((s) => ({
      id: s.external_id || s.id,
      scheduleId: s.external_id,
      date: s.session_date,
      title: s.title,
      type: s.session_type,
      durationMin: s.duration_min,
      calories: s.calories,
      feeling: s.feeling,
      note: s.note,
      completedAt: s.completed_at,
    }));

    const scheduleFromSessions = (sessions || []).filter((s) => s.status === 'planned');
    if (state.schedule.length === 0 && scheduleFromSessions.length) {
      state.schedule = scheduleFromSessions.map((s) => ({
        id: s.external_id || s.id,
        date: s.session_date,
        title: s.title,
        type: s.session_type,
        durationMin: s.duration_min,
        calories: s.calories,
        exercises: s.exercises || [],
        status: 'planned',
      }));
    }

    const { data: nutrition } = await sb.from('nutrition_logs').select('*').eq('user_id', userId);
    state.nutrition.days = {};
    (nutrition || []).forEach((n) => {
      if (!state.nutrition.days[n.log_date]) state.nutrition.days[n.log_date] = { meals: {} };
      state.nutrition.days[n.log_date].meals[n.meal_key] = n.logged;
    });

    const { data: coachMsgs } = await sb.from('ai_coach_messages').select('*').eq('user_id', userId).order('created_at', { ascending: true });
    state.coach.conversations = [{
      id: 'main',
      messages: (coachMsgs || []).map((m) => ({ role: m.role, text: m.content, at: m.created_at })),
    }];

    const { data: progress } = await sb.from('user_progress').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    state.journal = (progress || []).map((j) => ({
      id: j.id,
      date: j.log_date,
      type: j.entry_type,
      value: j.weight_kg,
      mood: j.mood,
      energy: j.energy,
      difficulty: j.difficulty,
      text: j.comment || '',
      exercise: j.exercise || '',
    }));

    Store().save(state);
    if (needsRepush) {
      try {
        await pushProfile(state);
      } catch (e) {
        console.warn('Republish local profile metrics:', e);
      }
    }
    return state;
  }

  async function pushProfile(state) {
    const sb = db();
    const userId = await getUserId();
    if (!sb || !userId) throw new Error('Session expirée — reconnectez-vous');
    const row = stateToProfileRow(state, userId);
    const { data, error } = await sb.from('users_profiles').upsert(row, { onConflict: 'id' }).select().single();
    if (error) throw new Error(error.message);
    if (data) profileRowToState(data, state);
    return data;
  }

  async function pushProgram(state) {
    const sb = db();
    const userId = await getUserId();
    if (!sb || !userId || !state.program) return;

    const row = {
      user_id: userId,
      goal: state.program.goal,
      level: state.program.level,
      duration: state.program.duration,
      sessions_per_week: state.program.sessions,
      program_name: state.program.program,
      schedule: state.schedule || [],
      is_active: true,
    };

    if (state.program._dbId) {
      await sb.from('workout_programs').update(row).eq('id', state.program._dbId);
    } else {
      await sb.from('workout_programs').update({ is_active: false }).eq('user_id', userId);
      const { data } = await sb.from('workout_programs').insert(row).select('id').single();
      if (data) state.program._dbId = data.id;
      Store().save(state);
    }
  }

  async function pushSubscription(plan) {
    const sb = db();
    const userId = await getUserId();
    if (!sb || !userId) return;
    await sb.from('subscriptions').upsert({ user_id: userId, plan, updated_at: new Date().toISOString() });
  }

  async function upsertSession(item, programId) {
    const sb = db();
    const userId = await getUserId();
    if (!sb || !userId) return;
    const row = {
      user_id: userId,
      program_id: programId || null,
      external_id: item.id,
      title: item.title,
      session_type: item.type,
      session_date: item.date,
      duration_min: item.durationMin,
      calories: item.calories,
      status: item.status || 'planned',
      exercises: item.exercises || [],
      feeling: item.feeling ?? null,
      note: item.note ?? null,
      completed_at: item.status === 'done' ? (item.completedAt || new Date().toISOString()) : null,
    };
    const { data: existing } = await sb.from('workout_sessions').select('id').eq('user_id', userId).eq('external_id', item.id).maybeSingle();
    if (existing) await sb.from('workout_sessions').update(row).eq('id', existing.id);
    else await sb.from('workout_sessions').insert(row);
  }

  async function pushFullState(state) {
    if (!isEnabled()) return;
    const userId = await getUserId();
    if (!userId) return;
    await pushProfile(state);
    await pushProgram(state);
    await pushSubscription(state.subscription || 'free');
    for (const s of state.schedule || []) {
      await upsertSession(s, state.program?._dbId);
    }
    for (const log of state.sessionLogs || []) {
      await upsertSession({
        id: log.scheduleId || log.id,
        title: log.title,
        type: log.type,
        date: log.date,
        durationMin: log.durationMin,
        calories: log.calories,
        status: 'done',
        feeling: log.feeling,
        note: log.note,
        completedAt: log.completedAt,
      }, state.program?._dbId);
    }
  }

  async function insertCoachMessage(role, content) {
    const sb = db();
    const userId = await getUserId();
    if (!sb || !userId) return;
    await sb.from('ai_coach_messages').insert({ user_id: userId, role, content });
  }

  async function insertProgress(entry) {
    const sb = db();
    const userId = await getUserId();
    if (!sb || !userId) return null;
    const { data } = await sb.from('user_progress').insert({
      user_id: userId,
      log_date: entry.date || Store().todayISO(),
      entry_type: entry.type || 'note',
      weight_kg: entry.value ?? null,
      mood: entry.mood ?? null,
      energy: entry.energy ?? null,
      difficulty: entry.difficulty ?? null,
      comment: entry.text || entry.comment || '',
      exercise: entry.exercise || null,
    }).select('id').single();
    return data;
  }

  async function upsertNutrition(date, mealKey, logged) {
    const sb = db();
    const userId = await getUserId();
    if (!sb || !userId) return;
    await sb.from('nutrition_logs').upsert({
      user_id: userId,
      log_date: date,
      meal_key: mealKey,
      logged,
    }, { onConflict: 'user_id,log_date,meal_key' });
  }

  global.PulseFitCloud = {
    isEnabled,
    pullAll,
    pushFullState,
    pushProfile,
    pushProgram,
    insertCoachMessage,
    insertProgress,
    upsertNutrition,
    upsertSession,
    getUserId,
  };
})(typeof window !== 'undefined' ? window : globalThis);
