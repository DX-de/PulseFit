/**
 * PulseFit — Auth Supabase (données réelles, pas de mode démo)
 */
(function (global) {
  'use strict';

  const AUTH_FLAG = 'pulsefit-authed';
  const LEGACY_DEMO_KEYS = ['pulsefit-demo', 'pulsefit-demo-user'];

  function clearLegacyDemo() {
    LEGACY_DEMO_KEYS.forEach((k) => {
      try {
        sessionStorage.removeItem(k);
        localStorage.removeItem(k);
      } catch (_) { /* ignore */ }
    });
  }

  function sb() {
    return global.PulseFitSupabase?.getClient?.();
  }

  function isConfigured() {
    return global.PulseFitSupabase?.isConfigured?.();
  }

  /** Conservé pour compatibilité — toujours false */
  function isDemoMode() {
    return false;
  }

  async function getSession() {
    const client = sb();
    if (!client) return null;
    const { data: { session } } = await client.auth.getSession();
    return session;
  }

  async function isAuthed() {
    const session = await getSession();
    return Boolean(session?.user);
  }

  function isAuthedSync() {
    return sessionStorage.getItem(AUTH_FLAG) === '1';
  }

  function getUser() {
    try {
      return JSON.parse(sessionStorage.getItem('pulsefit-user') || 'null');
    } catch {
      return null;
    }
  }

  function cacheUser(user) {
    sessionStorage.setItem('pulsefit-user', JSON.stringify(user));
    sessionStorage.setItem(AUTH_FLAG, '1');
    clearLegacyDemo();
  }

  async function initSession() {
    const client = sb();
    if (!client) return false;
    const { data: { session } } = await client.auth.getSession();
    if (session?.user) {
      cacheUser({
        email: session.user.email,
        id: session.user.id,
        firstName: session.user.user_metadata?.first_name,
        lastName: session.user.user_metadata?.last_name,
      });
      return true;
    }
    sessionStorage.removeItem(AUTH_FLAG);
    sessionStorage.removeItem('pulsefit-user');
    return false;
  }

  async function register({ email, password, firstName, lastName }) {
    if (!isConfigured()) {
      const detail = global.PulseFitSupabase?.configError?.() || 'Copiez js/config.example.js vers js/config.js';
      return { ok: false, error: detail };
    }
    if (!global.supabase) {
      return { ok: false, error: 'Bibliothèque Supabase non chargée. Vérifiez votre connexion ou désactivez le bloqueur de scripts.' };
    }
    const client = sb();
    const em = email.trim().toLowerCase();
    const { data, error } = await client.auth.signUp({
      email: em,
      password,
      options: { data: { first_name: firstName, last_name: lastName } },
    });
    if (error) return { ok: false, error: error.message };
    if (data.user) {
      cacheUser({ email: em, id: data.user.id, firstName, lastName });
      await global.PulseFitStore?.updateProfile?.({ firstName, lastName, name: `${firstName} ${lastName}`.trim() });
    }
    return { ok: true, user: getUser(), needsEmailConfirm: !data.session };
  }

  async function login(email, password) {
    const em = email.trim().toLowerCase();

    if (em === 'demo@pulsefit.app') {
      return {
        ok: false,
        error: 'Le mode démo est désactivé. Créez un compte ou connectez-vous avec votre email.',
      };
    }

    if (!isConfigured()) {
      return { ok: false, error: 'Configurez Supabase dans js/config.js pour vous connecter.' };
    }

    const client = sb();
    const { data, error } = await client.auth.signInWithPassword({ email: em, password });
    if (error) return { ok: false, error: error.message };
    cacheUser({
      email: data.user.email,
      id: data.user.id,
      firstName: data.user.user_metadata?.first_name,
      lastName: data.user.user_metadata?.last_name,
    });
    return { ok: true, user: getUser() };
  }

  async function loginWithProvider(provider) {
    if (!isConfigured()) {
      return { ok: false, error: 'Configurez Supabase dans js/config.js pour la connexion sociale.' };
    }
    const client = sb();
    const { error } = await client.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/dashboard/` },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, redirect: true };
  }

  async function forgotPassword(email) {
    if (!isConfigured()) {
      return { ok: false, error: 'Supabase non configuré' };
    }
    const client = sb();
    const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${location.origin}/login/`,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, message: 'Email de réinitialisation envoyé. Vérifiez votre boîte mail.' };
  }

  async function logout() {
    clearLegacyDemo();
    sessionStorage.removeItem(AUTH_FLAG);
    sessionStorage.removeItem('pulsefit-user');
    const client = sb();
    if (client) await client.auth.signOut();
  }

  function requireAuth(redirectTo, returnPath) {
    if (isAuthedSync()) return true;
    initSession().then((ok) => {
      if (ok) return;
      const base = redirectTo || '../login/';
      location.href = returnPath ? `${base}?next=${encodeURIComponent(returnPath)}` : base;
    });
    if (!isAuthedSync()) {
      const base = redirectTo || '../login/';
      location.href = returnPath ? `${base}?next=${encodeURIComponent(returnPath)}` : base;
      return false;
    }
    return true;
  }

  async function requireAuthAsync(redirectTo, returnPath) {
    const ok = await isAuthed() || await initSession();
    if (ok) return true;
    const base = redirectTo || '../login/';
    location.href = returnPath ? `${base}?next=${encodeURIComponent(returnPath)}` : base;
    return false;
  }

  function isAdmin() {
    const u = getUser();
    return u?.email === 'admin@pulsefit.app';
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validatePassword(pw) {
    return String(pw).length >= 6;
  }

  clearLegacyDemo();

  global.PulseFitAuth = {
    isAuthed: isAuthedSync,
    isAuthedAsync: isAuthed,
    getUser,
    register,
    login,
    loginWithProvider,
    forgotPassword,
    logout,
    requireAuth,
    requireAuthAsync,
    initSession,
    isAdmin,
    isDemoMode,
    isConfigured,
    validateEmail,
    validatePassword,
    getSession,
    clearLegacyDemo,
  };
})(typeof window !== 'undefined' ? window : globalThis);
