/**
 * PulseFit — Moteur Coach IA (analyse, mémoire, réponses personnalisées)
 */
(function (global) {
  'use strict';

  const Store = () => global.PulseFitStore;
  const Context = () => global.PulseFitAICoachContext;

  const QUICK_SUGGESTIONS = global.PulseFitLocalAICoachEngine?.QUICK_SUGGESTIONS || [
    { id: 'time20', label: '⚡ Je n\'ai que 20 minutes', prompt: 'Je n\'ai que 20 minutes, quelle séance faire maintenant ?' },
    { id: 'fatigue', label: '😴 Je suis fatigué aujourd\'hui', prompt: 'Je suis fatigué aujourd\'hui, adapte ma séance sans me surcharger.' },
    { id: 'dinner', label: '🍽️ Que manger ce soir ?', prompt: 'Que manger ce soir selon mes macros et mon objectif ?' },
    { id: 'progress', label: '📊 Analyse ma progression', prompt: 'Analyse ma progression (poids, séances, nutrition) et dis-moi quoi ajuster.' },
    { id: 'motivation', label: '🔥 Motive-moi', prompt: 'Motive-moi avec des conseils personnalisés basés sur mes stats.' },
    { id: 'home', label: '🏠 Crée une séance maison', prompt: 'Crée une séance maison adaptée à mon niveau et mon matériel.' },
  ];

  function detectIntents(text) {
    const t = (text || '').toLowerCase();
    const rules = [
      { id: 'belly', words: ['ventre', 'abdos', 'abdominal'] },
      { id: 'weight_loss', words: ['perdre', 'maigrir', 'kilos', 'poids', 'gras'] },
      { id: 'muscle', words: ['muscle', 'masse', 'prendre du poids', 'force', 'hypertroph'] },
      { id: 'nutrition', words: ['manger', 'repas', 'nutrition', 'protéine', 'calori', 'craqu', 'cheat'] },
      { id: 'motivation', words: ['motiv', 'abandon', 'envie', 'dur', 'décourag'] },
      { id: 'fatigue', words: ['fatigu', 'épuis', 'crevé', 'sommeil'] },
      { id: 'time', words: ['20 min', '30 min', 'minute', 'rapide', 'express', 'peu de temps'] },
      { id: 'continue', words: ['continue', 'suite', 'ensuite', 'demain', 'après', 'comment je'] },
      { id: 'gym', words: ['salle', 'gym', 'haltère'] },
      { id: 'home', words: ['maison', 'domicile', 'sans matériel'] },
      { id: 'week', words: ['semaine', 'planning', 'organiser'] },
    ];
    return rules
      .map((r) => ({ id: r.id, score: r.words.reduce((s, w) => s + (t.includes(w) ? 1 : 0), 0) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  function extractMinutes(text) {
    const m = (text || '').match(/(\d+)\s*min/);
    return m ? Number(m[1]) : 20;
  }

  function getNutritionToday(state) {
    const today = Store().todayISO();
    if (global.PulseFitNutrition?.getDayTotals) {
      return global.PulseFitNutrition.getDayTotals(today);
    }
    const entries = state.nutrition?.entries?.[today];
    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    if (!entries) return totals;
    ['breakfast', 'lunch', 'dinner', 'snack'].forEach((meal) => {
      (entries[meal] || []).forEach((e) => {
        totals.calories += e.calories || 0;
        totals.protein += e.protein || 0;
        totals.carbs += e.carbs || 0;
        totals.fat += e.fat || 0;
      });
    });
    return totals;
  }

  function daysSinceLastSession(state) {
    const today = Store().todayISO();
    const done = (state.schedule || [])
      .filter((s) => s.status === 'done' && s.date <= today)
      .sort((a, b) => b.date.localeCompare(a.date));
    if (done.length) {
      const last = done[0].date;
      const diff = Math.floor((new Date(today) - new Date(last)) / 86400000);
      return diff;
    }
    const logs = (state.sessionLogs || []).filter((l) => l.date <= today).sort((a, b) => b.date.localeCompare(a.date));
    if (logs.length) {
      const diff = Math.floor((new Date(today) - new Date(logs[0].date)) / 86400000);
      return diff;
    }
    return 99;
  }

  function analyzeWeightStagnation(state) {
    const series = global.PulseFitJournalEngine?.getWeightSeries?.(14)
      || Store().getWeightHistory?.()
      || state.journal?.filter((j) => j.type === 'weight').map((j) => ({ date: j.date, value: Number(j.value) })) || [];
    if (series.length < 2) return null;
    const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date));
    const first = sorted[0].value;
    const last = sorted[sorted.length - 1].value;
    const delta = last - first;
    if (Math.abs(delta) < 0.4 && sorted.length >= 4) {
      return { weeks: 2, delta };
    }
    return null;
  }

  function analyze(state) {
    const ctx = Context().build(state);
    const p = ctx.profile;
    const stats = ctx.stats;
    const alerts = [];
    const notifications = [];
    const today = Store().todayISO();
    const daysOff = daysSinceLastSession(state);
    const nutritionToday = getNutritionToday(state);
    const targets = ctx.nutrition?.targets || {};
    const proteinTarget = targets.protein || 0;
    const proteinGap = proteinTarget - nutritionToday.protein;
    const isElite = (state.subscription || 'free') === 'elite';
    const isPro = isElite || state.subscription === 'pro';

    if (daysOff >= 3 && daysOff < 90) {
      const msg = daysOff >= 4
        ? `Tu n'as pas fait de séance depuis **${daysOff} jours**.`
        : `Tu n'as pas fait de séance depuis **${daysOff} jours**.`;
      alerts.push({ severity: 'warning', message: msg, id: 'missed_workout' });
      notifications.push({ type: 'workout', message: 'Il est temps de faire votre séance.', priority: 1 });
    }

    const stagnation = analyzeWeightStagnation(state);
    if (stagnation) {
      alerts.push({
        severity: 'warning',
        message: `Ton poids stagne depuis ~2 semaines (${stagnation.delta > 0 ? '+' : ''}${stagnation.delta.toFixed(1)} kg).`,
        id: 'weight_plateau',
      });
    }

    if (proteinTarget > 0 && nutritionToday.protein > 0 && proteinGap > 35) {
      alerts.push({
        severity: 'warning',
        message: `Tes protéines sont trop faibles aujourd'hui (${Math.round(nutritionToday.protein)}g / ${proteinTarget}g).`,
        id: 'low_protein',
      });
      notifications.push({ type: 'nutrition', message: 'Objectif protéines non atteint.', priority: 2 });
    }

    if (ctx.weightDeltaMonth != null && ctx.weightDeltaMonth <= -0.8) {
      notifications.push({
        type: 'progress',
        message: `Vous avez perdu ${Math.abs(ctx.weightDeltaMonth).toFixed(1)} kg ce mois-ci.`,
        priority: 3,
      });
    }

    if (stats.progressPct < 40 && stats.sessionsPlannedWeek > 0) {
      alerts.push({
        severity: 'info',
        message: `Objectif semaine à **${stats.progressPct}%** (${stats.sessionsDoneWeek}/${stats.sessionsPlannedWeek} séances).`,
        id: 'goal_behind',
      });
    }

    if (ctx.wellness?.energy != null && ctx.wellness.energy < 5) {
      alerts.push({ severity: 'warning', message: 'Énergie basse aujourd\'hui — privilégie récupération ou séance légère.', id: 'low_energy' });
    }

  if (ctx.wellness?.mood != null && ctx.wellness.mood < 5) {
      alerts.push({ severity: 'info', message: 'Baisse de motivation détectée dans votre journal.', id: 'low_mood' });
    }

    const weekActivity = Store().getWeeklyActivity?.() || [];
    const inactiveDays = weekActivity.filter((d) => d.minutes === 0).length;
    if (inactiveDays >= 4) {
      alerts.push({ severity: 'warning', message: 'Manque d\'activité cette semaine.', id: 'low_activity' });
    }

    if (isElite && ctx.program) {
      notifications.push({ type: 'elite', message: 'Nouvelle recommandation avancée disponible.', priority: 4 });
    } else if (isPro) {
      notifications.push({ type: 'recommendation', message: 'Nouvelle recommandation disponible.', priority: 4 });
    }

    return {
      ctx,
      alerts,
      notifications: notifications.slice(0, 5),
      metrics: {
        streak: stats.streak || state.streak?.current || 0,
        xp: stats.xp || state.gamification?.xp || 0,
        sessionsWeek: stats.sessionsDoneWeek || 0,
        sessionsPlanned: stats.sessionsPlannedWeek || 0,
        weight: p.weight,
        targetWeight: p.targetWeight,
        progressPct: stats.progressPct || 0,
        weightDeltaMonth: ctx.weightDeltaMonth,
        proteinToday: Math.round(nutritionToday.protein),
        proteinTarget,
        proteinGap,
        caloriesTarget: targets.kcal,
        daysSinceSession: daysOff,
      },
      isElite,
      isPro,
    };
  }

  function historyContext(messages, memory) {
    const recent = (messages || []).slice(-12).map((m) => `${m.role}: ${m.text}`).join('\n');
    const memEntries = Object.entries(memory || {}).map(([k, v]) => `${k}: ${v}`);
    const topics = [];
    const allText = `${recent} ${memEntries.join(' ')}`.toLowerCase();

    if (/ventre|abdos|perdre.*poids|maigrir/.test(allText)) topics.push('perte de poids / ventre');
    if (/muscle|masse|prendre/.test(allText)) topics.push('prise de muscle');
    if (/fatigu|récup|repos/.test(allText)) topics.push('fatigue / récupération');
    if (/repas|nutrition|protéine|manger/.test(allText)) topics.push('nutrition');
    if (/20 min|rapide|express/.test(allText)) topics.push('séance courte');
    if (/motiv|abandon/.test(allText)) topics.push('motivation');

    return { recent, topics, memory: memEntries };
  }

  function resolveFollowUp(userText, histCtx, intents) {
    const t = userText.toLowerCase();
    const isContinue = intents.some((i) => i.id === 'continue') || /continue|suite|ensuite|demain|comment je/.test(t);
    if (!isContinue || !histCtx.topics.length) return null;
    return histCtx.topics[0];
  }

  function buildRecommendations(ctx, analysis, intents, userText) {
    const p = ctx.profile;
    const goal = (p.goal || '').toLowerCase();
    const recs = [];
    const primary = intents[0]?.id;

    if (primary === 'time' || primary === 'home') {
      const min = extractMinutes(userText || '') || 20;
      recs.push(`✓ ${min} min de circuit full body`);
      recs.push('✓ 5 min échauffement + 5 min retour au calme');
    } else if (primary === 'fatigue' || /fatigu/.test(goal)) {
      recs.push('✓ 25 min mobilité + marche active');
      recs.push('✓ Pas de HIIT intense aujourd\'hui');
    } else if (/perte|poids|maigrir|ventre/.test(goal) || primary === 'weight_loss' || primary === 'belly') {
      recs.push('✓ 30 min de cardio modéré');
      recs.push('✓ 15 min de gainage');
      recs.push('✓ Dîner riche en protéines');
    } else if (/muscle|masse/.test(goal) || primary === 'muscle') {
      recs.push('✓ Séance force 45 min (composés)');
      recs.push('✓ +30g protéines vs hier');
    } else if (ctx.todaySession?.title) {
      recs.push(`✓ ${ctx.todaySession.title} (${ctx.todaySession.durationMin} min)`);
      if (ctx.todaySession.exercises?.[0]) {
        recs.push(`✓ Focus : ${ctx.todaySession.exercises.slice(0, 2).map((e) => e.name).join(', ')}`);
      }
    } else {
      recs.push('✓ 35 min entraînement selon votre niveau');
      recs.push('✓ Hydratation + 2L eau');
      recs.push('✓ Coucher avant 23h pour récupérer');
    }

    if (analysis.metrics.proteinGap > 20) {
      recs.push(`✓ Viser **${analysis.metrics.proteinTarget}g** de protéines (il vous reste ~${Math.round(analysis.metrics.proteinTarget - analysis.metrics.proteinToday)}g)`);
    }

    return recs.slice(0, 5);
  }

  function composeResponse(userText, state, messageHistory) {
    if (global.PulseFitLocalAICoachEngine?.compose) {
      const local = global.PulseFitLocalAICoachEngine.compose(userText, state, messageHistory);
      const analysis = analyze(state);
      return { ...local, provider: 'local', analysis };
    }

    const analysis = analyze(state);
    const ctx = analysis.ctx;
    const coach = state.coach || {};
    const memory = coach.memory || {};
    const histCtx = historyContext(messageHistory || [], memory);
    const intents = detectIntents(userText);
    const followTopic = resolveFollowUp(userText, histCtx, intents);
    const p = ctx.profile;
    const m = analysis.metrics;
    const firstName = p.firstName || p.name?.split(' ')?.[0] || 'champion';
    const actions = [];
    const lines = [];
    const primary = intents[0]?.id || 'general';

    lines.push(`**Bravo ${firstName}.**`);
    lines.push('');

    if (followTopic) {
      lines.push(`On continue sur votre objectif **${followTopic}** — voici la suite concrète :`);
      lines.push('');
    }

    lines.push(`Tu es actuellement à **${p.weight} kg**${p.targetWeight ? ` (objectif ${p.targetWeight} kg)` : ''}.`);
    lines.push(`Tu as complété **${m.sessionsWeek} séance${m.sessionsWeek > 1 ? 's' : ''}** cette semaine et gagné **${m.xp} XP** (série : **${m.streak} jour${m.streak > 1 ? 's' : ''}**).`);

    if (m.weightDeltaMonth != null) {
      const sign = m.weightDeltaMonth > 0 ? '+' : '';
      lines.push(`Évolution sur 30 jours : **${sign}${m.weightDeltaMonth.toFixed(1)} kg**.`);
    }

    lines.push('');

    analysis.alerts.slice(0, 2).forEach((a) => {
      lines.push(`⚠ ${a.message.replace(/\*\*/g, '')}`);
    });

    if (analysis.alerts.length) lines.push('');

    if (primary === 'cheat' || /craqu|cheat|écart/.test(userText.toLowerCase())) {
      lines.push('Un écart n\'efface pas vos progrès. Reprenez dès le prochain repas :');
      lines.push('✓ Repas suivant léger et riche en protéines');
      lines.push('✓ 20 min de marche ce soir');
      lines.push('✓ Pas de restriction extrême demain');
      actions.push({ type: 'generate_meal', payload: { meal: 'dinner' } });
    } else if (primary === 'motivation') {
      lines.push(`Vous avez déjà **${m.streak} jours** de série — c'est plus fort que la motivation ponctuelle.`);
      lines.push('Aujourd\'hui : une séance de **15 minutes** suffit pour garder l\'élan.');
      actions.push({ type: 'express_session', payload: { minutes: 15 } });
    } else if (primary === 'meals' || primary === 'nutrition') {
      const t = ctx.nutrition?.targets || {};
      lines.push(`Vos cibles : **${t.kcal} kcal** · **${t.protein}g** protéines.`);
      lines.push(`Aujourd'hui : **${m.proteinToday}g** protéines enregistrées.`);
      actions.push({ type: 'generate_meal', payload: { meal: /midi|déjeuner/.test(userText) ? 'lunch' : 'dinner' } });
    } else if (primary === 'week') {
      lines.push(`Planning suggéré (${ctx.program?.sessionsPerWeek || 4} séances) :`);
      lines.push('✓ Lun : Force haut du corps');
      lines.push('✓ Mer : Cardio modéré');
      lines.push('✓ Ven : Full body');
      lines.push('✓ Dim : Mobilité / repos actif');
      actions.push({ type: 'adapt_program', payload: { reason: 'weekly_plan' } });
    } else {
      const goalLine = /perte|poids|maigrir|ventre/.test((p.goal || '').toLowerCase())
        ? 'Pour continuer votre perte de poids, je te recommande aujourd\'hui :'
        : /muscle|masse/.test((p.goal || '').toLowerCase())
          ? 'Pour développer ta masse musculaire :'
          : 'Pour progresser vers ton objectif :';
      lines.push(goalLine);
      buildRecommendations(ctx, analysis, intents, userText).forEach((r) => lines.push(r));
    }

    lines.push('');
    lines.push('**Tu es sur la bonne voie.**');

    if (analysis.isElite) {
      lines.push('');
      lines.push('**Analyse Elite** :');
      lines.push(`• Volume hebdo : ${m.sessionsWeek}/${m.sessionsPlanned} séances · ${ctx.stats.trainMinWeek || 0} min`);
      if (ctx.journalInsights?.length) {
        lines.push(`• ${ctx.journalInsights[0].message}`);
      }
      lines.push('• Ajustement macros et récupération personnalisés activés.');
    } else if (analysis.isPro) {
      lines.push('');
      lines.push('*Conseil Pro : suivi nutrition détaillé et adaptation programme disponibles.*');
    }

    if (memory.weight_goal_kg) {
      lines.push(`\n📌 Objectif mémorisé : **-${memory.weight_goal_kg} kg**.`);
    }
    if (memory.diet) {
      lines.push(`📌 Préférence alimentaire : **${memory.diet}**.`);
    }

    if (/^test$/i.test((userText || '').trim())) {
      return {
        text: `Je vous reçois, ${firstName}. Toutes vos données PulseFit sont connectées (${p.weight} kg, ${m.sessionsWeek} séances/sem., ${m.xp} XP). Posez-moi une vraie question !`,
        actions: [],
        provider: 'intelligent',
        analysis,
      };
    }

    if (primary === 'gym' && ctx.todaySession) {
      actions.push({ type: 'express_session', payload: { minutes: ctx.todaySession.durationMin || 45 } });
    }
    if (primary === 'time') {
      actions.push({ type: 'express_session', payload: { minutes: extractMinutes(userText) } });
    }
    if (primary === 'weight_loss' || primary === 'belly') {
      const kg = (userText.match(/(\d+(?:[.,]\d+)?)\s*kg/) || [])[1];
      if (kg) actions.push({ type: 'save_memory', payload: { key: 'weight_goal_kg', value: kg.replace(',', '.'), category: 'goal' } });
      if (/ventre|abdos/.test(userText.toLowerCase())) {
        actions.push({ type: 'save_memory', payload: { key: 'focus_area', value: 'ventre', category: 'goal' } });
      }
    }
    if (primary === 'muscle') {
      actions.push({ type: 'generate_program_gym', payload: {} });
    }
    if (primary === 'home') {
      actions.push({ type: 'generate_program_home', payload: {} });
    }
    if (primary === 'fatigue') {
      actions.push({ type: 'adapt_program', payload: { reason: 'fatigue' } });
    }

    return {
      text: lines.join('\n'),
      actions,
      provider: 'intelligent',
      analysis,
    };
  }

  function groupConversationsByDate(conversations) {
    const today = Store().todayISO();
    const yesterday = Store().addDays(today, -1);
    const weekStart = Store().addDays(today, -6);
    const groups = { today: [], yesterday: [], week: [], older: [] };

    (conversations || []).forEach((c) => {
      const d = (c.updatedAt || c.createdAt || today).slice(0, 10);
      const item = { ...c, preview: getPreview(c) };
      if (d === today) groups.today.push(item);
      else if (d === yesterday) groups.yesterday.push(item);
      else if (d >= weekStart) groups.week.push(item);
      else groups.older.push(item);
    });

    return groups;
  }

  function getPreview(conv) {
    const msgs = conv.messages || [];
    const lastUser = [...msgs].reverse().find((m) => m.role === 'user');
    return lastUser?.text?.slice(0, 48) || conv.title || 'Conversation';
  }

  global.PulseFitAICoachIntelligence = {
    QUICK_SUGGESTIONS,
    analyze,
    composeResponse,
    detectIntents,
    groupConversationsByDate,
    getNutritionToday,
    daysSinceLastSession,
  };
})(typeof window !== 'undefined' ? window : globalThis);
