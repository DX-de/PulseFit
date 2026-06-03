/**
 * PulseFit — Coach IA (API principale)
 */
(function (global) {
  'use strict';

  const Store = () => global.PulseFitStore;
  const Service = () => global.PulseFitAICoachService;
  const Actions = () => global.PulseFitAICoachActions;
  const Cloud = () => global.PulseFitAICoachCloud;
  const Intel = () => global.PulseFitAICoachIntelligence;

  function uid() {
    return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function ensureCoach(state) {
    state.coach = state.coach || {
      conversations: [],
      memory: {},
      insights: [],
      recommendations: [],
      adjustments: [],
      notifications: [],
    };
    if (!state.coach.memory || Array.isArray(state.coach.memory)) {
      const mem = state.coach.memory;
      state.coach.memory = Array.isArray(mem) ? {} : (mem || {});
    }
    if (!state.coach.conversations.length) {
      const fn = state.profile?.firstName
        || global.PulseFitUserDisplay?.displayFirstName?.(state.profile)
        || '';
      const greet = fn ? `Bonjour ${fn}` : 'Bonjour';
      state.coach.conversations.push({
        id: uid(),
        title: 'Coach PulseFit',
        messages: [{
          role: 'bot',
          text: `${greet} — je suis ton coach PulseFit. J'ai accès à ton poids, ton programme, ta nutrition et tes séances. Dis-moi ce dont tu as besoin (fatigue, repas, salle, progression…).`,
          at: new Date().toISOString(),
        }],
        createdAt: Store().todayISO(),
        updatedAt: Store().todayISO(),
      });
      state.coach.activeConversationId = state.coach.conversations[0].id;
    }
    if (!state.coach.activeConversationId) {
      state.coach.activeConversationId = state.coach.conversations[0].id;
    }
    return state.coach;
  }

  function activeConversation(state) {
    const coach = ensureCoach(state);
    return coach.conversations.find((c) => c.id === coach.activeConversationId)
      || coach.conversations[0];
  }

  function refreshNotifications(state) {
    if (!Intel()) return [];
    const analysis = Intel().analyze(state || Store().load());
    state.coach = state.coach || {};
    state.coach.notifications = analysis.notifications || [];
    return state.coach.notifications;
  }

  function getDashboard(state) {
    if (!Intel()) return null;
    return Intel().analyze(state || Store().load());
  }

  function getGroupedHistory(state) {
    const coach = ensureCoach(state);
    if (!Intel()?.groupConversationsByDate) return { today: [], yesterday: [], week: [], older: [] };
    return Intel().groupConversationsByDate(coach.conversations);
  }

  function switchConversation(conversationId) {
    const state = Store().load();
    const coach = ensureCoach(state);
    if (coach.conversations.some((c) => c.id === conversationId)) {
      coach.activeConversationId = conversationId;
      Store().save(state);
    }
    return activeConversation(state);
  }

  function newConversation(title) {
    const state = Store().load();
    const coach = ensureCoach(state);
    const conv = {
      id: uid(),
      title: title || `Conversation ${coach.conversations.length + 1}`,
      messages: [{
        role: 'bot',
        text: 'Nouvelle conversation — je me souviens de vos objectifs et de votre historique PulseFit.',
        at: new Date().toISOString(),
      }],
      createdAt: Store().todayISO(),
      updatedAt: Store().todayISO(),
    };
    coach.conversations.unshift(conv);
    coach.activeConversationId = conv.id;
    Store().save(state);
    return conv;
  }

  async function sendMessage(text) {
    const state = Store().load();
    if (!Store().canSendCoachMessage(state)) {
      throw new Error('Limite Free atteinte (10 messages/jour). Passez Premium pour le coach illimité.');
    }
    const coach = ensureCoach(state);
    const conv = activeConversation(state);
    const userText = String(text || '').trim();
    if (!userText) return conv.messages;

    const last = conv.messages[conv.messages.length - 1];
    const alreadyHasUser = last?.role === 'user' && last?.text === userText;
    if (!alreadyHasUser) {
      conv.messages.push({ role: 'user', text: userText, at: new Date().toISOString() });
    }
    conv.updatedAt = Store().todayISO();
    if (conv.messages.filter((m) => m.role === 'user').length === 1) {
      conv.title = userText.slice(0, 40) + (userText.length > 40 ? '…' : '');
    }

    const memoryUpdates = Service().extractMemoryUpdates(userText, state);
    for (const m of memoryUpdates) {
      if (!m.key) continue;
      coach.memory[m.key] = m.value;
      if (Cloud().isEnabled?.()) await Cloud().upsertMemory(m.key, m.value, m.category);
    }

    if (/ventre|abdos|perdre.*(ventre|poids)/i.test(userText)) {
      coach.memory.focus_area = 'ventre';
      coach.memory.last_goal = 'perte de poids';
    }
    if (/muscle|masse/i.test(userText)) coach.memory.last_goal = 'prise de muscle';

    const result = await Service().chat(userText, state, conv.messages);
    let replyText = result.text || '';
    const actionResults = await Actions().execute(result.actions, state);

    if (actionResults.length) {
      const notes = actionResults.map((r) => r?.message).filter(Boolean);
      if (notes.length) replyText += `\n\n✅ **Actions** : ${notes.join(' · ')}`;
    }

    conv.messages.push({
      role: 'bot',
      text: replyText,
      at: new Date().toISOString(),
      meta: { provider: result.provider, actions: result.actions },
    });

    refreshNotifications(state);
    Store().incrementCoachUsage(state);

    for (const r of actionResults) {
      if (r?.message) {
        coach.recommendations = coach.recommendations || [];
        coach.recommendations.unshift({
          id: `rec-${Date.now()}`,
          category: r.type,
          message: r.message,
          at: new Date().toISOString(),
        });
        if (Cloud().isEnabled?.()) {
          await Cloud().insertRecommendation(r.type, r.message, r.type, {});
        }
      }
    }

    Store().save(state);

    if (Cloud().isEnabled?.()) {
      const c = activeConversation(state);
      const convId = await Cloud().ensureConversation(c);
      await Cloud().insertMessage(convId, 'user', userText);
      await Cloud().insertMessage(convId, 'assistant', replyText, { actions: result.actions });
    }

    return conv.messages;
  }

  function getQuickInsights(state) {
    if (Intel()) {
      return Intel().analyze(state || Store().load()).alerts;
    }
    const ctx = global.PulseFitAICoachContext.build(state || Store().load());
    return ctx.journalAlerts || [];
  }

  async function sendQuickCommand(cmd) {
    const prompts = {
      session: 'Quelle est ma séance du jour ? Détaille exercices et conseils.',
      weight: 'Analyse mon poids et ma progression sur le dernier mois.',
      nutrition: 'Que dois-je manger aujourd\'hui pour atteindre mes macros ?',
      motivation: 'Je manque de motivation, aide-moi avec mes vraies données.',
      recovery: 'Je suis fatigué, que me conseilles-tu pour récupérer ?',
      goals: 'Rappelle-moi mes objectifs et mon avancement exact.',
      progress: 'Analyse complète de ma progression cette semaine.',
      meal: 'Génère mes repas pour aujourd\'hui.',
      calories: 'Résume mes calories et macros du jour avec mes données.',
      weight_loss: 'Je veux perdre du poids, aide-moi avec un plan concret.',
      muscle: 'Je veux prendre du muscle, adapte mon programme.',
      meals: 'Génère mes repas pour aujourd\'hui selon mes macros.',
      week: 'Organise ma semaine d\'entraînement.',
      time20: 'Je n\'ai que 20 minutes, quelle séance faire ?',
      home: 'Séance rapide à la maison sans matériel.',
      cheat: 'J\'ai craqué sur la nourriture aujourd\'hui, que faire ?',
    };
    const suggestion = Intel()?.QUICK_SUGGESTIONS?.find((s) => s.id === cmd);
    return sendMessage(suggestion?.prompt || prompts[cmd] || cmd);
  }

  global.PulseFitAICoach = {
    sendMessage,
    sendQuickCommand,
    getQuickInsights,
    getDashboard,
    getGroupedHistory,
    refreshNotifications,
    switchConversation,
    newConversation,
    ensureCoach,
    activeConversation,
    QUICK_SUGGESTIONS: () => Intel()?.QUICK_SUGGESTIONS || [],
  };

  global.PulseFitAI = {
    reply: (text, state) => {
      const s = state || Store().load();
      return Service().composeFromContext(
        text,
        global.PulseFitAICoachContext.build(s),
        s,
        activeConversation(s).messages,
      );
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
