/**
 * PulseFit — Sync Supabase Journal IA
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

  function entryToRow(userId, date, e) {
    return {
      user_id: userId,
      log_date: date,
      mood: e.mood,
      energy: e.energy,
      difficulty: e.difficulty,
      motivation: e.motivation,
      sleep_quality: e.sleep,
      hydration: e.hydration,
      nutrition_adherence: e.nutrition,
      workout_feeling: e.workout,
      stress: e.stress,
      note: e.note || null,
      updated_at: new Date().toISOString(),
    };
  }

  function ensureWellness(state) {
    if (global.PulseFitJournal?.ensureWellness) {
      return global.PulseFitJournal.ensureWellness(state);
    }
    if (!state.wellness) {
      state.wellness = {
        daily: {},
        notes: [],
        insights: [],
        alerts: [],
        recommendations: [],
        gamification: { xp: 0, badges: [], weekStreak: 0, lastWeekKey: null },
      };
    }
    return state.wellness;
  }

  async function pull(state) {
    const sb = db();
    const userId = await getUserId();
    if (!sb || !userId) return state;

    const w = ensureWellness(state);

    const { data: entries } = await sb.from('journal_entries').select('*').eq('user_id', userId).order('log_date', { ascending: false }).limit(120);
    (entries || []).forEach((row) => {
      w.daily[row.log_date] = {
        mood: row.mood,
        energy: row.energy,
        difficulty: row.difficulty,
        motivation: row.motivation,
        sleep: row.sleep_quality,
        hydration: row.hydration,
        nutrition: row.nutrition_adherence,
        workout: row.workout_feeling,
        stress: row.stress,
        note: row.note,
        completedAt: row.updated_at,
        _dbId: row.id,
      };
    });

    const { data: notes } = await sb.from('journal_notes').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(80);
    w.notes = (notes || []).map((n) => ({
      id: n.external_id || n.id,
      date: n.log_date,
      body: n.body,
      tags: n.tags || [],
      createdAt: n.created_at,
    }));

    const { data: insights } = await sb.from('journal_ai_insights').select('*').eq('user_id', userId).eq('dismissed', false).order('created_at', { ascending: false }).limit(30);
    w.insights = (insights || []).filter((i) => i.severity !== 'danger' && i.severity !== 'warning').map((i) => ({
      type: i.insight_type,
      severity: i.severity,
      message: i.message,
    }));
    w.alerts = (insights || []).filter((i) => i.severity === 'danger' || i.severity === 'warning').map((i) => ({
      type: i.insight_type,
      severity: i.severity,
      message: i.message,
    }));

    const { data: badges } = await sb.from('journal_achievements').select('badge_id').eq('user_id', userId);
    w.gamification.badges = (badges || []).map((b) => b.badge_id);

    const { data: weights } = await sb.from('weight_history').select('*').eq('user_id', userId).order('log_date', { ascending: true });
    if (weights?.length) {
      state.nutrition = state.nutrition || {};
      state.nutrition.weightHistory = weights.map((r) => ({
        date: r.log_date,
        weight: Number(r.weight_kg),
        note: r.note,
      }));
      const last = weights[weights.length - 1];
      if (last?.weight_kg) state.profile.weight = Number(last.weight_kg);
    }

    const { data: photos } = await sb.from('progress_photos').select('*').eq('user_id', userId);
    if (photos?.length) {
      state.nutrition = state.nutrition || global.PulseFitNutrition?.defaultNutritionBlock?.() || { progressPhotos: { before: {}, after: {} } };
      state.nutrition.progressPhotos = { before: {}, after: {} };
      photos.forEach((p) => {
        if (!state.nutrition.progressPhotos[p.phase]) state.nutrition.progressPhotos[p.phase] = {};
        state.nutrition.progressPhotos[p.phase][p.angle] = { url: p.public_url, at: p.taken_at };
      });
    }

    Store().save(state);
    return state;
  }

  async function pushDaily(date, entry) {
    const sb = db();
    const userId = await getUserId();
    if (!sb || !userId) return;
    await sb.from('journal_entries').upsert(entryToRow(userId, date, entry), { onConflict: 'user_id,log_date' });
  }

  async function pushMoodSleepHydration(date, entry) {
    const sb = db();
    const userId = await getUserId();
    if (!sb || !userId) return;
    await sb.from('sleep_tracking').upsert({
      user_id: userId,
      log_date: date,
      quality: entry.sleep,
      hours: null,
    }, { onConflict: 'user_id,log_date' });
    await sb.from('mood_tracking').insert({
      user_id: userId,
      log_date: date,
      mood: entry.mood,
      energy: entry.energy,
      stress: entry.stress,
    });
    await sb.from('hydration_tracking').upsert({
      user_id: userId,
      log_date: date,
      score: entry.hydration,
      liters: entry.hydrationLiters || 0,
      glasses: entry.hydrationGlasses || 0,
    }, { onConflict: 'user_id,log_date' });
  }

  async function insertNote(note) {
    const sb = db();
    const userId = await getUserId();
    if (!sb || !userId) return;
    await sb.from('journal_notes').insert({
      user_id: userId,
      log_date: note.date,
      body: note.body,
      tags: note.tags,
      external_id: note.id,
    });
  }

  async function insertWeight(date, weightKg, note) {
    const sb = db();
    const userId = await getUserId();
    if (!sb || !userId) return;
    await sb.from('weight_history').upsert({
      user_id: userId,
      log_date: date,
      weight_kg: weightKg,
      note: note || null,
    }, { onConflict: 'user_id,log_date' });
  }

  async function pushInsights(report) {
    const sb = db();
    const userId = await getUserId();
    if (!sb || !userId) return;
    const rows = [
      ...(report.insights || []),
      ...(report.alerts || []),
    ].map((i) => ({
      user_id: userId,
      insight_type: i.type,
      message: i.message,
      severity: i.severity || 'info',
    }));
    if (!rows.length) return;
    await sb.from('journal_ai_insights').insert(rows);
  }

  async function insertBadge(badgeId) {
    const sb = db();
    const userId = await getUserId();
    if (!sb || !userId) return;
    await sb.from('journal_achievements').upsert({
      user_id: userId,
      badge_id: badgeId,
    }, { onConflict: 'user_id,badge_id' });
  }

  async function insertXp(amount, reason) {
    const sb = db();
    const userId = await getUserId();
    if (!sb || !userId) return;
    await sb.from('training_xp_history').insert({ user_id: userId, amount, reason: `journal: ${reason}` });
  }

  global.PulseFitJournalCloud = {
    isEnabled,
    pull,
    pushDaily,
    pushMoodSleepHydration,
    insertNote,
    insertWeight,
    pushInsights,
    insertBadge,
    insertXp,
  };
})(typeof window !== 'undefined' ? window : globalThis);
