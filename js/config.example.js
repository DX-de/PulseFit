/**
 * Copiez ce fichier en js/config.js et renseignez vos clés Supabase.
 * Project Settings → API → Project URL + anon public key
 */
window.PulseFitConfig = {
  SUPABASE_URL: 'https://VOTRE_PROJECT.supabase.co',
  SUPABASE_ANON_KEY: 'VOTRE_CLE_ANON_PUBLIQUE',

  /* Coach IA — provider: openai | anthropic | gemini | none */
  /* 'none' = coach local intelligent (local-ai-coach-engine.js). 'openai'|'anthropic' = API (Pro/Elite). */
  AI_PROVIDER: 'none',
  /* Dev local : npm run ai-proxy puis http://localhost:8787 */
  AI_PROXY_URL: 'http://localhost:8787',
  OPENAI_API_KEY: '',
  OPENAI_MODEL: 'gpt-4o-mini',
  OPENAI_BASE_URL: 'https://api.openai.com/v1',
  ANTHROPIC_API_KEY: '',
  ANTHROPIC_MODEL: 'claude-3-5-haiku-latest',
  GEMINI_API_KEY: '',
  GEMINI_MODEL: 'gemini-1.5-flash',
};
