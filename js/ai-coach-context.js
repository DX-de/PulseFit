/**
 * PulseFit — Contexte utilisateur pour le Coach IA
 */
(function (global) {
  'use strict';

  const Store = () => global.PulseFitStore;

  function todayEntry(state) {
    const w = state.wellness?.daily?.[Store().todayISO()];
    return w || null;
  }

  function build(state) {
    const stats = Store().getStatsFromState?.(state) || Store().getStats?.() || {};
    const p = state.profile || {};
    const n = state.nutrition || {};
    const targets = n.targets || {};
    const today = Store().todayISO();
    const todaySession = state.schedule?.find((s) => s.date === today)
      || state.schedule?.find((s) => s.status !== 'done');
    const recentSessions = (state.sessionLogs || []).slice(0, 10);
    const journalReport = global.PulseFitJournalAI?.analyze?.(state);
    const weightSeries = global.PulseFitJournalEngine?.getWeightSeries?.(30) || [];
    const monthAgo = Store().addDays(today, -30);
    const weightsMonth = weightSeries.filter((w) => w.date >= monthAgo);
    const weightDeltaMonth = weightsMonth.length >= 2
      ? weightsMonth[weightsMonth.length - 1].value - weightsMonth[0].value
      : null;

    const nutritionToday = global.PulseFitAICoachIntelligence?.getNutritionToday?.(state)
      || { calories: 0, protein: 0, carbs: 0, fat: 0 };

    const memory = state.coach?.memory || {};
    const memList = Object.entries(memory).map(([k, v]) => ({ key: k, value: v }));

    const daysSinceSession = global.PulseFitAICoachIntelligence?.daysSinceLastSession?.(state) ?? null;

    const weightHistory = (state.journal || [])
      .filter((j) => j.type === 'weight' && j.value != null)
      .map((j) => ({ date: j.date, value: Number(j.value) }))
      .slice(-14);

    const start = p.startWeight || p.weight;
    const denom = Math.abs(start - p.targetWeight);
    const goalProgress = p.targetWeight && p.weight && denom > 0.5
      ? Math.min(100, Math.max(0, Math.round((1 - Math.abs(p.weight - p.targetWeight) / denom) * 100)))
      : stats.progressPct;

    return {
      date: today,
      profile: {
        name: p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim(),
        firstName: p.firstName,
        lastName: p.lastName,
        age: p.age,
        gender: p.gender,
        height: p.height,
        weight: p.weight,
        startWeight: p.startWeight,
        targetWeight: p.targetWeight,
        goal: p.goal,
        level: p.level,
      },
      program: state.program ? {
        name: state.program.program,
        goal: state.program.goal,
        level: state.program.level,
        sessionsPerWeek: state.program.sessions,
        duration: state.program.duration,
        intensity: state.program.intensityMultiplier,
        config: state.program.config,
      } : null,
      todaySession: todaySession ? {
        title: todaySession.title,
        durationMin: todaySession.durationMin,
        calories: todaySession.calories,
        difficulty: todaySession.difficulty,
        exercises: (todaySession.exercises || []).slice(0, 12).map((e) => ({
          name: typeof e === 'string' ? e : e.name,
          sets: e.sets,
          reps: e.reps,
        })),
        status: todaySession.status,
      } : null,
      stats: {
        xp: stats.xp,
        level: stats.level?.name,
        streak: state.streak?.current || 0,
        progressPct: stats.progressPct,
        sessionsDoneWeek: stats.sessionsDone,
        sessionsPlannedWeek: stats.sessionsPlanned,
        caloriesWeek: stats.caloriesWeek,
        trainMinWeek: stats.trainMin,
        goalProgressPct: goalProgress,
      },
      nutrition: {
        targets,
        today: nutritionToday,
        waterToday: n.water?.[today],
        entriesToday: n.entries?.[today],
      },
      wellness: todayEntry(state),
      journalInsights: journalReport?.insights || state.wellness?.insights || [],
      journalAlerts: journalReport?.alerts || state.wellness?.alerts || [],
      recentSessions,
      weightHistory,
      weightDeltaMonth,
      daysSinceLastSession: daysSinceSession,
      trainingXp: state.training?.xp,
      memory: memList,
      subscription: state.subscription || 'free',
    };
  }

  function systemPrompt(ctx) {
    return `Tu es PulseFit Coach, coach fitness et nutrition personnel premium en français.
Tu connais TOUT le profil et l'historique de l'utilisateur (JSON ci-dessous).
Réponds comme un humain : prénom, chiffres réels, encouragements sincères, listes ✓ actionnables.
Référence les conversations passées et la mémoire si pertinent.
Détecte fatigue, stagnation, manque de protéines, absences d'entraînement.
Si Elite : analyses avancées nutrition + progression.
À la fin si action app utile, ligne seule : ACTIONS:[{"type":"...","payload":{}}]
Types: adapt_program, express_session, generate_meal, shopping_list, log_insight, save_memory, generate_program_gym, generate_program_home.
Ne invente pas de données absentes du contexte.

CONTEXTE_UTILISATEUR:
${JSON.stringify(ctx, null, 0)}`;
  }

  global.PulseFitAICoachContext = { build, systemPrompt, todayEntry };
})(typeof window !== 'undefined' ? window : globalThis);
