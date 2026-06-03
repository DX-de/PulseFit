/**
 * PulseFit — Couche providers IA (proxy Supabase / local → évite CORS)
 */
(function (global) {
  'use strict';

  function getConfig() {
    const c = global.PulseFitConfig || {};
    return {
      provider: (c.AI_PROVIDER || 'openai').toLowerCase(),
      supabaseUrl: (c.SUPABASE_URL || '').replace(/\/$/, ''),
      supabaseAnon: c.SUPABASE_ANON_KEY || '',
      proxyUrl: (c.AI_PROXY_URL || '').replace(/\/$/, ''),
      openaiKey: c.OPENAI_API_KEY || c.AI_API_KEY || '',
      openaiModel: c.OPENAI_MODEL || 'gpt-4o-mini',
      openaiBase: c.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      anthropicKey: c.ANTHROPIC_API_KEY || '',
      anthropicModel: c.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest',
      geminiKey: c.GEMINI_API_KEY || '',
      geminiModel: c.GEMINI_MODEL || 'gemini-1.5-flash',
    };
  }

  function proxyEndpoints(c) {
    if (c.proxyUrl) return [c.proxyUrl];
    if (c.supabaseUrl) return [`${c.supabaseUrl}/functions/v1/ai-chat`];
    return [];
  }

  function isConfigured() {
    const c = getConfig();
    if (c.provider === 'none') return false;
    if (proxyEndpoints(c).length) return true;
    if (c.provider === 'anthropic') return !!c.anthropicKey;
    if (c.provider === 'gemini') return !!c.geminiKey;
    return !!c.openaiKey;
  }

  async function getAuthToken(c) {
    const sb = global.PulseFitSupabase?.getClient?.();
    if (sb) {
      const { data } = await sb.auth.getSession();
      if (data.session?.access_token) return data.session.access_token;
    }
    return c.supabaseAnon;
  }

  async function proxyChat(provider, messages, system) {
    const c = getConfig();
    const endpoints = proxyEndpoints(c);
    if (!endpoints.length) throw new Error('Aucun proxy IA (AI_PROXY_URL ou SUPABASE_URL)');

    const token = await getAuthToken(c);
    const payload = {
      provider,
      system,
      messages,
      model: provider === 'anthropic' ? c.anthropicModel
        : provider === 'openai' ? c.openaiModel
          : c.geminiModel,
    };

    let lastErr;
    for (const url of endpoints) {
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (url.includes('.supabase.co/functions/')) {
          headers.Authorization = `Bearer ${token}`;
          headers.apikey = c.supabaseAnon;
        }
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          lastErr = new Error(data.error || `Proxy ${res.status} (${url})`);
          continue;
        }
        if (data.text) return data.text;
        lastErr = new Error('Réponse proxy vide');
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('Proxy IA indisponible');
  }

  async function geminiChatDirect(messages, system) {
    const c = getConfig();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${c.geminiModel}:generateContent?key=${c.geminiKey}`;
    const contents = [
      { role: 'user', parts: [{ text: system }] },
      ...messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    ];
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, generationConfig: { temperature: 0.7, maxOutputTokens: 1200 } }),
    });
    if (!res.ok) throw new Error(`Gemini: ${res.status}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  }

  async function complete({ system, messages }) {
    const c = getConfig();
    const msgs = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.text || m.content }));

    const provider = c.provider === 'none' ? 'anthropic' : c.provider;

    if (proxyEndpoints(c).length && provider !== 'none') {
      return proxyChat(provider, msgs, system);
    }

    if (provider === 'gemini' && c.geminiKey) {
      return geminiChatDirect(msgs, system);
    }

    throw new Error(
      'Configurez AI_PROXY_URL (npm run ai-proxy) ou déployez supabase/functions/ai-chat avec les secrets API.',
    );
  }

  global.PulseFitAIProviders = {
    getConfig,
    isConfigured,
    complete,
    proxyChat,
  };
})(typeof window !== 'undefined' ? window : globalThis);
