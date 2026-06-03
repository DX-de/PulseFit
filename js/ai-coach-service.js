/**
 * PulseFit — Service Coach IA (providers + composition contextuelle)
 */
(function (global) {
  'use strict';

  const Context = () => global.PulseFitAICoachContext;
  const Providers = () => global.PulseFitAIProviders;
  const Actions = () => global.PulseFitAICoachActions;

  const INTENTS = [
    { id: 'gym', words: ['salle', 'gym', 'musculation', 'haltère', 'bench'] },
    { id: 'fatigue', words: ['fatigu', 'épuis', 'crevé', 'pas envie', 'dur aujourd'] },
    { id: 'time', words: ['20 min', '30 min', 'peu de temps', 'minute', 'express', 'rapide'] },
    { id: 'weight_loss', words: ['perdre', 'kilos', 'kg', 'maigrir', 'poids'] },
    { id: 'nutrition', words: ['manger', 'repas', 'soir', 'midi', 'petit-déjeuner', 'calori', 'nutrition', 'protéine'] },
    { id: 'progress', words: ['progression', 'résultat', 'analyse', 'évolution', 'perform'] },
    { id: 'recovery', words: ['récup', 'repos', 'sommeil', 'blessure', 'douleur'] },
    { id: 'motivation', words: ['motiv', 'abandon', 'encourag'] },
    { id: 'home', words: ['maison', 'domicile', 'sans matériel', 'poids du corps'] },
  ];

  function detectIntents(text) {
    const t = (text || '').toLowerCase();
    return INTENTS
      .map((i) => ({ id: i.id, score: i.words.reduce((s, w) => s + (t.includes(w) ? 1 : 0), 0) }))
      .filter((i) => i.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  function extractMinutes(text) {
    const m = (text || '').match(/(\d+)\s*min/);
    return m ? Number(m[1]) : 20;
  }

  function extractKgGoal(text) {
    const m = (text || '').match(/(\d+(?:[.,]\d+)?)\s*kg/);
    return m ? Number(m[1].replace(',', '.')) : null;
  }

  function composeFromContext(userText, ctx, state, history) {
    const st = state || global.PulseFitStore?.load?.() || {};
    const hist = history || [];

    if (global.PulseFitLocalAICoachEngine?.compose) {
      const result = global.PulseFitLocalAICoachEngine.compose(userText, st, hist);
      return {
        text: result.text,
        actions: result.actions,
        provider: result.provider || 'local',
      };
    }

    if (global.PulseFitAICoachIntelligence) {
      const result = global.PulseFitAICoachIntelligence.composeResponse(userText, st, hist);
      return {
        text: result.text,
        actions: result.actions,
        provider: result.provider || 'intelligent',
      };
    }

    const intents = detectIntents(userText);
    const primary = intents[0]?.id || 'general';
    const p = ctx.profile;
    const lines = [];
    const actions = [];

    lines.push(`Bonjour ${p.firstName || p.name || 'champion'} — voici mon analyse basée sur vos données PulseFit du ${ctx.date}.`);

    if (primary === 'gym' || /salle|gym/i.test(userText)) {
      const s = ctx.todaySession;
      if (s) {
        lines.push(`**Séance salle du jour** : ${s.title} · ${s.durationMin} min · ~${s.calories} kcal · difficulté ${s.difficulty}/10.`);
        if (s.exercises?.length) {
          lines.push('Exercices : ' + s.exercises.map((e) => `${e.name} (${e.sets}×${e.reps})`).join(' · '));
        }
      } else if (ctx.program) {
        lines.push(`Programme actif : **${ctx.program.name}** (${ctx.program.sessionsPerWeek} séances/sem., ${ctx.program.duration}). Je peux générer une séance salle complète.`);
        actions.push({ type: 'generate_program_gym', payload: {} });
      } else {
        lines.push('Aucun programme actif — je vous propose de configurer un plan salle dans Programme.');
        actions.push({ type: 'generate_program_gym', payload: {} });
      }
    }

    if (primary === 'fatigue' || primary === 'recovery') {
      const w = ctx.wellness;
      lines.push(w
        ? `Journal : énergie ${w.energy}/10, sommeil ${w.sleep}/10, stress ${w.stress}/10.`
        : 'Complétez votre journal pour affiner la récupération.');
      lines.push('**Recommandation** : séance légère mobilité 20–25 min ou repos actif. Intensité programme -15 %.');
      actions.push({ type: 'adapt_program', payload: { reason: 'fatigue' } });
      actions.push({ type: 'express_session', payload: { minutes: 25 } });
    }

    if (primary === 'time' || /minute/i.test(userText)) {
      const min = extractMinutes(userText);
      lines.push(`Séance express **${min} minutes** calibrée sur votre niveau ${p.level} et objectif ${p.goal}.`);
      actions.push({ type: 'express_session', payload: { minutes: min } });
    }

    if (primary === 'weight_loss') {
      const kg = extractKgGoal(userText);
      const cur = p.weight;
      const tgt = p.targetWeight;
      if (kg && cur) {
        const weeks = Math.max(4, Math.ceil(Math.abs(cur - (cur - kg)) / 0.5));
        lines.push(`Objectif : **-${kg} kg**. Poids actuel ${cur} kg → cible ${tgt || cur - kg} kg.`);
        lines.push(`Plan réaliste : déficit ~400 kcal/j, ${ctx.program?.sessionsPerWeek || 4} séances/sem., -0,5 kg/sem. (~${weeks} semaines).`);
        actions.push({ type: 'save_memory', payload: { key: 'weight_goal_kg', value: String(kg), category: 'goal' } });
      } else {
        lines.push(`Poids ${cur} kg, objectif profil ${tgt} kg. Delta mois : ${ctx.weightDeltaMonth != null ? `${ctx.weightDeltaMonth > 0 ? '+' : ''}${ctx.weightDeltaMonth.toFixed(1)} kg` : 'données insuffisantes'}.`);
      }
      if (ctx.nutrition?.targets) {
        lines.push(`Macros : ${ctx.nutrition.targets.kcal} kcal · P ${ctx.nutrition.targets.protein}g · G ${ctx.nutrition.targets.carbs}g · L ${ctx.nutrition.targets.fat}g.`);
      }
    }

    if (primary === 'nutrition') {
      const t = ctx.nutrition?.targets || {};
      const meal = /soir|dîner/i.test(userText) ? 'dinner' : /midi|déjeuner/i.test(userText) ? 'lunch' : 'dinner';
      lines.push(`Cibles : **${t.kcal} kcal/j** (P ${t.protein}g). Je génère une proposition pour le ${meal === 'dinner' ? 'dîner' : 'repas'}.`);
      actions.push({ type: 'generate_meal', payload: { meal } });
    }

    if (primary === 'progress') {
      lines.push(`**Progression semaine** : ${ctx.stats.progressPct}% · ${ctx.stats.sessionsDoneWeek}/${ctx.stats.sessionsPlannedWeek} séances · ${ctx.stats.trainMinWeek} min · ${ctx.stats.caloriesWeek} kcal brûlées.`);
      if (ctx.weightDeltaMonth != null) {
        lines.push(`Poids sur 30 jours : **${ctx.weightDeltaMonth > 0 ? '+' : ''}${ctx.weightDeltaMonth.toFixed(1)} kg**.`);
      }
      (ctx.journalInsights || []).slice(0, 2).forEach((i) => lines.push(`• ${i.message}`));
    }

    if (primary === 'home') {
      lines.push('Programme **maison** (poids du corps) adapté à votre profil.');
      actions.push({ type: 'generate_program_home', payload: {} });
    }

    if (primary === 'motivation') {
      lines.push(`Streak **${ctx.stats.streak} jours** · ${ctx.stats.xp} XP · niveau ${ctx.stats.level}. Progression ${ctx.stats.progressPct}% cette semaine — une séance courte maintient l'élan.`);
    }

    if (primary === 'general' && lines.length < 3) {
      lines.push(`Profil : ${p.goal}, ${p.level}, ${p.weight} kg. Programme : ${ctx.program?.name || 'non configuré'}.`);
      if (ctx.todaySession) lines.push(`Aujourd'hui : ${ctx.todaySession.title}.`);
      (ctx.journalAlerts || []).slice(0, 1).forEach((a) => lines.push(`⚠ ${a.message}`));
      (ctx.memory || []).slice(0, 3).forEach((m) => lines.push(`Mémoire : ${m.key} = ${m.value}`));
    }

    if (/^test$/i.test((userText || '').trim())) {
      lines.push('Je vous reçois bien. Posez une vraie question (séance, nutrition, fatigue, objectif poids…) pour une réponse détaillée.');
    }

    if (ctx.journalAlerts?.length && primary !== 'fatigue') {
      lines.push('\n**Alertes** : ' + ctx.journalAlerts.map((a) => a.message).join(' · '));
    }

    return {
      text: lines.join('\n\n'),
      actions,
      provider: 'contextual',
    };
  }

  function providerErrorHint(err) {
    const m = err?.message || String(err);
    if (/credit balance|billing|quota|insufficient/i.test(m)) {
      return '⚠ **Compte Anthropic** : plus de crédits API. Recharge sur [console.anthropic.com](https://console.anthropic.com) → Plans & Billing. En attendant, réponse locale ci-dessous.';
    }
    if (/Failed to fetch|NetworkError|ECONNREFUSED|injoignable/i.test(m)) {
      return '⚠ **Proxy IA** : lancez `npm run ai-proxy` dans un terminal (laissez-le ouvert), puis Ctrl+Shift+R sur cette page.';
    }
    if (/404|not found|ai-chat/i.test(m)) {
      return '⚠ **Supabase** : déployez `supabase/functions/ai-chat` ou utilisez `npm run ai-proxy` en local.';
    }
    return `⚠ ${m}`;
  }

  async function chat(userText, state, history) {
    const st = state || global.PulseFitStore?.load?.() || {};
    const hist = history || [];
    const ctx = Context().build(st);
    const system = Context().systemPrompt(ctx);
    const messages = hist.slice(-16).map((m) => ({
      role: m.role === 'bot' || m.role === 'assistant' ? 'assistant' : 'user',
      text: m.text || m.content,
    }));

    const useRemote = global.PulseFitLocalAICoachEngine?.shouldUseRemoteLLM?.(st)
      ?? (Providers().isConfigured() && (st.subscription === 'pro' || st.subscription === 'elite'));

    if (useRemote && Providers().isConfigured()) {
      try {
        const raw = await Providers().complete({ system, messages: [...messages, { role: 'user', content: userText }] });
        const { cleanText, actions } = Actions().parseActionsFromText(raw);
        return { text: cleanText || raw, actions, provider: Providers().getConfig().provider };
      } catch (err) {
        console.warn('LLM provider failed, fallback contextual:', err);
        const fallback = composeFromContext(userText, ctx, st, hist);
        fallback.text += `\n\n---\n${providerErrorHint(err)}`;
        fallback.provider = 'local';
        return fallback;
      }
    }

    return composeFromContext(userText, ctx, st, hist);
  }

  function extractMemoryUpdates(userText, state) {
    if (global.PulseFitLocalAICoachEngine?.extractMemoryUpdates) {
      return global.PulseFitLocalAICoachEngine.extractMemoryUpdates(userText);
    }
    const updates = [];
    const t = userText.toLowerCase();
    const kg = extractKgGoal(userText);
    if (kg) updates.push({ key: 'weight_goal_kg', value: String(kg), category: 'goal' });
    if (/végétarien|vegetarien|vegan/i.test(t)) updates.push({ key: 'diet', value: 'vegetarien', category: 'preference' });
    if (/genou|épaule|dos|bless/i.test(t)) updates.push({ key: 'injury_note', value: userText.slice(0, 200), category: 'difficulty' });
    if (/n'aime pas|déteste|éviter/i.test(t)) updates.push({ key: 'dislikes', value: userText.slice(0, 200), category: 'preference' });
    if (/ventre|abdos/i.test(t)) updates.push({ key: 'focus_area', value: 'ventre', category: 'goal' });
    if (/perdre|maigrir/i.test(t)) updates.push({ key: 'last_goal', value: 'perte de poids', category: 'goal' });
    if (/muscle|masse/i.test(t)) updates.push({ key: 'last_goal', value: 'prise de muscle', category: 'goal' });
    if (/conseil|recommand/i.test(t)) updates.push({ key: 'last_advice', value: userText.slice(0, 300), category: 'advice' });
    return updates;
  }

  global.PulseFitAICoachService = {
    chat,
    composeFromContext,
    detectIntents,
    extractMemoryUpdates,
  };
})(typeof window !== 'undefined' ? window : globalThis);
