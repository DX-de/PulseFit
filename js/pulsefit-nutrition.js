/**
 * PulseFit — Store nutrition premium (local + sync cloud)
 */
(function (global) {
  'use strict';

  const Store = () => global.PulseFitStore;
  const Engine = () => global.PulseFitNutritionEngine;
  const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'];
  const MEAL_LABELS = { breakfast: 'Petit-déjeuner', lunch: 'Déjeuner', dinner: 'Dîner', snack: 'Collation' };

  /** Base aliments locale (recherche + futur scan code-barres) */
  const FOOD_DATABASE = [
    { id: 'chicken-breast', name: 'Poulet grillé', per100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6 }, barcode: null },
    { id: 'rice-white', name: 'Riz blanc cuit', per100g: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 }, barcode: null },
    { id: 'egg', name: 'Œuf', per100g: { calories: 155, protein: 13, carbs: 1.1, fat: 11 }, barcode: null },
    { id: 'banana', name: 'Banane', per100g: { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 }, barcode: '4011124034441' },
    { id: 'oats', name: 'Flocons d\'avoine', per100g: { calories: 389, protein: 17, carbs: 66, fat: 7 }, barcode: null },
    { id: 'salmon', name: 'Saumon', per100g: { calories: 208, protein: 20, carbs: 0, fat: 13 }, barcode: null },
    { id: 'greek-yogurt', name: 'Yaourt grec 0%', per100g: { calories: 59, protein: 10, carbs: 3.6, fat: 0.4 }, barcode: null },
    { id: 'broccoli', name: 'Brocoli', per100g: { calories: 34, protein: 2.8, carbs: 7, fat: 0.4 }, barcode: null },
  ];

  const NUTRITION_BADGES = [
    { id: 'nutri_first_log', name: 'Premier repas logué', icon: '🥗' },
    { id: 'nutri_streak_7', name: '7 jours nutrition', icon: '🏆' },
    { id: 'nutri_streak_30', name: '30 jours nutrition', icon: '🏆' },
    { id: 'nutri_goal_hit', name: 'Objectif calories', icon: '🎯' },
    { id: 'nutri_water_week', name: 'Hydratation 7j', icon: '💧' },
    { id: 'nutri_weight_5kg', name: 'Perte de 5 kg', icon: '⚖️' },
  ];

  function uid() {
    return `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function today() {
    return Store().todayISO();
  }

  function defaultNutritionBlock() {
    return {
      targets: { kcal: 2180, protein: 170, carbs: 260, fat: 75 },
      days: {},
      profile: null,
      entries: {},
      aiPlans: {},
      water: {},
      shoppingLists: [],
      weightHistory: [],
      progressPhotos: { before: {}, after: {} },
      gamification: { xp: 0, streak: 0, longest: 0, lastDate: null, badges: [] },
    };
  }

  function ensureNutrition(state) {
    if (!state.nutrition || typeof state.nutrition !== 'object') state.nutrition = defaultNutritionBlock();
    const n = state.nutrition;
    if (!n.entries) n.entries = {};
    if (!n.water) n.water = {};
    if (!n.aiPlans) n.aiPlans = {};
    if (!n.shoppingLists) n.shoppingLists = [];
    if (!n.weightHistory) n.weightHistory = [];
    if (!n.progressPhotos) n.progressPhotos = { before: {}, after: {} };
    if (!n.gamification) n.gamification = { xp: 0, streak: 0, longest: 0, lastDate: null, badges: [] };
    if (!n.targets) n.targets = { kcal: 2180, protein: 170, carbs: 260, fat: 75 };
    if (!n.days) n.days = {};
    return n;
  }

  function syncTargetsFromProfile(state, np) {
    if (!np) return;
    state.nutrition.targets = {
      kcal: np.targetKcal || state.nutrition.targets.kcal,
      protein: np.protein || state.nutrition.targets.protein,
      carbs: np.carbs || state.nutrition.targets.carbs,
      fat: np.fat || state.nutrition.targets.fat,
    };
  }

  function recalculateProfile(options) {
    const state = Store().load();
    const n = ensureNutrition(state);
    const program = state.program;
    const computed = Engine().compute(state.profile, {
      goal: options?.goal,
      activityLevel: options?.activityLevel,
      sessionsPerWeek: program?.sessions,
      allergies: options?.allergies ?? n.profile?.allergies,
      preferences: options?.preferences ?? n.profile?.preferences,
      budget: options?.budget ?? n.profile?.budget,
      waterGoalL: options?.waterGoalL ?? n.profile?.waterGoalL,
    });
    n.profile = { ...computed, ...(options || {}) };
    syncTargetsFromProfile(state, n.profile);
    Store().save(state);
    scheduleSync();
    return n.profile;
  }

  function getProfile() {
    const state = Store().load();
    const n = ensureNutrition(state);
    if (!n.profile?.targetKcal) return recalculateProfile();
    return n.profile;
  }

  function getDayEntries(date) {
    const state = Store().load();
    const n = ensureNutrition(state);
    if (!n.entries[date]) {
      n.entries[date] = { breakfast: [], lunch: [], dinner: [], snack: [] };
      Store().save(state);
    }
    return n.entries[date];
  }

  function addFoodEntry(date, mealKey, food) {
    const state = Store().load();
    const n = ensureNutrition(state);
    const d = date || today();
    const day = getDayEntries(d);
    const entry = {
      id: food.id || uid(),
      name: food.name,
      quantity: food.quantity || '1 portion',
      calories: Number(food.calories) || 0,
      protein: Number(food.protein) || 0,
      carbs: Number(food.carbs) || 0,
      fat: Number(food.fat) || 0,
    };
    if (!MEALS.includes(mealKey)) mealKey = 'snack';
    day[mealKey].push(entry);
    n.entries[d] = day;
    updateNutritionStreak(state);
    addNutritionXp(state, 15);
    checkNutritionBadges(state);
    Store().save(state);
    scheduleSync();
    if (global.PulseFitNutritionCloud?.isEnabled?.()) {
      global.PulseFitNutritionCloud.insertEntry(d, mealKey, entry).catch(console.warn);
    }
    return entry;
  }

  function removeFoodEntry(date, entryId) {
    const state = Store().load();
    const n = ensureNutrition(state);
    const day = n.entries[date];
    if (!day) return;
    MEALS.forEach((k) => {
      day[k] = (day[k] || []).filter((e) => e.id !== entryId);
    });
    Store().save(state);
    scheduleSync();
  }

  function getDayTotals(date) {
    const day = getDayEntries(date || today());
    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    MEALS.forEach((k) => {
      (day[k] || []).forEach((e) => {
        totals.calories += e.calories;
        totals.protein += e.protein;
        totals.carbs += e.carbs;
        totals.fat += e.fat;
      });
    });
    return totals;
  }

  function getWater(date) {
    const n = ensureNutrition(Store().load());
    const d = date || today();
    if (!n.water[d]) n.water[d] = { glasses: 0, liters: 0 };
    return n.water[d];
  }

  function addWaterGlass(date) {
    const state = Store().load();
    const n = ensureNutrition(state);
    const d = date || today();
    const w = getWater(d);
    w.glasses += 1;
    w.liters = Math.round((w.glasses * 0.25) * 10) / 10;
    n.water[d] = w;
    addNutritionXp(state, 5);
    Store().save(state);
    scheduleSync();
    if (global.PulseFitNutritionCloud?.isEnabled?.()) {
      global.PulseFitNutritionCloud.upsertWater(d, w).catch(console.warn);
    }
    return w;
  }

  function setWaterGoal(liters) {
    const state = Store().load();
    const n = ensureNutrition(state);
    if (!n.profile) recalculateProfile();
    n.profile.waterGoalL = Number(liters) || 2.5;
    Store().save(state);
    scheduleSync();
    return n.profile.waterGoalL;
  }

  function addWeightEntry(weightKg, date, note) {
    const state = Store().load();
    const n = ensureNutrition(state);
    const d = date || today();
    const w = Number(weightKg);
    if (!w) return null;
    const row = { id: uid(), date: d, weight: w, note: note || '' };
    n.weightHistory = [row, ...n.weightHistory.filter((x) => x.date !== d)];
    state.profile.weight = w;
    state.journal.unshift({
      id: uid(), date: d, type: 'weight', value: w, text: `Poids : ${w} kg`,
    });
    checkNutritionBadges(state);
    Store().save(state);
    scheduleSync();
    if (global.PulseFitNutritionCloud?.isEnabled?.()) {
      global.PulseFitNutritionCloud.insertWeight(d, w, note).catch(console.warn);
      global.PulseFitCloud?.pushProfile?.(state).catch(console.warn);
    }
    return row;
  }

  function getWeightSeries(days) {
    const n = ensureNutrition(Store().load());
    const state = Store().load();
    const fromJournal = (state.journal || [])
      .filter((j) => j.type === 'weight' && j.value != null)
      .map((j) => ({ date: j.date, weight: Number(j.value) }));
    const merged = [...n.weightHistory.map((w) => ({ date: w.date, weight: w.weight })), ...fromJournal];
    const byDate = {};
    merged.forEach((r) => { byDate[r.date] = r.weight; });
    const sorted = Object.keys(byDate).sort().map((date) => ({ date, weight: byDate[date] }));
    if (!days) return sorted;
    const cut = Store().addDays(today(), -days);
    return sorted.filter((r) => r.date >= cut);
  }

  function saveAiDayPlan(plan) {
    const state = Store().load();
    const n = ensureNutrition(state);
    const d = plan.date || today();
    n.aiPlans[d] = plan;
    Store().save(state);
    scheduleSync();
    return plan;
  }

  function saveShoppingList(list) {
    const state = Store().load();
    const n = ensureNutrition(state);
    n.shoppingLists.unshift({ ...list, id: list.id || uid() });
    Store().save(state);
    scheduleSync();
    if (global.PulseFitNutritionCloud?.isEnabled?.()) {
      global.PulseFitNutritionCloud.insertShoppingList(list).catch(console.warn);
    }
    return n.shoppingLists[0];
  }

  function setProgressPhoto(phase, angle, url) {
    const state = Store().load();
    const n = ensureNutrition(state);
    if (!n.progressPhotos[phase]) n.progressPhotos[phase] = {};
    n.progressPhotos[phase][angle] = { url, at: new Date().toISOString() };
    Store().save(state);
    scheduleSync();
    return n.progressPhotos[phase][angle];
  }

  async function uploadProgressPhoto(phase, angle, file) {
    if (global.PulseFitNutritionCloud?.isEnabled?.()) {
      const url = await global.PulseFitNutritionCloud.uploadProgressPhoto(phase, angle, file);
      return setProgressPhoto(phase, angle, url);
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(setProgressPhoto(phase, angle, reader.result));
      reader.onerror = () => reject(new Error('Lecture image impossible'));
      reader.readAsDataURL(file);
    });
  }

  function updateNutritionStreak(state) {
    const n = ensureNutrition(state);
    const g = n.gamification;
    const d = today();
    if (g.lastDate === d) return;
    if (g.lastDate === Store().addDays(d, -1)) g.streak += 1;
    else g.streak = 1;
    g.lastDate = d;
    if (g.streak > (g.longest || 0)) g.longest = g.streak;
  }

  function addNutritionXp(state, amount) {
    const g = ensureNutrition(state).gamification;
    g.xp = (g.xp || 0) + amount;
    state.gamification.xp = (state.gamification.xp || 0) + Math.floor(amount / 2);
  }

  function awardBadge(state, id) {
    const g = ensureNutrition(state).gamification;
    if (!g.badges.includes(id)) g.badges.push(id);
  }

  function checkNutritionBadges(state) {
    const n = ensureNutrition(state);
    const g = n.gamification;
    const totals = getDayTotals();
    const targets = n.targets;
    const hasEntry = MEALS.some((k) => (n.entries[today()]?.[k] || []).length);
    if (hasEntry) awardBadge(state, 'nutri_first_log');
    if (g.streak >= 7) awardBadge(state, 'nutri_streak_7');
    if (g.streak >= 30) awardBadge(state, 'nutri_streak_30');
    if (totals.calories >= targets.kcal * 0.9 && totals.calories <= targets.kcal * 1.05) {
      awardBadge(state, 'nutri_goal_hit');
    }
    const start = state.profile.startWeight || state.profile.weight;
    if (start - state.profile.weight >= 5) awardBadge(state, 'nutri_weight_5kg');
    const w = getWater();
    const goal = n.profile?.waterGoalL || 2.5;
    if (w.liters >= goal) awardBadge(state, 'nutri_water_week');
    Store().save(state);
  }

  function scheduleSync() {
    if (global.PulseFitNutritionCloud?.isEnabled?.()) {
      clearTimeout(scheduleSync._t);
      scheduleSync._t = setTimeout(() => {
        global.PulseFitNutritionCloud.pushAll(Store().load()).catch(console.warn);
      }, 600);
    }
  }

  function searchFoods(query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return FOOD_DATABASE.slice(0, 12);
    return FOOD_DATABASE.filter((f) => f.name.toLowerCase().includes(q) || (f.barcode && f.barcode.includes(q)));
  }

  /** Préparation scanner code-barres — brancher getUserMedia + API Open Food Facts */
  function lookupBarcode(code) {
    const found = FOOD_DATABASE.find((f) => f.barcode === code);
    if (found) return { found: true, food: found, source: 'local' };
    return {
      found: false,
      food: null,
      source: 'pending',
      message: 'Code non trouvé en local. Connectez Open Food Facts pour la production.',
    };
  }

  function addFoodFromDatabase(date, mealKey, foodId, grams) {
    const food = FOOD_DATABASE.find((f) => f.id === foodId);
    if (!food) return null;
    const g = Math.max(1, Number(grams) || 100);
    const ratio = g / 100;
    return addFoodEntry(date, mealKey, {
      name: food.name,
      quantity: `${g}g`,
      calories: Math.round(food.per100g.calories * ratio),
      protein: Math.round(food.per100g.protein * ratio * 10) / 10,
      carbs: Math.round(food.per100g.carbs * ratio * 10) / 10,
      fat: Math.round(food.per100g.fat * ratio * 10) / 10,
    });
  }

  function applyAiPlanToJournal(plan) {
    const d = plan.date || today();
    (plan.meals || []).forEach((meal) => {
      (meal.items || []).forEach((item) => {
        addFoodEntry(d, meal.mealKey, item);
      });
    });
  }

  global.PulseFitNutrition = {
    MEALS,
    MEAL_LABELS,
    NUTRITION_BADGES,
    defaultNutritionBlock,
    ensureNutrition,
    recalculateProfile,
    getProfile,
    getDayEntries,
    addFoodEntry,
    removeFoodEntry,
    getDayTotals,
    getWater,
    addWaterGlass,
    setWaterGoal,
    addWeightEntry,
    getWeightSeries,
    saveAiDayPlan,
    saveShoppingList,
    setProgressPhoto,
    uploadProgressPhoto,
    checkNutritionBadges,
    applyAiPlanToJournal,
    getTargets: () => ensureNutrition(Store().load()).targets,
    FOOD_DATABASE,
    searchFoods,
    lookupBarcode,
    addFoodFromDatabase,
  };
})(typeof window !== 'undefined' ? window : globalThis);
