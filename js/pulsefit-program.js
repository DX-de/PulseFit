/**
 * PulseFit — Programme sportif (store + XP + streaks)
 */
(function (global) {
  'use strict';

  const Store = () => global.PulseFitStore;
  const Engine = () => global.PulseFitProgramEngine;
  const AI = () => global.PulseFitProgramAI;

  const TRAINING_LEVELS = [
    { id: 'beginner', name: 'Débutant', minXp: 0 },
    { id: 'sportif', name: 'Sportif', minXp: 500 },
    { id: 'confirmed', name: 'Confirmé', minXp: 1200 },
    { id: 'expert', name: 'Expert', minXp: 2500 },
    { id: 'elite', name: 'Elite', minXp: 4000 },
  ];

  const TRAINING_BADGES = [
    { id: 'train_first', name: 'Première séance', icon: '🏋️' },
    { id: 'train_streak_7', name: '7 jours', icon: '🏆' },
    { id: 'train_streak_30', name: '30 jours', icon: '🏆' },
    { id: 'train_streak_100', name: '100 jours', icon: '🏆' },
    { id: 'train_goal_week', name: 'Objectif semaine', icon: '🎯' },
    { id: 'train_sessions_50', name: '50 séances', icon: '💪' },
  ];

  function uid() {
    return `tr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function ensureTraining(state) {
    if (!state.training) {
      state.training = { xp: 0, xpHistory: [], badges: [], programId: null };
    }
    return state.training;
  }

  function getTrainingLevel(xp) {
    const x = Number(xp) || 0;
    let level = TRAINING_LEVELS[0];
    TRAINING_LEVELS.forEach((l) => { if (x >= l.minXp) level = l; });
    const next = TRAINING_LEVELS[TRAINING_LEVELS.indexOf(level) + 1];
    return {
      ...level,
      xp: x,
      nextMin: next?.minXp,
      progress: next ? ((x - level.minXp) / (next.minXp - level.minXp)) * 100 : 100,
    };
  }

  function sessionStatus(session, today) {
    if (session.status === 'done') return 'done';
    if (session.date < today) return 'missed';
    if (session.date === today) return 'today';
    return 'upcoming';
  }

  function dayLabelFromDate(iso) {
    const labels = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    return labels[new Date(iso + 'T12:00:00').getDay()];
  }

  function getCurrentWeekSchedule() {
    const state = Store().load();
    const today = Store().todayISO();
    const mondayOffset = (new Date(today + 'T12:00:00').getDay() + 6) % 7;
    const start = Store().addDays(today, -mondayOffset);
    const end = Store().addDays(start, 6);
    return (state.schedule || []).filter((s) => s.date >= start && s.date <= end).map((s) => ({
      ...s,
      dayLabel: s.dayLabel || dayLabelFromDate(s.date),
      statusKey: sessionStatus(s, today),
    }));
  }

  function generateProgram(config) {
    const state = Store().load();
    const { program, schedule } = Engine().generate(config);
    state.program = program;
    state.schedule = schedule;
    state.profile.goal = config.goal || state.profile.goal;
    state.profile.level = config.level || state.profile.level;
    if (config.gender) state.profile.gender = config.gender;
    if (config.age) state.profile.age = Number(config.age);
    if (config.height) state.profile.height = Number(config.height);
    if (config.weight) state.profile.weight = Number(config.weight);
    state.goals.weeklySessions = parseInt(program.sessions, 10) || 3;
    ensureTraining(state).programId = uid();
    const gk = global.PulseFitProgramEngine.goalKey(config.goal);
    state.nutrition = state.nutrition || { targets: {}, days: {} };
    state.nutrition.targets = gk === 'muscle'
      ? { kcal: 2800, protein: 190, carbs: 320, fat: 80 }
      : gk === 'weight'
        ? { kcal: 1900, protein: 150, carbs: 180, fat: 60 }
        : { kcal: 2180, protein: 170, carbs: 260, fat: 75 };
    Store().save(state);
    if (global.PulseFitProgramCloud?.isEnabled?.()) {
      global.PulseFitProgramCloud.pushAll(state).catch(console.warn);
    }
    return { program, schedule };
  }

  function toggleExercise(sessionId, exerciseIndex) {
    const state = Store().load();
    const sess = state.schedule.find((s) => s.id === sessionId);
    if (!sess || !sess.exercises[exerciseIndex]) return null;
    sess.exercises[exerciseIndex].done = !sess.exercises[exerciseIndex].done;
    Store().save(state);
    return sess;
  }

  function exerciseProgress(session) {
    const total = session.exercises?.length || 0;
    const done = (session.exercises || []).filter((e) => e.done).length;
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }

  function addTrainingXp(state, amount, reason) {
    const tr = ensureTraining(state);
    tr.xp = (tr.xp || 0) + amount;
    tr.xpHistory = tr.xpHistory || [];
    tr.xpHistory.unshift({ id: uid(), amount, reason, at: new Date().toISOString() });
    state.gamification.xp = (state.gamification.xp || 0) + amount;
    if (global.PulseFitProgramCloud?.isEnabled?.()) {
      global.PulseFitProgramCloud.insertXp(amount, reason).catch(console.warn);
    }
  }

  function checkTrainingBadges(state) {
    const tr = ensureTraining(state);
    if (!tr.badges) tr.badges = [];
    const award = (id) => { if (!tr.badges.includes(id)) tr.badges.push(id); };
    if ((state.sessionLogs || []).length >= 1) award('train_first');
    if (state.streak.current >= 7) award('train_streak_7');
    if (state.streak.current >= 30) award('train_streak_30');
    if (state.streak.current >= 100) award('train_streak_100');
    if ((state.sessionLogs || []).length >= 50) award('train_sessions_50');
    const stats = Store().getStats();
    if (stats.sessionsDone >= stats.sessionsPlanned && stats.sessionsPlanned > 0) {
      award('train_goal_week');
    }
  }

  function completeWorkout(sessionId, payload) {
    const state = Store().load();
    const sess = state.schedule.find((s) => s.id === sessionId);
    if (!sess) return null;

    sess.exercises.forEach((ex) => { ex.done = true; });
    const prog = exerciseProgress(sess);

    const log = Store().completeSession(sessionId, {
      durationMin: payload?.durationMin || sess.durationMin,
      calories: payload?.calories || sess.calories,
      feeling: payload?.feeling || 8,
      note: payload?.note || '',
      exercises: sess.exercises,
    });

    addTrainingXp(state, 50, 'Séance terminée');
    if (state.streak.current >= 7) addTrainingXp(state, 20, 'Streak actif');
    checkTrainingBadges(state);

    if (global.PulseFitProgramCloud?.isEnabled?.()) {
      global.PulseFitProgramCloud.insertCompleted(sess, prog, 50).catch(console.warn);
    }

    Store().save(state);
    return log;
  }

  function runAiAdaptation() {
    const state = Store().load();
    if (!state.program) return null;
    const adaptation = AI().adapt(state);
    AI().applyAdaptation(state, adaptation);
    Store().save(state);
    if (global.PulseFitProgramCloud?.isEnabled?.()) {
      global.PulseFitProgramCloud.pushAll(state).catch(console.warn);
    }
    return adaptation;
  }

  function getStats(rangeDays) {
    const state = Store().load();
    const cut = Store().addDays(Store().todayISO(), -(rangeDays || 30));
    const logs = (state.sessionLogs || []).filter((l) => l.date >= cut);
    const byWeek = {};
    logs.forEach((l) => {
      const w = l.date.slice(0, 7);
      if (!byWeek[w]) byWeek[w] = { sessions: 0, calories: 0, minutes: 0 };
      byWeek[w].sessions += 1;
      byWeek[w].calories += l.calories || 0;
      byWeek[w].minutes += l.durationMin || 0;
    });
    const tr = ensureTraining(state);
    return {
      sessions: logs.length,
      calories: logs.reduce((a, l) => a + (l.calories || 0), 0),
      minutes: logs.reduce((a, l) => a + (l.durationMin || 0), 0),
      byWeek: Object.entries(byWeek).map(([k, v]) => ({ week: k, ...v })),
      xp: tr.xp || 0,
      level: getTrainingLevel(tr.xp),
    };
  }

  global.PulseFitProgram = {
    TRAINING_LEVELS,
    TRAINING_BADGES,
    ensureTraining,
    getTrainingLevel,
    sessionStatus,
    getCurrentWeekSchedule,
    generateProgram,
    toggleExercise,
    exerciseProgress,
    completeWorkout,
    runAiAdaptation,
    getStats,
  };
})(typeof window !== 'undefined' ? window : globalThis);
