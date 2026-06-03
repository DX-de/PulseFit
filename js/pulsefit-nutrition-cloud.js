/**
 * PulseFit — Sync Supabase nutrition premium
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

  function profileToRow(np, userId) {
    return {
      user_id: userId,
      goal: np.goal,
      activity_level: np.activityLevel,
      bmi: np.bmi,
      bmr: np.bmr,
      tdee: np.tdee,
      target_kcal: np.targetKcal,
      protein_g: np.protein,
      carbs_g: np.carbs,
      fat_g: np.fat,
      allergies: np.allergies || [],
      preferences: np.preferences || [],
      budget: np.budget || 'medium',
      water_goal_l: np.waterGoalL || 2.5,
      updated_at: new Date().toISOString(),
    };
  }

  function rowToProfile(row) {
    if (!row) return null;
    return {
      goal: row.goal,
      goalLabel: global.PulseFitNutritionEngine?.GOALS?.[row.goal]?.label,
      activityLevel: row.activity_level,
      activityLabel: global.PulseFitNutritionEngine?.ACTIVITY?.[row.activity_level]?.label,
      bmi: row.bmi != null ? Number(row.bmi) : null,
      bmr: row.bmr != null ? Number(row.bmr) : null,
      tdee: row.tdee != null ? Number(row.tdee) : null,
      targetKcal: row.target_kcal,
      protein: row.protein_g,
      carbs: row.carbs_g,
      fat: row.fat_g,
      allergies: row.allergies || [],
      preferences: row.preferences || [],
      budget: row.budget,
      waterGoalL: Number(row.water_goal_l) || 2.5,
      updatedAt: row.updated_at,
    };
  }

  async function pull(state) {
    const sb = db();
    const userId = await getUserId();
    if (!sb || !userId) return state;

    const n = global.PulseFitNutrition.ensureNutrition(state);

    const { data: prof } = await sb.from('nutrition_profiles').select('*').eq('user_id', userId).maybeSingle();
    if (prof) {
      n.profile = rowToProfile(prof);
      n.targets = {
        kcal: prof.target_kcal,
        protein: prof.protein_g,
        carbs: prof.carbs_g,
        fat: prof.fat_g,
      };
    }

    const { data: entries } = await sb.from('nutrition_entries').select('*').eq('user_id', userId).order('log_date', { ascending: false }).limit(500);
    n.entries = {};
    (entries || []).forEach((e) => {
      if (!n.entries[e.log_date]) n.entries[e.log_date] = { breakfast: [], lunch: [], dinner: [], snack: [] };
      const item = {
        id: e.external_id || e.id,
        name: e.food_name,
        quantity: e.quantity,
        calories: e.calories,
        protein: Number(e.protein_g),
        carbs: Number(e.carbs_g),
        fat: Number(e.fat_g),
      };
      if (n.entries[e.log_date][e.meal_key]) n.entries[e.log_date][e.meal_key].push(item);
    });

    const { data: waterRows } = await sb.from('water_tracking').select('*').eq('user_id', userId);
    n.water = {};
    (waterRows || []).forEach((w) => {
      n.water[w.log_date] = { glasses: w.glasses, liters: Number(w.liters) };
    });

    const { data: weights } = await sb.from('weight_history').select('*').eq('user_id', userId).order('log_date', { ascending: false });
    n.weightHistory = (weights || []).map((w) => ({
      id: w.id,
      date: w.log_date,
      weight: Number(w.weight_kg),
      note: w.note,
    }));

    const { data: shops } = await sb.from('shopping_lists').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10);
    n.shoppingLists = (shops || []).map((s) => ({
      id: s.id,
      title: s.title,
      items: s.items || [],
      estimatedPrice: Number(s.estimated_price),
      createdAt: s.created_at,
    }));

    const { data: photos } = await sb.from('progress_photos').select('*').eq('user_id', userId);
    n.progressPhotos = { before: {}, after: {} };
    (photos || []).forEach((p) => {
      if (!n.progressPhotos[p.phase]) n.progressPhotos[p.phase] = {};
      n.progressPhotos[p.phase][p.angle] = { url: p.public_url, at: p.taken_at };
    });

    const { data: badges } = await sb.from('nutrition_achievements').select('badge_id').eq('user_id', userId);
    n.gamification.badges = (badges || []).map((b) => b.badge_id);

    const { data: aiMeals } = await sb.from('meals').select('*').eq('user_id', userId).eq('source', 'ai');
    n.aiPlans = {};
    (aiMeals || []).forEach((m) => {
      if (!n.aiPlans[m.log_date]) n.aiPlans[m.log_date] = { date: m.log_date, meals: [] };
      n.aiPlans[m.log_date].meals.push({
        mealKey: m.meal_key,
        title: m.title,
        items: m.items,
        totalKcal: m.total_kcal,
      });
    });

    Store().save(state);
    return state;
  }

  async function pushProfile(state) {
    const sb = db();
    const userId = await getUserId();
    const np = state.nutrition?.profile;
    if (!sb || !userId || !np?.targetKcal) return;
    const { error } = await sb.from('nutrition_profiles').upsert(profileToRow(np, userId), { onConflict: 'user_id' });
    if (error) throw new Error(error.message);
  }

  async function insertEntry(date, mealKey, entry) {
    const sb = db();
    const userId = await getUserId();
    if (!sb || !userId) return;
    const { data: existing } = await sb.from('nutrition_entries').select('id').eq('user_id', userId).eq('external_id', entry.id).maybeSingle();
    const row = {
      user_id: userId,
      log_date: date,
      meal_key: mealKey,
      food_name: entry.name,
      quantity: entry.quantity,
      calories: entry.calories,
      protein_g: entry.protein,
      carbs_g: entry.carbs,
      fat_g: entry.fat,
      external_id: entry.id,
    };
    if (existing) await sb.from('nutrition_entries').update(row).eq('id', existing.id);
    else await sb.from('nutrition_entries').insert(row);
  }

  async function upsertWater(date, w) {
    const sb = db();
    const userId = await getUserId();
    if (!sb || !userId) return;
    const goal = Store().load().nutrition?.profile?.waterGoalL || 2.5;
    await sb.from('water_tracking').upsert({
      user_id: userId,
      log_date: date,
      glasses: w.glasses,
      liters: w.liters,
      goal_l: goal,
    }, { onConflict: 'user_id,log_date' });
  }

  async function insertWeight(date, weightKg, note) {
    const sb = db();
    const userId = await getUserId();
    if (!sb || !userId) return;
    await sb.from('weight_history').upsert({
      user_id: userId,
      log_date: date,
      weight_kg: weightKg,
      note: note || null,
    }, { onConflict: 'user_id,log_date' });
  }

  async function insertShoppingList(list) {
    const sb = db();
    const userId = await getUserId();
    if (!sb || !userId) return;
    await sb.from('shopping_lists').insert({
      user_id: userId,
      title: list.title,
      items: list.items,
      estimated_price: list.estimatedPrice,
    });
  }

  async function uploadProgressPhoto(phase, angle, file) {
    const sb = db();
    const userId = await getUserId();
    if (!sb || !userId) throw new Error('Non connecté');
    const path = `${userId}/${phase}-${angle}.jpg`;
    const { error } = await sb.storage.from('progress-photos').upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw new Error(error.message);
    const { data } = sb.storage.from('progress-photos').getPublicUrl(path);
    const url = `${data.publicUrl}?v=${Date.now()}`;
    await sb.from('progress_photos').upsert({
      user_id: userId,
      phase,
      angle,
      storage_path: path,
      public_url: url,
    }, { onConflict: 'user_id,phase,angle' });
    return url;
  }

  async function pushAll(state) {
    if (!isEnabled()) return;
    const userId = await getUserId();
    if (!userId) return;
    await pushProfile(state);
    const n = state.nutrition;
    if (!n) return;

    for (const [date, day] of Object.entries(n.entries || {})) {
      for (const mealKey of ['breakfast', 'lunch', 'dinner', 'snack']) {
        for (const entry of day[mealKey] || []) {
          await insertEntry(date, mealKey, entry);
        }
      }
    }
    for (const [date, w] of Object.entries(n.water || {})) {
      await upsertWater(date, w);
    }
    for (const row of n.weightHistory || []) {
      await insertWeight(row.date, row.weight, row.note);
    }
  }

  global.PulseFitNutritionCloud = {
    isEnabled,
    pull,
    pushAll,
    pushProfile,
    insertEntry,
    upsertWater,
    insertWeight,
    insertShoppingList,
    uploadProgressPhoto,
  };
})(typeof window !== 'undefined' ? window : globalThis);
