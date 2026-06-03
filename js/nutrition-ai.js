/**
 * PulseFit — IA nutrition (génération repas + liste de courses)
 * Moteur contextuel local — branchable sur API LLM plus tard
 */
(function (global) {
  'use strict';

  const MEAL_TEMPLATES = {
    breakfast: [
      { name: 'Flocons d\'avoine', qty: '60g', calories: 220, protein: 8, carbs: 38, fat: 4 },
      { name: 'Yaourt grec 0%', qty: '150g', calories: 90, protein: 15, carbs: 6, fat: 0 },
      { name: 'Banane', qty: '1', calories: 105, protein: 1, carbs: 27, fat: 0 },
      { name: 'Oeufs brouillés', qty: '2', calories: 180, protein: 14, carbs: 2, fat: 12 },
      { name: 'Pain complet', qty: '2 tranches', calories: 160, protein: 8, carbs: 28, fat: 2 },
    ],
    lunch: [
      { name: 'Poulet grillé', qty: '150g', calories: 248, protein: 46, carbs: 0, fat: 5 },
      { name: 'Riz complet', qty: '150g cuit', calories: 165, protein: 4, carbs: 35, fat: 1 },
      { name: 'Brocolis', qty: '200g', calories: 70, protein: 6, carbs: 12, fat: 1 },
      { name: 'Saumon', qty: '140g', calories: 280, protein: 34, carbs: 0, fat: 16 },
      { name: 'Quinoa', qty: '150g', calories: 180, protein: 7, carbs: 32, fat: 3 },
    ],
    dinner: [
      { name: 'Cabillaud', qty: '160g', calories: 150, protein: 32, carbs: 0, fat: 2 },
      { name: 'Patate douce', qty: '200g', calories: 180, protein: 4, carbs: 41, fat: 0 },
      { name: 'Salade verte', qty: '1 bol', calories: 40, protein: 2, carbs: 6, fat: 1 },
      { name: 'Boeuf maigre', qty: '120g', calories: 200, protein: 28, carbs: 0, fat: 9 },
      { name: 'Légumes vapeur', qty: '250g', calories: 80, protein: 4, carbs: 14, fat: 1 },
    ],
    snack: [
      { name: 'Fromage blanc', qty: '150g', calories: 98, protein: 17, carbs: 6, fat: 0 },
      { name: 'Amandes', qty: '25g', calories: 145, protein: 5, carbs: 5, fat: 12 },
      { name: 'Pomme', qty: '1', calories: 95, protein: 0, carbs: 25, fat: 0 },
      { name: 'Shake whey', qty: '30g', calories: 120, protein: 24, carbs: 3, fat: 1 },
    ],
  };

  const PRICE = { low: 0.85, medium: 1, high: 1.25 };

  function filterAllergies(items, allergies) {
    const a = (allergies || []).map((x) => x.toLowerCase());
    if (!a.length) return items;
    return items.filter((it) => !a.some((al) => it.name.toLowerCase().includes(al)));
  }

  function pickMeal(mealKey, targetKcal, allergies, preferences) {
    let pool = [...(MEAL_TEMPLATES[mealKey] || MEAL_TEMPLATES.snack)];
    pool = filterAllergies(pool, allergies);
    if (preferences?.includes('vegetarien')) {
      pool = pool.filter((i) => !/poulet|boeuf|saumon|cabillaud|oeuf/i.test(i.name));
    }
    const share = { breakfast: 0.25, lunch: 0.35, dinner: 0.3, snack: 0.1 }[mealKey] || 0.25;
    const budget = Math.round(targetKcal * share);
    const picked = [];
    let total = 0;
    const shuffled = pool.sort(() => Math.random() - 0.5);
    for (const item of shuffled) {
      if (total + item.calories <= budget + 80 || !picked.length) {
        picked.push({ ...item, id: `ai-${mealKey}-${picked.length}` });
        total += item.calories;
      }
      if (total >= budget - 40) break;
    }
    return { mealKey, items: picked, totalKcal: total, title: picked.map((i) => i.name).join(' · ') };
  }

  function parseKcalFromPrompt(text) {
    const m = String(text).match(/(\d{3,4})\s*k?cal/i);
    return m ? Number(m[1]) : null;
  }

  function generateDayPlan(ctx) {
    const np = ctx.nutritionProfile || {};
    const kcal = parseKcalFromPrompt(ctx.prompt) || np.targetKcal || 2000;
    const allergies = np.allergies || [];
    const preferences = np.preferences || [];

    const meals = ['breakfast', 'lunch', 'dinner', 'snack'].map((key) =>
      pickMeal(key, kcal, allergies, preferences));

    const totalKcal = meals.reduce((a, m) => a + m.totalKcal, 0);
    const summary = `Journée ${kcal} kcal générée pour ${GOAL_LABEL(np.goal)} — total ~${totalKcal} kcal.`;

    return {
      date: ctx.date,
      meals,
      totalKcal,
      summary,
      prompt: ctx.prompt || '',
    };
  }

  function GOAL_LABEL(id) {
    return ({ weight_loss: 'perte de poids', maintenance: 'maintien', muscle_gain: 'prise de masse', recomposition: 'recomposition' })[id] || 'votre objectif';
  }

  function generateShoppingList(weekMeals, budgetLevel) {
    const agg = {};
    (weekMeals || []).forEach((day) => {
      (day.meals || []).forEach((meal) => {
        (meal.items || []).forEach((item) => {
          const key = item.name;
          if (!agg[key]) agg[key] = { name: key, quantity: item.qty, count: 1, unitPrice: 2.5 + Math.random() * 4 };
          else agg[key].count += 1;
        });
      });
    });

    const mult = PRICE[budgetLevel] || 1;
    const items = Object.values(agg).map((row, i) => ({
      id: `shop-${i}`,
      name: row.name,
      quantity: row.count > 1 ? `${row.count}× ${row.quantity}` : row.quantity,
      price: Math.round(row.unitPrice * row.count * mult * 100) / 100,
    }));

    const estimatedPrice = Math.round(items.reduce((a, i) => a + i.price, 0) * 100) / 100;

    return {
      title: 'Liste de courses — semaine PulseFit',
      items,
      estimatedPrice,
      createdAt: new Date().toISOString(),
    };
  }

  global.PulseFitNutritionAI = {
    generateDayPlan,
    generateShoppingList,
    pickMeal,
  };
})(typeof window !== 'undefined' ? window : globalThis);
