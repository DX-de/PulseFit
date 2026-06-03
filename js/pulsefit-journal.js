/**
 * PulseFit — Journal IA (store, XP, timeline, sync)
 */
(function (global) {
  'use strict';

  const Store = () => global.PulseFitStore;
  const Engine = () => global.PulseFitJournalEngine;
  const AI = () => global.PulseFitJournalAI;

  const JOURNAL_BADGES = [
    { id: 'journal_first_week', name: 'Première semaine', icon: '🏆' },
    { id: 'journal_30_days', name: '30 jours actifs', icon: '🏆' },
    { id: 'journal_goal_hit', name: 'Objectif atteint', icon: '🏆' },
    { id: 'journal_transform', name: 'Transformation réussie', icon: '🏆' },
  ];

  function uid() {
    return `jn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function today() {
    return Store().todayISO();
  }

  function defaultWellnessBlock() {
    return {
      daily: {},
      notes: [],
      insights: [],
      alerts: [],
      recommendations: [],
      lastAnalysisAt: null,
      gamification: { xp: 0, badges: [], weekStreak: 0, lastWeekKey: null },
    };
  }

  function ensureWellness(state) {
    if (!state.wellness || typeof state.wellness !== 'object') state.wellness = defaultWellnessBlock();
    const w = state.wellness;
    if (!w.daily) w.daily = {};
    if (!w.notes) w.notes = [];
    if (!w.gamification) w.gamification = { xp: 0, badges: [], weekStreak: 0, lastWeekKey: null };
    return w;
  }

  function getTodayEntry(state) {
    const w = ensureWellness(state);
    const d = today();
    if (!w.daily[d]) {
      w.daily[d] = {
        mood: 7,
        energy: 7,
        difficulty: 5,
        motivation: 7,
        sleep: 7,
        hydration: 7,
        nutrition: 7,
        workout: 7,
        stress: 4,
        note: '',
      };
    }
    return w.daily[d];
  }

  function saveDaily(metrics) {
    const state = Store().load();
    const w = ensureWellness(state);
    const d = today();
    const prev = w.daily[d];
    const wasComplete = !!prev?.completedAt;

    w.daily[d] = {
      ...getTodayEntry(state),
      ...metrics,
      completedAt: new Date().toISOString(),
    };

    if (!wasComplete) {
      addJournalXp(state, 10, 'Journal rempli');
      updateWeekStreak(state);
      checkBadges(state);
      state.journal.unshift({
        id: uid(),
        date: d,
        type: 'daily',
        mood: w.daily[d].mood,
        energy: w.daily[d].energy,
        difficulty: w.daily[d].difficulty,
        text: w.daily[d].note || 'Journal quotidien',
      });
    }

    runAnalysis(state);
    Store().save(state);

    if (global.PulseFitJournalCloud?.isEnabled?.()) {
      global.PulseFitJournalCloud.pushDaily(d, w.daily[d]).catch(console.warn);
      global.PulseFitJournalCloud.pushMoodSleepHydration(d, w.daily[d]).catch(console.warn);
    }
    return w.daily[d];
  }

  function addNote(body, tags) {
    const state = Store().load();
    const w = ensureWellness(state);
    const row = {
      id: uid(),
      date: today(),
      body: body.trim(),
      tags: tags || [],
      createdAt: new Date().toISOString(),
    };
    w.notes.unshift(row);
    state.journal.unshift({
      id: row.id,
      date: row.date,
      type: 'note',
      text: row.body,
      exercise: (tags || []).join(', '),
    });
    Store().save(state);
    if (global.PulseFitJournalCloud?.isEnabled?.()) {
      global.PulseFitJournalCloud.insertNote(row).catch(console.warn);
    }
    return row;
  }

  function addWeight(weightKg, note) {
    const state = Store().load();
    const w = Number(weightKg);
    if (!w) return null;
    state.profile.weight = w;
    const n = state.nutrition || {};
    if (!n.weightHistory) n.weightHistory = [];
    const row = { date: today(), weight: w, note: note || '' };
    const idx = n.weightHistory.findIndex((r) => r.date === today());
    if (idx >= 0) n.weightHistory[idx] = row;
    else n.weightHistory.push(row);
    state.nutrition = n;

    Store().addJournalEntry({ type: 'weight', value: w, text: note || `Poids : ${w} kg` });

    if (global.PulseFitJournalCloud?.isEnabled?.()) {
      global.PulseFitJournalCloud.insertWeight(today(), w, note).catch(console.warn);
    } else if (global.PulseFitNutritionCloud?.insertWeight) {
      global.PulseFitNutritionCloud.insertWeight(today(), w, note).catch(console.warn);
    }
    checkBadges(Store().load());
    return row;
  }

  function addJournalXp(state, amount, reason) {
    const w = ensureWellness(state);
    w.gamification.xp = (w.gamification.xp || 0) + amount;
    state.gamification.xp = (state.gamification.xp || 0) + amount;
    if (global.PulseFitJournalCloud?.isEnabled?.()) {
      global.PulseFitJournalCloud.insertXp(amount, reason).catch(console.warn);
    }
  }

  function updateWeekStreak(state) {
    const w = ensureWellness(state);
    const weekKey = today().slice(0, 7);
    const daysInWeek = Object.keys(w.daily).filter((d) => d.startsWith(weekKey) && w.daily[d].completedAt);
    if (daysInWeek.length >= 7 && w.gamification.lastWeekKey !== weekKey) {
      w.gamification.lastWeekKey = weekKey;
      w.gamification.weekStreak = (w.gamification.weekStreak || 0) + 1;
      addJournalXp(state, 50, 'Semaine complète');
    }
  }

  function checkBadges(state) {
    const w = ensureWellness(state);
    const badges = w.gamification.badges || [];
    const award = (id) => {
      if (!badges.includes(id)) {
        badges.push(id);
        if (global.PulseFitJournalCloud?.isEnabled?.()) {
          global.PulseFitJournalCloud.insertBadge(id).catch(console.warn);
        }
      }
    };
    const filledDays = Object.values(w.daily).filter((d) => d.completedAt).length;
    if (filledDays >= 7) award('journal_first_week');
    if (filledDays >= 30) award('journal_30_days');
    const wd = Engine().weightDelta(state);
    if (Math.abs(wd.toTarget) < 1) {
      if (!badges.includes('journal_goal_hit')) addJournalXp(state, 100, 'Objectif atteint');
      award('journal_goal_hit');
    }
    if (Math.abs(wd.delta) >= 5) award('journal_transform');
    w.gamification.badges = badges;
    Store().save(state);
  }

  function runAnalysis(state) {
    const w = ensureWellness(state);
    const report = AI().analyze(state);
    w.insights = report.insights;
    w.alerts = report.alerts;
    w.recommendations = report.recommendations;
    w.lastAnalysisAt = report.generatedAt;

    if (global.PulseFitJournalCloud?.isEnabled?.()) {
      global.PulseFitJournalCloud.pushInsights(report).catch(console.warn);
    }

    applyCoachRecommendations(state, report);
    return report;
  }

  function applyCoachRecommendations(state, report) {
    if (!report.recommendations?.length) return;
    state.coach = state.coach || { adjustments: [], conversations: [] };
    const adj = {
      id: uid(),
      at: new Date().toISOString(),
      source: 'journal-ai',
      message: report.recommendations[0],
      type: report.alerts[0]?.type || 'wellness',
    };
    state.coach.adjustments = [adj, ...(state.coach.adjustments || [])].slice(0, 20);

    if (/repos|léger|surentraining/i.test(adj.message) && global.PulseFitProgramAI?.adapt) {
      const adaptation = global.PulseFitProgramAI.adapt(state);
      global.PulseFitProgramAI.applyAdaptation?.(state, { ...adaptation, intensityDelta: -0.08 });
    }
    if (/protéines|calori|nutrition/i.test(adj.message) && state.nutrition?.targets) {
      state.nutrition.targets.protein = Math.min(220, (state.nutrition.targets.protein || 150) + 10);
    }
  }

  function buildTimeline(state) {
    const events = [];
    (state.sessionLogs || []).forEach((l) => {
      events.push({
        date: l.date,
        at: l.completedAt || l.date,
        type: 'workout',
        icon: '🏋️',
        title: `Séance · ${l.title}`,
        meta: `${l.durationMin} min · ${l.calories || 0} kcal`,
      });
    });
    Object.entries(ensureWellness(state).daily).forEach(([date, row]) => {
      if (row.completedAt) {
        events.push({
          date,
          at: row.completedAt,
          type: 'journal',
          icon: '📝',
          title: 'Journal complété',
          meta: `Humeur ${row.mood}/10 · Énergie ${row.energy}/10`,
        });
      }
    });
    (state.nutrition?.weightHistory || []).forEach((r) => {
      events.push({
        date: r.date,
        at: r.date,
        type: 'weight',
        icon: '⚖️',
        title: `Poids · ${r.weight} kg`,
        meta: r.note || '',
      });
    });
    const badges = [
      ...(state.gamification?.badges || []),
      ...(state.wellness?.gamification?.badges || []),
      ...(state.training?.badges || []),
    ];
    badges.forEach((id, i) => {
      events.push({
        date: today(),
        at: new Date().toISOString(),
        type: 'badge',
        icon: '🏆',
        title: `Badge · ${id}`,
        meta: '',
      });
    });
    const photos = state.nutrition?.progressPhotos;
    if (photos) {
      ['before', 'after'].forEach((phase) => {
        ['face', 'profile', 'back'].forEach((angle) => {
          const ph = photos[phase]?.[angle];
          if (ph?.at) {
            events.push({
              date: ph.at.slice(0, 10),
              at: ph.at,
              type: 'photo',
              icon: '📷',
              title: `Photo ${phase} · ${angle}`,
              meta: '',
            });
          }
        });
      });
    }
    return events.sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 40);
  }

  async function uploadProgressPhoto(phase, angle, file) {
    if (global.PulseFitNutritionCloud?.uploadProgressPhoto) {
      const url = await global.PulseFitNutritionCloud.uploadProgressPhoto(phase, angle, file);
      global.PulseFitNutrition?.setProgressPhoto?.(phase, angle, url);
      return url;
    }
    if (global.PulseFitNutrition?.uploadProgressPhoto) {
      return global.PulseFitNutrition.uploadProgressPhoto(phase, angle, file);
    }
    return null;
  }

  function getWeightSeries(range) {
    return Engine().getWeightSeries(range);
  }

  function getAnalysis() {
    const state = Store().load();
    return runAnalysis(state);
  }

  global.PulseFitJournal = {
    JOURNAL_BADGES,
    defaultWellnessBlock,
    ensureWellness,
    getTodayEntry,
    saveDaily,
    addNote,
    addWeight,
    runAnalysis,
    buildTimeline,
    uploadProgressPhoto,
    getWeightSeries,
    getAnalysis,
    addJournalXp,
  };
})(typeof window !== 'undefined' ? window : globalThis);
