/**
 * PulseFit — Sync Supabase Coach IA
 */
(function (global) {
  'use strict';

  const Store = () => global.PulseFitStore;

  function db() {
    return global.PulseFitSupabase?.getClient?.();
  }

  function isEnabled() {
    return global.PulseFitSupabase?.isConfigured?.();
  }

  async function getUserId() {
    const sb = db();
    if (!sb) return null;
    const { data: { user } } = await sb.auth.getUser();
    return user?.id || null;
  }

  async function pull(state) {
    const sb = db();
    const userId = await getUserId();
    if (!sb || !userId) return state;

    state.coach = state.coach || { conversations: [], memory: {}, insights: [], recommendations: [] };

    const { data: convs } = await sb.from('ai_conversations').select('*').eq('user_id', userId).order('updated_at', { ascending: false }).limit(5);
    const active = convs?.find((c) => c.is_active) || convs?.[0];

    if (active) {
      const { data: msgs } = await sb.from('ai_messages').select('*').eq('conversation_id', active.id).order('created_at', { ascending: true });
      state.coach.conversations = [{
        id: active.external_id || active.id,
        _dbId: active.id,
        title: active.title,
        messages: (msgs || []).filter((m) => m.role !== 'system').map((m) => ({
          role: m.role === 'assistant' ? 'bot' : m.role,
          text: m.content,
          at: m.created_at,
        })),
      }];
      state.coach.activeConversationId = active.id;
    }

    const { data: mem } = await sb.from('ai_memory').select('*').eq('user_id', userId);
    state.coach.memory = {};
    (mem || []).forEach((m) => { state.coach.memory[m.memory_key] = m.memory_value; });

    const { data: recs } = await sb.from('ai_recommendations').select('*').eq('user_id', userId).eq('applied', false).order('created_at', { ascending: false }).limit(20);
    state.coach.recommendations = (recs || []).map((r) => ({
      id: r.id,
      category: r.category,
      message: r.message,
      actionType: r.action_type,
      payload: r.payload,
    }));

    const { data: insights } = await sb.from('ai_insights').select('*').eq('user_id', userId).eq('dismissed', false).order('created_at', { ascending: false }).limit(15);
    state.coach.insights = (insights || []).map((i) => ({
      id: i.id,
      type: i.insight_type,
      message: i.message,
      severity: i.severity,
    }));

    Store().save(state);
    return state;
  }

  async function ensureConversation(conv) {
    const sb = db();
    const userId = await getUserId();
    if (!sb || !userId) return null;

    if (conv._dbId) return conv._dbId;

    const { data } = await sb.from('ai_conversations').insert({
      user_id: userId,
      title: conv.title || 'Coach PulseFit',
      external_id: conv.id,
      is_active: true,
    }).select('id').single();

    if (data) {
      conv._dbId = data.id;
      const st = Store().load();
      st.coach.activeConversationId = data.id;
      Store().save(st);
      await sb.from('ai_conversations').update({ is_active: false }).eq('user_id', userId).neq('id', data.id);
    }
    return data?.id;
  }

  async function insertMessage(conversationId, role, content, metadata) {
    const sb = db();
    const userId = await getUserId();
    if (!sb || !userId || !conversationId) return;
    await sb.from('ai_messages').insert({
      user_id: userId,
      conversation_id: conversationId,
      role: role === 'bot' ? 'assistant' : role,
      content,
      metadata: metadata || {},
    });
    await sb.from('ai_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
  }

  async function upsertMemory(key, value, category) {
    const sb = db();
    const userId = await getUserId();
    if (!sb || !userId) return;
    await sb.from('ai_memory').upsert({
      user_id: userId,
      memory_key: key,
      memory_value: value,
      category: category || 'general',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,memory_key' });
  }

  async function insertRecommendation(category, message, actionType, payload) {
    const sb = db();
    const userId = await getUserId();
    if (!sb || !userId) return;
    await sb.from('ai_recommendations').insert({
      user_id: userId,
      category,
      message,
      action_type: actionType,
      payload: payload || {},
    });
  }

  async function insertInsight(type, message, severity) {
    const sb = db();
    const userId = await getUserId();
    if (!sb || !userId) return;
    await sb.from('ai_insights').insert({
      user_id: userId,
      insight_type: type,
      message,
      severity: severity || 'info',
    });
  }

  global.PulseFitAICoachCloud = {
    isEnabled,
    pull,
    ensureConversation,
    insertMessage,
    upsertMemory,
    insertRecommendation,
    insertInsight,
  };
})(typeof window !== 'undefined' ? window : globalThis);
