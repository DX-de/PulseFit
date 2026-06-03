/**
 * PulseFit — Pont legacy → PulseFitAICoach (ne pas ajouter de réponses statiques ici)
 */
(function (global) {
  'use strict';

  global.PulseFitAI = global.PulseFitAI || {
    reply(text, state) {
      if (global.PulseFitAICoachService && global.PulseFitAICoachContext) {
        const s = state || global.PulseFitStore?.load?.() || {};
        const history = s.coach?.conversations?.[0]?.messages || [];
        return global.PulseFitAICoachService.composeFromContext(
          text,
          global.PulseFitAICoachContext.build(s),
          s,
          history,
        );
      }
      return { text: 'Coach IA en chargement…', action: 'loading' };
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
