/**
 * PulseFit — Store SaaS (localStorage · démo startup)
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'pulsefit-app-state';
  const VERSION = 2;

  const LEVELS = [
    { id: 'beginner', name: 'Débutant', minXp: 0 },
    { id: 'intermediate', name: 'Intermédiaire', minXp: 500 },
    { id: 'advanced', name: 'Avancé', minXp: 1200 },
    { id: 'expert', name: 'Expert', minXp: 2500 },
  ];

  const BADGE_DEFS = [
    { id: 'first_workout', name: 'Première séance', icon: '🏅', desc: 'Validez votre première séance PulseFit.' },
    { id: 'streak_7', name: '7 jours consécutifs', icon: '🔥', desc: 'Maintenez une série de 7 jours.' },
    { id: 'streak_15', name: '15 jours consécutifs', icon: '🔥', desc: 'Série de 15 jours sans interruption.' },
    { id: 'streak_30', name: '30 jours consécutifs', icon: '🔥', desc: 'Un mois de régularité.' },
    { id: 'streak_100', name: '100 jours consécutifs', icon: '🔥', desc: 'Discipline exceptionnelle.' },
    { id: 'sessions_10', name: '10 séances terminées', icon: '🏋️', desc: 'Cumulez 10 séances complétées.' },
    { id: 'sessions_50', name: '50 séances terminées', icon: '💪', desc: '50 séances au compteur.' },
    { id: 'sessions_100', name: '100 séances terminées', icon: '🏆', desc: 'Cent séances — niveau confirmé.' },
    { id: 'first_kg', name: 'Premier kilo perdu', icon: '⚖️', desc: 'Au moins 1 kg de perdu depuis le départ.' },
    { id: 'weight_5', name: '−5 kg', icon: '⚖️', desc: '5 kg de progression vers votre objectif.' },
    { id: 'weight_10', name: '−10 kg', icon: '⚖️', desc: '10 kg transformés.' },
    { id: 'goal_reached', name: 'Objectif atteint', icon: '🎯', desc: 'Votre poids cible est atteint (±1 kg).' },
    { id: 'challenges_7', name: '7 défis quotidiens', icon: '✦', desc: 'Complétez 7 défis quotidiens (cumul).' },
  ];

  const PLAN_TIERS = {
    free: {
      id: 'free',
      name: 'Free',
      badge: 'Free',
      price: '0€',
      features: ['Dashboard basique', '1 programme', 'Coach IA (10 msg/j)', 'Stats essentielles', 'Défis quotidiens'],
      limits: { coachMessagesPerDay: 10, programs: 1, exportPdf: false, community: false, advancedStats: false },
    },
    pro: {
      id: 'pro',
      name: 'Premium',
      badge: 'Pro',
      price: '19€',
      featured: true,
      features: ['Coach IA illimité', 'Nutrition IA', 'Historique complet', 'Stats avancées', 'Export PDF'],
      limits: { coachMessagesPerDay: Infinity, programs: 5, exportPdf: true, community: false, advancedStats: true },
    },
    elite: {
      id: 'elite',
      name: 'Elite',
      badge: 'Elite',
      price: '39€',
      features: ['Toutes les fonctionnalités', 'Analyse avancée', 'Programmes illimités', 'Coaching intelligent complet', 'Communauté & défis'],
      limits: { coachMessagesPerDay: Infinity, programs: Infinity, exportPdf: true, community: true, advancedStats: true },
    },
  };

  const WORKOUT_POOL = {
    weight: [
      { title: 'HIIT Brûleur', type: 'hiit', durationMin: 32, calories: 420, exercises: ['Échauffement dynamique', 'Burpees', 'Mountain climbers', 'Jump squats', 'Planche', 'Retour au calme'] },
      { title: 'Cardio Zone 2', type: 'cardio', durationMin: 40, calories: 380, exercises: ['Marche rapide', 'Course légère', 'Corde à sauter', 'Étirements'] },
      { title: 'Full Body Circuit', type: 'strength', durationMin: 38, calories: 450, exercises: ['Squats', 'Pompes', 'Fentes', 'Rowing haltères', 'Gainage'] },
      { title: 'Core & Mobilité', type: 'mobility', durationMin: 25, calories: 180, exercises: ['Cat-cow', 'Dead bug', 'Side plank', 'Hip opener', 'Respiration'] },
    ],
    muscle: [
      { title: 'Push Force', type: 'strength', durationMin: 45, calories: 400, exercises: ['Développé couché', 'Développé incliné', 'Dips', 'Élévations latérales', 'Triceps poulie'] },
      { title: 'Pull Power', type: 'strength', durationMin: 45, calories: 410, exercises: ['Tractions', 'Rowing barre', 'Curl haltères', 'Face pull', 'Shrugs'] },
      { title: 'Legs Day', type: 'strength', durationMin: 50, calories: 480, exercises: ['Squat barre', 'Soulevé de terre roumain', 'Fentes marchées', 'Leg curl', 'Mollets'] },
      { title: 'Upper Hypertrophy', type: 'strength', durationMin: 42, calories: 390, exercises: ['Pompes lestées', 'Tirage vertical', 'Développé haltères', 'Curl marteau'] },
    ],
    fit: [
      { title: 'Reboot Total', type: 'mixed', durationMin: 35, calories: 350, exercises: ['Échauffement', 'Squats', 'Pompes', 'Gainage', 'Corde', 'Étirements'] },
      { title: 'Mobilité Active', type: 'mobility', durationMin: 28, calories: 160, exercises: ['Flow yoga', 'Hanches', 'Épaules', 'Colonne'] },
      { title: 'Cardio Progressif', type: 'cardio', durationMin: 35, calories: 320, exercises: ['Vélo', 'Montées', 'Sprints 30s', 'Retour calme'] },
      { title: 'Renfo Express', type: 'strength', durationMin: 30, calories: 280, exercises: ['Goblet squat', 'Rowing', 'Press épaules', 'Planche'] },
    ],
    performance: [
      { title: 'Explosivité', type: 'hiit', durationMin: 40, calories: 440, exercises: ['Sauts', 'Burpees', 'Sprint 20m', 'Med ball slam', 'Recovery'] },
      { title: 'Force Athlétique', type: 'strength', durationMin: 55, calories: 500, exercises: ['Clean pull', 'Squat jump', 'Bench press', 'Tirage olympique'] },
      { title: 'Endurance', type: 'cardio', durationMin: 50, calories: 460, exercises: ['Course continue', 'Fractionné 4x4', 'Rameur', 'Cool down'] },
      { title: 'Prévention blessure', type: 'mobility', durationMin: 30, calories: 150, exercises: ['Activation fessiers', 'Stabilité cheville', 'Mobilité thoracique'] },
    ],
  };

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function addDays(iso, n) {
    const d = new Date(iso + 'T12:00:00');
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }

  function uid() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function goalKey(goal) {
    const g = (goal || '').toLowerCase();
    if (g.includes('poids') || g.includes('weight')) return 'weight';
    if (g.includes('muscle') || g.includes('gain')) return 'muscle';
    if (g.includes('performance') || g.includes('sport')) return 'performance';
    return 'fit';
  }

  function sessionsPerWeek(sessions) {
    const n = parseInt(String(sessions), 10);
    return Number.isNaN(n) ? 3 : Math.min(6, Math.max(2, n));
  }

  function defaultProfile() {
    return {
      firstName: '',
      lastName: '',
      name: '',
      age: null,
      gender: '',
      height: null,
      weight: null,
      startWeight: null,
      targetWeight: null,
      goal: '',
      level: '',
      avatar: '',
    };
  }

  function defaultState() {
    const nutritionBlock = global.PulseFitNutrition?.defaultNutritionBlock?.()
      || { targets: { kcal: 2180, protein: 170, carbs: 260, fat: 75 }, days: {}, entries: {}, water: {}, gamification: { xp: 0, streak: 0, badges: [] } };
    return {
      version: VERSION,
      profile: defaultProfile(),
      subscription: 'free',
      program: null,
      schedule: [],
      sessionLogs: [],
      journal: [],
      nutrition: nutritionBlock,
      goals: { weeklySessions: 4, steps: 10000, progressPct: 0 },
      coach: { adjustments: [], conversations: [], usage: { date: null, count: 0 } },
      streak: { current: 0, longest: 0, lastActiveDate: null },
      gamification: { xp: 0, badges: [], challengesCompletedTotal: 0 },
      dailyChallenges: { date: null, completed: [], manual: {} },
      community: { weeklyChallenge: 'Défi HIIT — 4 séances', joined: true },
      onboardingDone: false,
      createdAt: todayISO(),
      training: { xp: 0, xpHistory: [], badges: [], programId: null },
      wellness: {
        daily: {},
        notes: [],
        insights: [],
        alerts: [],
        recommendations: [],
        lastAnalysisAt: null,
        gamification: { xp: 0, badges: [], weekStreak: 0, lastWeekKey: null },
      },
    };
  }

  function normalizeState(state) {
    if (state?.demoSeeded) {
      state = defaultState();
    }
    const base = defaultState();
    const p = { ...base.profile, ...(state.profile || {}) };
    if (!p.firstName && p.name) {
      const parts = String(p.name).trim().split(/\s+/);
      p.firstName = parts[0] || '';
      p.lastName = parts.slice(1).join(' ') || '';
    }
    if (!p.name && (p.firstName || p.lastName)) {
      p.name = `${p.firstName || ''} ${p.lastName || ''}`.trim();
    }
    if (p.avatar && String(p.avatar).includes('pravatar.cc')) p.avatar = '';

    const nutrition = state.nutrition || {};
    const gamification = state.gamification || {};
    const streak = state.streak || {};

    return {
      ...base,
      ...state,
      profile: p,
      nutrition: (() => {
        const def = global.PulseFitNutrition?.defaultNutritionBlock?.() || base.nutrition;
        return {
          ...def,
          ...nutrition,
          targets: { ...def.targets, ...(nutrition.targets || {}) },
          days: { ...def.days, ...(nutrition.days || {}) },
          entries: { ...def.entries, ...(nutrition.entries || {}) },
          water: { ...def.water, ...(nutrition.water || {}) },
          aiPlans: { ...def.aiPlans, ...(nutrition.aiPlans || {}) },
          shoppingLists: nutrition.shoppingLists || def.shoppingLists,
          weightHistory: nutrition.weightHistory || def.weightHistory,
          progressPhotos: {
            before: { ...def.progressPhotos?.before, ...(nutrition.progressPhotos?.before || {}) },
            after: { ...def.progressPhotos?.after, ...(nutrition.progressPhotos?.after || {}) },
          },
          gamification: { ...def.gamification, ...(nutrition.gamification || {}) },
          profile: nutrition.profile || def.profile,
        };
      })(),
      streak: {
        current: Number(streak.current) || 0,
        longest: Number(streak.longest) || 0,
        lastActiveDate: streak.lastActiveDate || null,
      },
      coach: {
        adjustments: Array.isArray(state.coach?.adjustments) ? state.coach.adjustments : [],
        conversations: Array.isArray(state.coach?.conversations) ? state.coach.conversations : [],
        usage: state.coach?.usage || { date: null, count: 0 },
        memory: state.coach?.memory && !Array.isArray(state.coach.memory) ? state.coach.memory : {},
      },
      dailyChallenges: state.dailyChallenges?.date
        ? state.dailyChallenges
        : { date: null, completed: [], manual: {} },
      gamification: {
        xp: Number(gamification.xp) || 0,
        badges: Array.isArray(gamification.badges) ? gamification.badges : [],
        challengesCompletedTotal: Number(gamification.challengesCompletedTotal) || 0,
      },
      goals: { ...base.goals, ...(state.goals || {}) },
      schedule: Array.isArray(state.schedule) ? state.schedule : [],
      sessionLogs: Array.isArray(state.sessionLogs) ? state.sessionLogs : [],
      journal: Array.isArray(state.journal) ? state.journal : [],
      training: {
        xp: Number(state.training?.xp) || 0,
        xpHistory: Array.isArray(state.training?.xpHistory) ? state.training.xpHistory : [],
        badges: Array.isArray(state.training?.badges) ? state.training.badges : [],
        programId: state.training?.programId || null,
      },
      wellness: (() => {
        const def = global.PulseFitJournal?.defaultWellnessBlock?.() || { daily: {}, notes: [], gamification: { xp: 0, badges: [] } };
        const w = state.wellness || {};
        return {
          ...def,
          ...w,
          daily: { ...def.daily, ...(w.daily || {}) },
          notes: Array.isArray(w.notes) ? w.notes : def.notes,
          gamification: { ...def.gamification, ...(w.gamification || {}) },
        };
      })(),
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      return normalizeState(JSON.parse(raw));
    } catch {
      return defaultState();
    }
  }

  let cloudSaveTimer = null;

  function scheduleCloudSave() {
    if (!global.PulseFitCloud?.isEnabled?.()) return;
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer = setTimeout(() => {
      global.PulseFitCloud.pushFullState(load()).catch((e) => console.warn('Cloud save:', e));
    }, 700);
  }

  function save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    try {
      sessionStorage.setItem('pulsefit-program', JSON.stringify(state.program || {}));
    } catch (_) { /* ignore */ }
    scheduleCloudSave();
  }

  async function init() {
    global.PulseFitAuth?.clearLegacyDemo?.();
    if (global.PulseFitCloud?.isEnabled?.()) {
      const backup = load();
      try {
        await global.PulseFitCloud.pullAll();
        if (global.PulseFitNutritionCloud?.pull) {
          await global.PulseFitNutritionCloud.pull(load());
        }
        if (global.PulseFitProgramCloud?.pull) {
          await global.PulseFitProgramCloud.pull(load());
        }
        if (global.PulseFitJournalCloud?.pull) {
          await global.PulseFitJournalCloud.pull(load());
        }
        if (global.PulseFitAICoachCloud?.pull) {
          await global.PulseFitAICoachCloud.pull(load());
        }
      } catch (e) {
        console.warn('Cloud pull:', e);
        save(backup);
      }
    } else {
      global.PulseFitNutrition?.recalculateProfile?.();
    }
    migrateFromSession();
    const state = load();
    if (global.PulseFitCloud?.isEnabled?.() && state.program) scheduleCloudSave();
    return state;
  }

  function getLevel(xp) {
    const x = Number(xp) || 0;
    let level = LEVELS[0];
    LEVELS.forEach((l) => { if (x >= l.minXp) level = l; });
    const next = LEVELS[LEVELS.indexOf(level) + 1];
    return { ...level, xp: x, nextMin: next?.minXp, progress: next ? ((x - level.minXp) / (next.minXp - level.minXp)) * 100 : 100 };
  }

  function awardBadge(state, id) {
    if (!Array.isArray(state.gamification.badges)) state.gamification.badges = [];
    if (!state.gamification.badges.includes(id)) state.gamification.badges.push(id);
  }

  function getGoalProgressPct(state) {
    const p = state.profile || {};
    const start = Number(p.startWeight) || Number(p.weight);
    const current = Number(p.weight);
    const target = Number(p.targetWeight);
    if (!Number.isFinite(start) || !Number.isFinite(current) || !Number.isFinite(target)) {
      return getStatsFromState(state).progressPct || 0;
    }
    const total = Math.abs(start - target);
    if (total < 0.3) return 0;
    if (start > target) {
      const lost = start - current;
      return Math.min(100, Math.max(0, Math.round((lost / total) * 100)));
    }
    const gained = current - start;
    return Math.min(100, Math.max(0, Math.round((gained / total) * 100)));
  }

  function getSessionsWeekSeries(state) {
    state = state || load();
    const week = getWeeklyActivity();
    return week.map((d, i) => {
      const logs = state.sessionLogs.filter((l) => l.date === d.date).length;
      const doneSched = state.schedule.filter((s) => s.date === d.date && s.status === 'done').length;
      const value = logs || doneSched || 0;
      return { value, label: d.date, short: d.label || ['L', 'M', 'M', 'J', 'V', 'S', 'D'][i] };
    });
  }

  function getPlanInfo(state) {
    const plan = (state || load()).subscription || 'free';
    return { plan, ...(PLAN_TIERS[plan] || PLAN_TIERS.free) };
  }

  function resetCoachUsageIfNeeded(state) {
    const today = todayISO();
    state.coach = state.coach || {};
    state.coach.usage = state.coach.usage || { date: null, count: 0 };
    if (state.coach.usage.date !== today) {
      state.coach.usage = { date: today, count: 0 };
    }
    return state.coach.usage;
  }

  function getCoachQuota(state) {
    state = state || load();
    const plan = state.subscription || 'free';
    const limit = PLAN_TIERS[plan]?.limits?.coachMessagesPerDay ?? 10;
    if (limit === Infinity || plan === 'pro' || plan === 'elite') {
      return { unlimited: true, used: 0, limit: null, remaining: null };
    }
    const usage = resetCoachUsageIfNeeded(state);
    return {
      unlimited: false,
      used: usage.count,
      limit,
      remaining: Math.max(0, limit - usage.count),
    };
  }

  function canSendCoachMessage(state) {
    const q = getCoachQuota(state || load());
    return q.unlimited || q.remaining > 0;
  }

  function incrementCoachUsage(state) {
    state = state || load();
    const plan = state.subscription || 'free';
    if (plan === 'pro' || plan === 'elite') return state;
    const usage = resetCoachUsageIfNeeded(state);
    usage.count += 1;
    save(state);
    return state;
  }

  function getProfileStats(state) {
    state = state || load();
    const st = getStatsFromState(state);
    const goalPct = getGoalProgressPct(state);
    const totalSessions = state.sessionLogs.length;
    const photos = state.nutrition?.progressPhotos || { before: {}, after: {} };
    const photoCount = Object.keys(photos.before || {}).length + Object.keys(photos.after || {}).length;
    return {
      ...st,
      goalProgressPct: goalPct,
      totalSessions,
      badgesUnlocked: (state.gamification?.badges || []).length,
      badgesTotal: BADGE_DEFS.length,
      photoCount,
      plan: getPlanInfo(state),
      memberSince: state.createdAt || todayISO(),
    };
  }

  function getActivityHistory(state, limit) {
    state = state || load();
    const max = limit || 20;
    const items = [];
    state.sessionLogs.forEach((l) => {
      items.push({
        type: 'workout',
        date: l.date,
        title: l.title,
        detail: `${l.durationMin || '—'} min · ${l.calories || 0} kcal`,
        at: l.completedAt || l.date,
      });
    });
    (state.journal || []).forEach((j) => {
      items.push({
        type: j.type || 'note',
        date: j.date,
        title: j.type === 'weight' ? `Poids ${j.value} kg` : (j.exercise || 'Journal'),
        detail: j.text || '',
        at: j.date,
      });
    });
    items.sort((a, b) => String(b.at).localeCompare(String(a.at)));
    return items.slice(0, max);
  }

  function checkBadges(state) {
    const s = state.streak.current;
    const sessions = state.sessionLogs.length;
    if (sessions >= 1) awardBadge(state, 'first_workout');
    if (sessions >= 10) awardBadge(state, 'sessions_10');
    if (sessions >= 50) awardBadge(state, 'sessions_50');
    if (sessions >= 100) awardBadge(state, 'sessions_100');
    if (s >= 7) awardBadge(state, 'streak_7');
    if (s >= 15) awardBadge(state, 'streak_15');
    if (s >= 30) awardBadge(state, 'streak_30');
    if (s >= 100) awardBadge(state, 'streak_100');
    const start = Number(state.profile.startWeight) || Number(state.profile.weight);
    const current = Number(state.profile.weight);
    const target = Number(state.profile.targetWeight);
    const lost = start - current;
    if (lost >= 1) awardBadge(state, 'first_kg');
    if (lost >= 5) awardBadge(state, 'weight_5');
    if (lost >= 10) awardBadge(state, 'weight_10');
    if (Number.isFinite(target) && Math.abs(current - target) <= 1) awardBadge(state, 'goal_reached');
    const chTotal = Number(state.gamification.challengesCompletedTotal) || 0;
    if (chTotal >= 7) awardBadge(state, 'challenges_7');
  }

  function updateStreak(state) {
    const today = todayISO();
    const last = state.streak.lastActiveDate;
    if (last === today) return;
    if (last === addDays(today, -1)) {
      state.streak.current += 1;
    } else if (last !== today) {
      state.streak.current = last ? 1 : 1;
    }
    state.streak.lastActiveDate = today;
    if (state.streak.current > state.streak.longest) state.streak.longest = state.streak.current;
    checkBadges(state);
  }

  function addXp(state, amount) {
    state.gamification.xp += amount;
    checkBadges(state);
  }

  function getProgramName(data) {
    const names = {
      weight: 'Metabolic Burn 8 semaines',
      muscle: 'Hypertrophy Builder 10 semaines',
      performance: 'Athletic Performance Stack',
      fit: 'Reboot Fitness Progressif',
    };
    return names[goalKey(data.goal)];
  }

  function buildSchedule(program) {
    const key = goalKey(program.goal);
    const pool = WORKOUT_POOL[key] || WORKOUT_POOL.fit;
    const perWeek = sessionsPerWeek(program.sessions);
    const schedule = [];
    const start = todayISO();
    const dayOffsets = perWeek === 2 ? [1, 4] : perWeek === 3 ? [1, 3, 5] : perWeek === 4 ? [1, 2, 4, 6] : perWeek === 5 ? [1, 2, 3, 5, 6] : [1, 2, 3, 4, 5, 6];
    let templateIndex = 0;
    for (let week = 0; week < 4; week++) {
      dayOffsets.forEach((_, i) => {
        const template = pool[templateIndex % pool.length];
        templateIndex += 1;
        schedule.push({
          id: uid(),
          date: addDays(start, week * 7 + Math.floor((i * 7) / perWeek)),
          title: template.title,
          type: template.type,
          durationMin: template.durationMin,
          calories: template.calories,
          exercises: template.exercises.map((name) => ({ name, done: false })),
          status: 'planned',
        });
      });
    }
    schedule.sort((a, b) => a.date.localeCompare(b.date));
    return schedule;
  }

  function setProgram(data) {
    const state = load();
    const program = { ...data, program: data.program || getProgramName(data), createdAt: todayISO() };
    state.program = program;
    state.schedule = buildSchedule(program);
    state.profile.goal = data.goal || state.profile.goal;
    state.profile.level = data.level || state.profile.level;
    state.goals.weeklySessions = sessionsPerWeek(program.sessions);
    const gk = goalKey(program.goal);
    state.nutrition.targets = gk === 'muscle'
      ? { kcal: 2800, protein: 190, carbs: 320, fat: 80 }
      : gk === 'weight'
        ? { kcal: 1900, protein: 150, carbs: 180, fat: 60 }
        : { kcal: 2180, protein: 170, carbs: 260, fat: 75 };
    save(state);
    return state;
  }

  function normalizeProfileFields(data) {
    const out = { ...data };
    if (out.avatar === '') delete out.avatar;
    ['age', 'height', 'weight', 'targetWeight', 'startWeight'].forEach((key) => {
      if (out[key] === '' || out[key] == null) return;
      const n = Number(out[key]);
      if (!Number.isNaN(n)) out[key] = n;
    });
    return out;
  }

  function updateProfile(data) {
    const state = load();
    Object.assign(state.profile, normalizeProfileFields(data));
    if (data.firstName || data.lastName) {
      state.profile.name = `${state.profile.firstName || ''} ${state.profile.lastName || ''}`.trim();
    }
    if (!state.profile.startWeight && state.profile.weight) {
      state.profile.startWeight = state.profile.weight;
    }
    save(state);
    return state.profile;
  }

  async function updateProfileAsync(data) {
    const profile = updateProfile(data);
    if (global.PulseFitCloud?.isEnabled?.()) {
      const state = load();
      state.profileUpdatedAt = Date.now();
      await global.PulseFitCloud.pushProfile(state);
      save(state);
    }
    return profile;
  }

  function completeOnboarding(data) {
    const state = load();
    updateProfile(data);
    state.onboardingDone = true;
    if (!state.program && data.goal) setProgram({ goal: data.goal, level: data.level || 'Intermédiaire', sessions: '3', duration: '45 minutes' });
    save(state);
    return state;
  }

  function needsOnboarding() { return !load().onboardingDone; }

  function ensureSchedule() {
    const state = load();
    if (state.program && (!state.schedule || !state.schedule.length)) {
      state.schedule = buildSchedule(state.program);
      save(state);
    }
    return state;
  }

  function getTodaySession() {
    const state = ensureSchedule();
    const today = todayISO();
    return state.schedule.find((s) => s.date === today && s.status !== 'done')
      || state.schedule.find((s) => s.date === today)
      || state.schedule.find((s) => s.status === 'planned');
  }

  function getSessionById(id) { return load().schedule.find((s) => s.id === id); }

  function completeSession(scheduleId, payload) {
    const state = load();
    const item = state.schedule.find((s) => s.id === scheduleId);
    if (!item) return null;
    item.status = 'done';
    if (Array.isArray(item.exercises)) {
      item.exercises.forEach((ex, i) => {
        if (ex && typeof ex === 'object') {
          ex.done = true;
          if (payload.exercises?.[i]) Object.assign(ex, payload.exercises[i]);
        }
      });
    }
    const log = {
      id: uid(), scheduleId, date: item.date, title: item.title, type: item.type,
      durationMin: payload.durationMin || item.durationMin, calories: payload.calories || item.calories,
      exercises: item.exercises, note: payload.note || '', feeling: payload.feeling || 7,
      completedAt: new Date().toISOString(),
    };
    state.sessionLogs.unshift(log);
    if (payload.weight) {
      state.profile.weight = payload.weight;
      state.journal.unshift({ id: uid(), date: todayISO(), type: 'weight', value: payload.weight, text: `Poids : ${payload.weight} kg` });
    }
    updateStreak(state);
    addXp(state, 85);
    state.goals.progressPct = Math.min(100, getStatsFromState(state).progressPct);
    global.PulseFitChallenges?.checkAutoComplete?.(state);
    save(state);
    if (global.PulseFitCloud?.isEnabled?.()) {
      global.PulseFitCloud.upsertSession({
        id: scheduleId,
        title: item.title,
        type: item.type,
        date: item.date,
        durationMin: log.durationMin,
        calories: log.calories,
        status: 'done',
        feeling: log.feeling,
        note: log.note,
        completedAt: log.completedAt,
        exercises: item.exercises,
      }, state.program?._dbId).catch(() => {});
      global.PulseFitCloud.pushProfile(state).catch(() => {});
    }
    return log;
  }

  function markSessionDone(scheduleId) {
    const sess = getSessionById(scheduleId);
    if (!sess) return null;
    return completeSession(scheduleId, {
      durationMin: sess.durationMin,
      calories: sess.calories,
      feeling: 7,
    });
  }

  function addJournalEntry(entry) {
    const state = load();
    const row = {
      id: uid(),
      date: entry.date || todayISO(),
      type: entry.type || 'note',
      value: entry.value ?? null,
      text: entry.text || entry.comment || '',
      exercise: entry.exercise || '',
      mood: entry.mood ?? null,
      energy: entry.energy ?? null,
      difficulty: entry.difficulty ?? null,
    };
    state.journal.unshift(row);
    if (entry.type === 'weight' && entry.value) state.profile.weight = Number(entry.value);
    save(state);
    if (global.PulseFitCloud?.isEnabled?.()) {
      global.PulseFitCloud.insertProgress(row).then((data) => {
        if (data?.id) row.id = data.id;
      }).catch(() => {});
    }
    return row;
  }

  function logMeal(date, mealKey, logged) {
    const state = load();
    if (!state.nutrition.days[date]) state.nutrition.days[date] = { meals: { breakfast: false, lunch: false, dinner: false, snack: false } };
    state.nutrition.days[date].meals[mealKey] = logged;
    if (logged) addXp(state, 15);
    save(state);
    if (global.PulseFitCloud?.isEnabled?.()) {
      global.PulseFitCloud.upsertNutrition(date, mealKey, logged).catch(() => {});
    }
    return state.nutrition.days[date];
  }

  async function sendCoachMessage(text) {
    if (global.PulseFitAICoach?.sendMessage) {
      return global.PulseFitAICoach.sendMessage(text);
    }
    const state = load();
    const res = global.PulseFitAI?.reply(text, state) || { text: 'Coach en chargement…' };
    let conv = state.coach.conversations[0];
    if (!conv) {
      conv = { id: uid(), createdAt: todayISO(), messages: [] };
      state.coach.conversations.unshift(conv);
    }
    conv.messages.push({ role: 'user', text, at: new Date().toISOString() });
    conv.messages.push({ role: 'bot', text: res.text, at: new Date().toISOString() });
    save(state);
    return conv.messages;
  }

  function applyCoachAdjustment() {
    const state = load();
    const missed = state.schedule.filter((s) => s.date < todayISO() && s.status === 'planned').length;
    const msg = missed >= 2 ? 'Intensité -15 % — récupération prioritaire.' : 'Volume +8 % — progression validée.';
    state.coach.adjustments.unshift({ id: uid(), date: todayISO(), message: msg, applied: true });
    save(state);
    return { message: msg };
  }

  function getStatsFromState(state) {
    const today = todayISO();
    const weekStart = addDays(today, -6);
    const weekDone = state.schedule.filter((s) => s.date >= weekStart && s.date <= today && s.status === 'done').length;
    const weekTotal = state.schedule.filter((s) => s.date >= weekStart && s.date <= today).length || state.goals.weeklySessions;
    const weekLogs = state.sessionLogs.filter((l) => l.date >= weekStart);
    const calories = weekLogs.reduce((a, l) => a + (l.calories || 0), 0);
    const trainMin = weekLogs.reduce((a, l) => a + (l.durationMin || 0), 0);
    const weight = Number(state.profile.weight);
    const todayLogs = state.sessionLogs.filter((l) => l.date === today);
    const caloriesToday = todayLogs.reduce((a, l) => a + (l.calories || 0), 0);
    return {
      caloriesWeek: calories,
      caloriesToday,
      progressPct: weekTotal ? Math.round((weekDone / weekTotal) * 100) : state.goals.progressPct || 0,
      weight: Number.isFinite(weight) ? weight : 74,
      sessionsDone: weekDone,
      sessionsPlanned: weekTotal,
      trainMin,
      program: state.program,
      streak: state.streak.current,
      xp: state.gamification.xp,
      level: getLevel(state.gamification.xp),
    };
  }

  function getStats() { return getStatsFromState(ensureSchedule()); }

  function getWeightHistory() {
    const state = load();
    let weights = state.journal.filter((j) => j.type === 'weight' && j.value != null).map((j) => ({ date: j.date, value: j.value }));
    return weights.slice(-14);
  }

  function getWeeklyActivity() {
    const state = load();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = addDays(todayISO(), -i);
      const mins = state.sessionLogs.filter((l) => l.date === d).reduce((a, l) => a + (l.durationMin || 0), 0);
      days.push({ date: d, minutes: mins, label: ['L', 'M', 'M', 'J', 'V', 'S', 'D'][6 - i] });
    }
    return days;
  }

  function getProgramByWeekday() {
    const state = ensureSchedule();
    const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    const map = {};
    state.schedule.slice(0, 12).forEach((s) => {
      const dow = new Date(s.date + 'T12:00:00').getDay();
      const name = days[dow === 0 ? 6 : dow - 1];
      if (!map[name]) map[name] = s;
    });
    return days.filter((d) => map[d]).map((d) => ({ day: d, session: map[d] }));
  }

  function getCalendarMonth(year, month) {
    const state = ensureSchedule();
    const pad = (n) => String(n).padStart(2, '0');
    const lastDay = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let d = 1; d <= lastDay; d++) {
      const date = `${year}-${pad(month + 1)}-${pad(d)}`;
      days.push({ date, sessions: state.schedule.filter((s) => s.date === date) });
    }
    return days;
  }

  function getLeaderboard() {
    const state = load();
    const UD = global.PulseFitUserDisplay;
    const name = UD?.displayFullName?.(state.profile) || state.profile.name || 'Vous';
    const me = {
      name,
      xp: state.gamification.xp || 0,
      streak: state.streak.current || 0,
      avatar: UD?.avatarUrl?.(state.profile) || state.profile.avatar || '',
      isMe: true,
      rank: 1,
    };
    return [me];
  }

  function isPremiumFeature(feature) {
    const plan = load().subscription || 'free';
    const proOnly = ['ai_coach_unlimited', 'export_pdf', 'advanced_stats', 'nutrition_ai', 'full_history'];
    const eliteOnly = ['community_boost', 'admin', 'unlimited_programs', 'advanced_analysis'];
    if (plan === 'elite') return true;
    if (plan === 'pro') return !eliteOnly.includes(feature);
    return !proOnly.includes(feature) && !eliteOnly.includes(feature);
  }

  function getRecommendedActions(state) {
    state = state || ensureSchedule();
    const today = todayISO();
    const rel = (p) => `../${p}/`;
    const actions = [];
    const sess = state.schedule.find((s) => s.date === today && s.status !== 'done');
    if (sess) {
      actions.push({
        icon: '🏋️',
        title: `Faire séance : ${sess.title}`,
        detail: `${sess.durationMin} min · ~${sess.calories} kcal`,
        href: `${rel('program')}?tab=workout`,
        cta: 'Démarrer',
        done: false,
        priority: 10,
      });
    }
    const water = state.nutrition?.water?.[today] || 0;
    const waterTarget = 2500;
    if (water < waterTarget) {
      const need = Math.max(250, waterTarget - water);
      actions.push({
        icon: '💧',
        title: `Boire ${need >= 500 ? '500 ml' : need + ' ml'} d'eau`,
        detail: `${water} / ${waterTarget} ml aujourd'hui`,
        href: `${rel('nutrition')}`,
        cta: 'Journal',
        done: false,
        priority: 8,
      });
    }
    const meals = state.nutrition?.days?.[today]?.meals || {};
    const mealDefs = [
      { key: 'breakfast', icon: '🌅', title: 'Valider le petit-déjeuner' },
      { key: 'lunch', icon: '☀️', title: 'Valider le déjeuner' },
      { key: 'dinner', icon: '🌙', title: 'Valider le dîner' },
      { key: 'snack', icon: '🍎', title: 'Valider la collation' },
    ];
    mealDefs.forEach((m) => {
      if (!meals[m.key]) {
        actions.push({
          icon: m.icon,
          title: m.title,
          detail: 'Enregistrez vos macros du repas',
          href: `${rel('nutrition')}`,
          cta: 'Valider',
          done: false,
          priority: 6,
        });
      }
    });
    const steps = state.goals?.stepsToday || state.journal.find((j) => j.date === today && j.type === 'steps')?.value || 0;
    const stepsGoal = state.goals?.steps || 10000;
    if (steps < 3000) {
      actions.push({
        icon: '🚶',
        title: 'Marcher 3000 pas',
        detail: `${steps} / ${stepsGoal} pas aujourd'hui`,
        href: `${rel('journal')}`,
        cta: 'Journal',
        done: false,
        priority: 5,
      });
    }
    if (!actions.length) {
      actions.push({
        icon: '✦',
        title: 'Demander une analyse au Coach IA',
        detail: 'Progression, nutrition ou motivation personnalisée',
        href: `${rel('ai-coach')}`,
        cta: 'Ouvrir',
        done: false,
        priority: 1,
      });
    }
    return actions.sort((a, b) => (b.priority || 0) - (a.priority || 0)).slice(0, 4);
  }

  function getDashboardData() {
    const state = ensureSchedule();
    const st = getStatsFromState(state);
    const p = state.profile;
    const weight = Number(p.weight);
    const start = Number(p.startWeight) || weight;
    const target = Number(p.targetWeight);
    const kgLost = Number.isFinite(start) && Number.isFinite(weight) && start > weight ? start - weight : 0;
    const weights = getWeightHistory();
    const week = getWeeklyActivity();
    const dayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    const weightSeries = weights.map((w) => ({
      value: w.value,
      label: new Date(w.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    }));
    const weeklyMinutes = week.map((d, i) => ({
      value: d.minutes,
      label: d.date,
      short: dayLabels[i] || d.label,
    }));
    const weeklyCalories = week.map((d, i) => {
      const cals = state.sessionLogs.filter((l) => l.date === d.date).reduce((a, l) => a + (l.calories || 0), 0);
      return { value: cals, label: d.date, short: dayLabels[i] || d.label };
    });
    let xpRunning = Math.max(0, state.gamification.xp - week.reduce((a, d) => {
      const logs = state.sessionLogs.filter((l) => l.date === d.date).length;
      return a + logs * 85;
    }, 0));
    const xpSeries = week.map((d, i) => {
      const dayXp = state.sessionLogs.filter((l) => l.date === d.date).length * 85;
      xpRunning += dayXp;
      return { value: Math.min(state.gamification.xp, xpRunning), label: d.date, short: dayLabels[i] };
    });
    const plan = state.subscription || 'free';
    const planLabels = { free: 'Free', pro: 'Premium', elite: 'Elite' };
    const firstName = global.PulseFitUserDisplay?.displayFirstName?.(p) || p.firstName || '';
    let motivationLine = 'Votre coach IA suit chaque séance et chaque repas.';
    if (st.sessionsDone < st.sessionsPlanned) {
      motivationLine = `${st.sessionsPlanned - st.sessionsDone} séance(s) restante(s) cette semaine — on garde le rythme !`;
    } else if (state.streak.current >= 7) {
      motivationLine = `Streak de ${state.streak.current} jours — vous êtes inarrêtable.`;
    } else if (kgLost >= 1) {
      motivationLine = `Déjà ${kgLost.toFixed(1)} kg de perdus — continuez sur cette lancée.`;
    }
    checkBadges(state);
    global.PulseFitChallenges?.checkAutoComplete?.(state);
    const badges = state.gamification?.badges || [];
    const goalProgressPct = getGoalProgressPct(state);
    return {
      profile: p,
      plan,
      planLabel: planLabels[plan] || 'Free',
      planInfo: getPlanInfo(state),
      level: st.level,
      xp: st.xp,
      streak: state.streak.current,
      streakLongest: state.streak.longest,
      weightLabel: Number.isFinite(weight) ? weight.toFixed(1) : '—',
      targetLabel: Number.isFinite(target) ? target : '—',
      startWeight: Number.isFinite(start) ? start.toFixed(1) : '—',
      kgLost,
      goalProgressPct,
      caloriesWeek: st.caloriesWeek,
      sessionsDone: st.sessionsDone,
      sessionsPlanned: st.sessionsPlanned,
      trainMin: st.trainMin,
      weightSeries,
      weeklyMinutes,
      weeklyCalories,
      sessionsWeekSeries: getSessionsWeekSeries(state),
      xpSeries,
      recommendedActions: getRecommendedActions(state),
      badges,
      badgesUnlocked: badges.length,
      badgesTotal: BADGE_DEFS.length,
      motivationLine,
    };
  }

  function setSubscription(plan) {
    const state = load();
    state.subscription = plan;
    save(state);
    return plan;
  }

  function getAdminStats() {
    const state = load();
    return {
      users: 0,
      activeToday: 0,
      subscriptions: { free: 0, pro: 0, elite: 0 },
      sessionsToday: state.sessionLogs?.length || 0,
      revenueMrr: 0,
      programs: state.schedule?.length || 0,
    };
  }

  function getExportData() { return { state: ensureSchedule(), stats: getStats() }; }

  function resetDemo() {
    localStorage.removeItem(STORAGE_KEY);
    global.PulseFitAuth?.clearLegacyDemo?.();
    global.PulseFitAuth?.logout?.();
    return defaultState();
  }

  function migrateFromSession() {
    try {
      const raw = sessionStorage.getItem('pulsefit-program');
      if (!raw) return load();
      const data = JSON.parse(raw);
      const state = load();
      if (!state.program && data.goal) return setProgram(data);
    } catch (_) { /* ignore */ }
    return ensureSchedule();
  }

  const PulseFitStore = {
    load, save, init, setProgram, ensureSchedule, getTodaySession, getSessionById, completeSession, markSessionDone,
    addJournalEntry, logMeal, sendCoachMessage, applyCoachAdjustment, getStats, getStatsFromState,
    getWeightHistory, getWeeklyActivity, getProgramByWeekday, getCalendarMonth, getProgramName,
    resetDemo, migrateFromSession, updateProfile, updateProfileAsync, normalizeProfileFields, completeOnboarding, needsOnboarding,
    getExportData, getLevel, getLeaderboard, isPremiumFeature, setSubscription, getPlanInfo,
    getAdminStats, updateStreak, addXp, awardBadge, checkBadges, BADGE_DEFS, LEVELS, PLAN_TIERS, todayISO, addDays,
    getDashboardData, getRecommendedActions, getGoalProgressPct, getSessionsWeekSeries,
    getProfileStats, getActivityHistory, getCoachQuota, canSendCoachMessage, incrementCoachUsage,
  };

  global.PulseFitStore = PulseFitStore;
  migrateFromSession();
})(typeof window !== 'undefined' ? window : globalThis);
