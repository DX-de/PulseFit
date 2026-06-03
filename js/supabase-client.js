(function (global) {
  'use strict';

  let client = null;

  function isConfigured() {
    const c = global.PulseFitConfig || {};
    const url = String(c.SUPABASE_URL || '').trim();
    const key = String(c.SUPABASE_ANON_KEY || '').trim();
    return Boolean(
      url && key
      && url.includes('.supabase.co')
      && !url.includes('dashboard')
      && !url.includes('VOTRE_')
      && !key.includes('VOTRE_')
      && key.startsWith('eyJ'),
    );
  }

  function configError() {
    if (!global.PulseFitConfig) {
      return 'Fichier js/config.js introuvable. Vérifiez qu’il existe et rechargez sans cache (Ctrl+Shift+R).';
    }
    const url = String(global.PulseFitConfig.SUPABASE_URL || '');
    if (url.includes('dashboard')) {
      return 'SUPABASE_URL incorrecte : utilisez https://VOTRE_REF.supabase.co (pas l’URL du dashboard).';
    }
    return 'Clés Supabase manquantes dans js/config.js (voir config.example.js).';
  }

  function getClient() {
    if (!isConfigured()) return null;
    if (!client && global.supabase) {
      client = global.supabase.createClient(
        global.PulseFitConfig.SUPABASE_URL,
        global.PulseFitConfig.SUPABASE_ANON_KEY,
      );
    }
    return client;
  }

  global.PulseFitSupabase = { getClient, isConfigured, configError };
})(typeof window !== 'undefined' ? window : globalThis);
