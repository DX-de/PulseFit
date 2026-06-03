/**
 * PulseFit — Moteur métriques journal
 */
(function (global) {
  'use strict';

  const Store = () => global.PulseFitStore;

  const METRICS = [
    { key: 'mood', icon: '😊', label: 'Humeur' },
    { key: 'energy', icon: '⚡', label: 'Énergie' },
    { key: 'difficulty', icon: '💪', label: 'Difficulté' },
    { key: 'motivation', icon: '🔥', label: 'Motivation' },
    { key: 'sleep', icon: '😴', label: 'Sommeil' },
    { key: 'hydration', icon: '💧', label: 'Hydratation' },
    { key: 'nutrition', icon: '🍽', label: 'Nutrition' },
    { key: 'workout', icon: '🏋️', label: 'Séance' },
    { key: 'stress', icon: '❤️', label: 'Stress' },
  ];

  function today() {
    return Store().todayISO();
  }

  function getWeightSeries(rangeDays) {
    const state = Store().load();
    const cut = Store().addDays(today(), -(rangeDays || 30));
    const fromNutri = (state.nutrition?.weightHistory || []).map((r) => ({ date: r.date, value: Number(r.weight) }));
    const fromJournal = (state.journal || [])
      .filter((j) => j.type === 'weight' && j.value != null && j.date >= cut)
      .map((j) => ({ date: j.date, value: Number(j.value) }));
    const map = {};
    [...fromJournal, ...fromNutri].forEach((r) => { map[r.date] = r.value; });
    if (!map[today()] && state.profile?.weight) map[today()] = Number(state.profile.weight);
    return Object.entries(map)
      .filter(([d]) => d >= cut)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, value]) => ({ date, value }));
  }

  function averageMetric(daily, key, days) {
    const cut = Store().addDays(today(), -(days || 7));
    const vals = Object.entries(daily || {})
      .filter(([d]) => d >= cut)
      .map(([, row]) => row[key])
      .filter((v) => v != null && !Number.isNaN(Number(v)));
    if (!vals.length) return null;
    return Math.round((vals.reduce((a, b) => a + Number(b), 0) / vals.length) * 10) / 10;
  }

  function dashboardAverages(wellness, days) {
    const d = days || 7;
    return {
      mood: averageMetric(wellness.daily, 'mood', d),
      energy: averageMetric(wellness.daily, 'energy', d),
      motivation: averageMetric(wellness.daily, 'motivation', d),
      sleep: averageMetric(wellness.daily, 'sleep', d),
      stress: averageMetric(wellness.daily, 'stress', d),
      hydration: averageMetric(wellness.daily, 'hydration', d),
    };
  }

  function weightDelta(state) {
    const p = state.profile || {};
    const series = getWeightSeries(365);
    const current = Number(p.weight) || series[series.length - 1]?.value;
    const start = Number(p.startWeight) || series[0]?.value || current;
    const target = Number(p.targetWeight) || current;
    return { current, start, target, delta: start - current, toTarget: current - target };
  }

  function completionRate(wellness, days) {
    const cut = Store().addDays(today(), -(days || 7));
    let filled = 0;
    let total = 0;
    for (let i = 0; i < (days || 7); i++) {
      const d = Store().addDays(today(), -i);
      if (d < cut) break;
      total += 1;
      if (wellness.daily[d]?.completedAt) filled += 1;
    }
    return total ? Math.round((filled / total) * 100) : 0;
  }

  global.PulseFitJournalEngine = {
    METRICS,
    getWeightSeries,
    averageMetric,
    dashboardAverages,
    weightDelta,
    completionRate,
  };
})(typeof window !== 'undefined' ? window : globalThis);
