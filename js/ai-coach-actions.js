/**
 * PulseFit — Actions Coach IA (programme, nutrition, mémoire)
 */
(function (global) {
  'use strict';

  const Store = () => global.PulseFitStore;

  function uid() {
    return `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  async function execute(actions, state) {
    const results = [];
    for (const action of actions || []) {
      try {
        const r = await runOne(action, state);
        if (r) results.push(r);
      } catch (e) {
        results.push({ type: action.type, error: e.message });
      }
    }
    Store().save(state);
    return results;
  }

  async function runOne(action, state) {
    const type = action.type;
    const p = action.payload || {};

    if (type === 'adapt_program' || type === 'adapt_program') {
      if (global.PulseFitProgramAI?.adapt) {
        const ad = global.PulseFitProgramAI.adapt(state);
        global.PulseFitProgramAI.applyAdaptation(state, ad);
        if (global.PulseFitProgramCloud?.pushAll) await global.PulseFitProgramCloud.pushAll(state);
        return { type, message: ad?.message || 'Programme adapté' };
      }
    }

    if (type === 'express_session') {
      const min = p.minutes || 20;
      const today = Store().todayISO();
      const sess = {
        id: uid(),
        date: today,
        dayLabel: 'Aujourd\'hui',
        title: `Express Coach ${min} min`,
        type: 'hiit',
        durationMin: min,
        calories: Math.round(min * 9),
        difficulty: 6,
        status: 'planned',
        exercises: (global.PulseFitExercises?.SESSION_TEMPLATES?.cardio?.ids || ['burpee', 'squat', 'plank'])
          .slice(0, 5)
          .map((id) => global.PulseFitExercises?.instantiate(id, state.profile?.level || 'Intermédiaire'))
          .filter(Boolean),
      };
      const idx = state.schedule.findIndex((s) => s.date === today);
      if (idx >= 0) state.schedule[idx] = sess;
      else state.schedule.push(sess);
      return { type, message: `Séance ${min} min ajoutée au planning`, sessionId: sess.id };
    }

    if (type === 'generate_meal') {
      const mealKey = p.meal || 'dinner';
      const NutriAI = global.PulseFitNutritionAI;
      const Nutri = global.PulseFitNutrition;
      if (NutriAI?.generateDayPlan && Nutri) {
        const plan = NutriAI.generateDayPlan({
          nutritionProfile: Nutri.getProfile?.() || state.nutrition?.profile,
          date: Store().todayISO(),
          prompt: p.prompt || '',
        });
        plan.date = Store().todayISO();
        Nutri.saveAiDayPlan?.(plan);
        const meal = plan.meals?.find((m) => m.mealKey === mealKey) || plan.meals?.[2];
        if (meal?.items) {
          meal.items.forEach((item) => Nutri.addFoodEntry(Store().todayISO(), mealKey, item));
        }
        return { type, message: `Repas ${mealKey} généré (~${meal?.totalKcal || plan.totalKcal} kcal)` };
      }
    }

    if (type === 'shopping_list') {
      if (global.PulseFitNutritionAI?.generateShoppingList) {
        const list = global.PulseFitNutritionAI.generateShoppingList([], state.nutrition?.profile?.budget || 'medium');
        global.PulseFitNutrition?.saveShoppingList?.(list);
        return { type, message: 'Liste de courses créée' };
      }
    }

    if (type === 'save_memory') {
      state.coach = state.coach || { conversations: [], memory: {} };
      state.coach.memory[p.key || 'note'] = p.value || p.text;
      if (global.PulseFitAICoachCloud?.upsertMemory) {
        await global.PulseFitAICoachCloud.upsertMemory(p.key, p.value || p.text, p.category);
      }
      return { type, message: 'Mémorisé' };
    }

    if (type === 'log_insight') {
      state.coach.insights = state.coach.insights || [];
      state.coach.insights.unshift({
        id: uid(),
        type: p.insight_type || 'coach',
        message: p.message,
        at: new Date().toISOString(),
      });
      if (global.PulseFitAICoachCloud?.insertInsight) {
        await global.PulseFitAICoachCloud.insertInsight(p.insight_type, p.message, p.severity);
      }
      return { type };
    }

    if (type === 'generate_program_gym') {
      if (global.PulseFitProgram?.generateProgram) {
        global.PulseFitProgram.generateProgram({
          goal: state.profile.goal,
          level: state.profile.level,
          sessions: state.program?.sessions || 4,
          duration: state.program?.duration || '45 minutes',
          equipment: 'Salle complète',
          focusZone: p.focusZone || 'Full body',
          injuries: state.program?.config?.injuries || '',
        });
        return { type, message: 'Programme salle généré' };
      }
    }

    if (type === 'generate_program_home') {
      if (global.PulseFitProgram?.generateProgram) {
        global.PulseFitProgram.generateProgram({
          goal: state.profile.goal,
          level: state.profile.level,
          sessions: state.program?.sessions || 3,
          duration: '30 minutes',
          equipment: 'Poids du corps uniquement',
          focusZone: 'Full body',
        });
        return { type, message: 'Programme maison généré' };
      }
    }

    return null;
  }

  function parseActionsFromText(text) {
    const match = text.match(/ACTIONS:\s*(\[[\s\S]*?\])\s*$/m);
    if (!match) return { cleanText: text, actions: [] };
    try {
      const actions = JSON.parse(match[1]);
      const cleanText = text.replace(match[0], '').trim();
      return { cleanText, actions };
    } catch {
      return { cleanText: text, actions: [] };
    }
  }

  global.PulseFitAICoachActions = { execute, parseActionsFromText, runOne };
})(typeof window !== 'undefined' ? window : globalThis);
