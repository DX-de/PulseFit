/**
 * PulseFit — Sync Supabase programme sportif
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

  async function pull(state) {
    const sb = db();
    const userId = await getUserId();
    if (!sb || !userId) return state;

    const { data: prog } = await sb.from('training_programs').select('*').eq('user_id', userId).eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle();

    const { data: sessions } = await sb.from('training_sessions').select('*').eq('user_id', userId).order('session_date', { ascending: true });

    if (prog) {
      state.program = {
        goal: prog.goal,
        level: prog.level,
        duration: `${prog.session_duration_min} minutes`,
        sessions: String(prog.sessions_per_week),
        program: prog.program_name,
        createdAt: prog.created_at,
        config: prog.config || {},
        intensityMultiplier: Number(prog.intensity_multiplier) || 1,
        _trainingId: prog.id,
      };
      state.training = state.training || {};
      state.training.programId = prog.id;
    }

    if (sessions?.length) {
      state.schedule = sessions.map((s) => ({
        id: s.external_id || s.id,
        date: s.session_date,
        dayLabel: s.day_label,
        title: s.title,
        type: s.session_type,
        durationMin: s.duration_min,
        calories: s.calories,
        difficulty: s.difficulty,
        exercises: s.exercises || [],
        status: s.status,
      }));
    }

    const { data: streak } = await sb.from('training_streaks').select('*').eq('user_id', userId).maybeSingle();
    if (streak) {
      state.streak = {
        current: streak.current,
        longest: streak.longest,
        lastActiveDate: streak.last_active_date,
      };
    }

    const { data: xpRows } = await sb.from('training_xp_history').select('amount').eq('user_id', userId);
    const xp = (xpRows || []).reduce((a, r) => a + r.amount, 0);
    state.training = state.training || {};
    state.training.xp = xp;

    const { data: badges } = await sb.from('training_achievements').select('badge_id').eq('user_id', userId);
    state.training.badges = (badges || []).map((b) => b.badge_id);

    const { data: completed } = await sb.from('completed_sessions').select('*').eq('user_id', userId).order('session_date', { ascending: false });
    state.sessionLogs = (completed || []).map((c) => ({
      id: c.external_id || c.id,
      scheduleId: c.external_id,
      date: c.session_date,
      title: c.title,
      type: 'workout',
      durationMin: c.duration_min,
      calories: c.calories,
      feeling: 8,
      completedAt: c.completed_at,
    }));

    Store().save(state);
    return state;
  }

  async function pushProgram(state) {
    const sb = db();
    const userId = await getUserId();
    const p = state.program;
    if (!sb || !userId || !p) return null;

    await sb.from('training_programs').update({ is_active: false }).eq('user_id', userId);

    const row = {
      user_id: userId,
      program_name: p.program,
      goal: p.goal,
      level: p.level,
      sessions_per_week: parseInt(p.sessions, 10) || 3,
      session_duration_min: parseInt(String(p.duration), 10) || 45,
      config: p.config || {},
      intensity_multiplier: p.intensityMultiplier || 1,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    let programId = p._trainingId;
    if (programId) {
      await sb.from('training_programs').update(row).eq('id', programId);
    } else {
      const { data } = await sb.from('training_programs').insert(row).select('id').single();
      programId = data?.id;
      state.program._trainingId = programId;
    }
    return programId;
  }

  async function pushSessions(state, programId) {
    const sb = db();
    const userId = await getUserId();
    if (!sb || !userId) return;
    for (const s of state.schedule || []) {
      const row = {
        user_id: userId,
        program_id: programId,
        external_id: s.id,
        title: s.title,
        session_type: s.type,
        session_date: s.date,
        day_label: s.dayLabel,
        duration_min: s.durationMin,
        calories: s.calories,
        difficulty: s.difficulty,
        status: s.status,
        exercises: s.exercises,
        completed_at: s.status === 'done' ? new Date().toISOString() : null,
      };
      const { data: ex } = await sb.from('training_sessions').select('id').eq('user_id', userId).eq('external_id', s.id).maybeSingle();
      if (ex) await sb.from('training_sessions').update(row).eq('id', ex.id);
      else await sb.from('training_sessions').insert(row);
    }
  }

  async function pushStreak(state) {
    const sb = db();
    const userId = await getUserId();
    if (!sb || !userId) return;
    await sb.from('training_streaks').upsert({
      user_id: userId,
      current: state.streak?.current || 0,
      longest: state.streak?.longest || 0,
      last_active_date: state.streak?.lastActiveDate,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  }

  async function pushAll(state) {
    if (!isEnabled()) return;
    const programId = await pushProgram(state);
    await pushSessions(state, programId);
    await pushStreak(state);
    Store().save(state);
  }

  async function insertCompleted(sess, prog, xp) {
    const sb = db();
    const userId = await getUserId();
    if (!sb || !userId) return;
    await sb.from('completed_sessions').insert({
      user_id: userId,
      external_id: sess.id,
      title: sess.title,
      session_date: sess.date,
      duration_min: sess.durationMin,
      calories: sess.calories,
      exercises_done: prog.done,
      exercises_total: prog.total,
      xp_earned: xp,
    });
    await pushStreak(Store().load());
  }

  async function insertXp(amount, reason) {
    const sb = db();
    const userId = await getUserId();
    if (!sb || !userId) return;
    await sb.from('training_xp_history').insert({ user_id: userId, amount, reason });
  }

  global.PulseFitProgramCloud = {
    isEnabled,
    pull,
    pushAll,
    pushProgram,
    insertCompleted,
    insertXp,
  };
})(typeof window !== 'undefined' ? window : globalThis);
