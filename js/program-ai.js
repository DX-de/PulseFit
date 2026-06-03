/**
 * PulseFit — Adaptation IA du programme
 */
(function (global) {
  'use strict';

  function analyze(state) {
    const today = global.PulseFitStore.todayISO();
    const weekStart = global.PulseFitStore.addDays(today, -6);
    const schedule = state.schedule || [];
    const weekSessions = schedule.filter((s) => s.date >= weekStart && s.date <= today);
    const done = weekSessions.filter((s) => s.status === 'done').length;
    const missed = schedule.filter((s) => s.date < today && s.status === 'planned').length;
    const total = weekSessions.length || 1;
    const completionRate = done / total;
    const logs = state.sessionLogs || [];
    const avgFeeling = logs.length
      ? logs.slice(0, 5).reduce((a, l) => a + (l.feeling || 7), 0) / Math.min(5, logs.length)
      : 7;
    const weightDelta = (state.profile?.startWeight || state.profile?.weight) - state.profile?.weight;

    return { done, missed, completionRate, avgFeeling, weightDelta, weekSessions: total };
  }

  function adapt(state) {
    const a = analyze(state);
    const mult = state.program?.intensityMultiplier || 1;
    let newMult = mult;
    let message = 'Programme stable — continuez sur cette lancée.';

    if (a.completionRate >= 0.85 && a.avgFeeling >= 7) {
      newMult = Math.min(1.25, mult + 0.08);
      message = 'Progression excellente : +8 % de volume et intensité sur la semaine prochaine.';
    } else if (a.missed >= 2 || a.completionRate < 0.5) {
      newMult = Math.max(0.75, mult - 0.1);
      message = 'Charge réduite de 10 % — séances plus courtes pour reprendre le rythme.';
    } else if (a.avgFeeling < 5) {
      newMult = Math.max(0.8, mult - 0.05);
      message = 'Récupération prioritaire : -5 % intensité, focus mobilité.';
    }

    if (a.weightDelta >= 2 && global.PulseFitProgramEngine?.goalKey(state.program?.goal) === 'weight') {
      message += ' Perte de poids détectée — maintien cardio.';
    }

    return {
      intensityMultiplier: Math.round(newMult * 100) / 100,
      message,
      analysis: a,
    };
  }

  function applyAdaptation(state, adaptation) {
    const mult = adaptation.intensityMultiplier;
    state.program.intensityMultiplier = mult;
    state.schedule.forEach((s) => {
      if (s.status !== 'done') {
        s.durationMin = Math.round(s.durationMin * mult);
        s.calories = Math.round(s.calories * mult);
        s.difficulty = Math.min(10, Math.max(1, Math.round((s.difficulty || 5) * mult)));
      }
    });
    state.coach = state.coach || { adjustments: [], conversations: [] };
    state.coach.adjustments.unshift({
      id: `adj-${Date.now()}`,
      date: global.PulseFitStore.todayISO(),
      message: adaptation.message,
      applied: true,
    });
    return state;
  }

  global.PulseFitProgramAI = { analyze, adapt, applyAdaptation };
})(typeof window !== 'undefined' ? window : globalThis);
