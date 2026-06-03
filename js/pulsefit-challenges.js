/**
 * PulseFit — Défis quotidiens
 */
(function (global) {
  'use strict';

  const Store = () => global.PulseFitStore;

  const CHALLENGE_DEFS = [
    { id: 'water_2l', icon: '💧', title: 'Boire 2L d\'eau', detail: 'Hydratation · 2000 ml', xp: 25, manual: true },
    { id: 'steps_5000', icon: '🚶', title: 'Marcher 5000 pas', detail: 'Activité quotidienne', xp: 30, manual: true },
    { id: 'workout_done', icon: '🏋️', title: 'Faire une séance', detail: 'Entraînement validé', xp: 85, auto: 'workout' },
    { id: 'calories_ok', icon: '🎯', title: 'Respecter ses calories', detail: 'Macros du jour', xp: 40, auto: 'calories' },
    { id: 'sleep_8h', icon: '😴', title: 'Dormir 8h', detail: 'Sommeil enregistré', xp: 35, manual: true },
  ];

  function today() {
    return Store().todayISO();
  }

  function ensureBlock(state) {
    state.dailyChallenges = state.dailyChallenges || { date: null, completed: [], manual: {} };
    const d = today();
    if (state.dailyChallenges.date !== d) {
      state.dailyChallenges = { date: d, completed: [], manual: {} };
    }
    return state.dailyChallenges;
  }

  function getStepsToday(state) {
    const d = today();
    const w = state.wellness?.daily?.[d];
    if (w?.steps != null) return Number(w.steps) || 0;
    const j = (state.journal || []).find((x) => x.date === d && x.type === 'steps');
    return j ? Number(j.value) || 0 : Number(state.goals?.stepsToday) || 0;
  }

  function getWaterMl(state) {
    const d = today();
    const w = state.nutrition?.water?.[d];
    if (typeof w === 'number') return w;
    if (w?.ml != null) return Number(w.ml) || 0;
    if (w?.liters != null) return Math.round(Number(w.liters) * 1000);
    return 0;
  }

  function getSleepHours(state) {
    const d = today();
    const w = state.wellness?.daily?.[d];
    if (w?.sleepHours != null) return Number(w.sleepHours);
    if (w?.sleep != null) return Number(w.sleep);
    return 0;
  }

  function isWorkoutDoneToday(state) {
    const d = today();
    return state.schedule.some((s) => s.date === d && s.status === 'done')
      || state.sessionLogs.some((l) => l.date === d);
  }

  function isCaloriesOnTrack(state) {
    const targets = state.nutrition?.targets || {};
    const kcalTarget = Number(targets.kcal) || 0;
    if (!kcalTarget) return false;
    let todayCals = 0;
    const d = today();
    if (global.PulseFitNutrition?.getDayTotals) {
      todayCals = global.PulseFitNutrition.getDayTotals(d).calories || 0;
    } else {
      const entries = state.nutrition?.entries?.[d];
      if (entries) {
        ['breakfast', 'lunch', 'dinner', 'snack'].forEach((meal) => {
          (entries[meal] || []).forEach((e) => { todayCals += e.calories || 0; });
        });
      }
    }
    if (todayCals < kcalTarget * 0.75) return false;
    return todayCals <= kcalTarget * 1.12;
  }

  function autoComplete(state, block) {
    CHALLENGE_DEFS.forEach((c) => {
      if (block.completed.includes(c.id)) return;
      if (c.auto === 'workout' && isWorkoutDoneToday(state)) {
        block.completed.push(c.id);
        Store().addXp(state, c.xp);
      }
      if (c.auto === 'calories' && isCaloriesOnTrack(state)) {
        block.completed.push(c.id);
        Store().addXp(state, c.xp);
      }
    });
  }

  function getDailyChallenges(state) {
    state = state || Store().load();
    const block = ensureBlock(state);
    autoComplete(state, block);
    Store().save(state);

    return CHALLENGE_DEFS.map((c) => {
      let progress = 0;
      let hint = c.detail;
      if (c.id === 'water_2l') {
        const ml = getWaterMl(state);
        progress = Math.min(100, Math.round((ml / 2000) * 100));
        hint = `${ml} / 2000 ml`;
      } else if (c.id === 'steps_5000') {
        const steps = getStepsToday(state);
        progress = Math.min(100, Math.round((steps / 5000) * 100));
        hint = `${steps} / 5000 pas`;
      } else if (c.id === 'sleep_8h') {
        const h = getSleepHours(state);
        progress = Math.min(100, Math.round((h / 8) * 100));
        hint = h ? `${h}h enregistrées` : 'Journal bien-être';
      } else if (c.id === 'workout_done') {
        progress = isWorkoutDoneToday(state) ? 100 : 0;
        hint = progress ? 'Séance validée' : 'Programme ou calendrier';
      } else if (c.id === 'calories_ok') {
        progress = isCaloriesOnTrack(state) ? 100 : 0;
        hint = 'Nutrition du jour';
      }
      const done = block.completed.includes(c.id);
      return { ...c, done, progress, hint };
    });
  }

  function completeChallenge(challengeId) {
    const state = Store().load();
    const block = ensureBlock(state);
    const def = CHALLENGE_DEFS.find((c) => c.id === challengeId);
    if (!def || block.completed.includes(challengeId)) return { ok: false, state };

    let allowed = true;
    if (def.id === 'water_2l') allowed = getWaterMl(state) >= 1800 || block.manual[challengeId];
    if (def.id === 'steps_5000') allowed = getStepsToday(state) >= 4500 || block.manual[challengeId];
    if (def.id === 'sleep_8h') allowed = getSleepHours(state) >= 7.5 || block.manual[challengeId];
    if (def.auto === 'workout') allowed = isWorkoutDoneToday(state);
    if (def.auto === 'calories') allowed = isCaloriesOnTrack(state);

    if (!allowed && def.manual) {
      block.manual[challengeId] = true;
      allowed = true;
    }
    if (!allowed) return { ok: false, message: 'Objectif pas encore atteint — continuez !', state };

    block.completed.push(challengeId);
    state.gamification.challengesCompletedTotal = (Number(state.gamification.challengesCompletedTotal) || 0) + 1;
    Store().addXp(state, def.xp);
    Store().updateStreak(state);
    Store().checkBadges(state);
    Store().save(state);
    return { ok: true, xp: def.xp, state };
  }

  function checkAutoComplete(state) {
    state = state || Store().load();
    const block = ensureBlock(state);
    const before = block.completed.length;
    autoComplete(state, block);
    if (block.completed.length > before) Store().save(state);
    return state;
  }

  global.PulseFitChallenges = {
    CHALLENGE_DEFS,
    getDailyChallenges,
    completeChallenge,
    checkAutoComplete,
    ensureBlock,
  };
})(typeof window !== 'undefined' ? window : globalThis);
