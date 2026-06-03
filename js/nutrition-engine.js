/**
 * PulseFit — Moteur nutritionnel (IMC, BMR, TDEE, macros)
 * Formule BMR : Mifflin-St Jeor
 */
(function (global) {
  'use strict';

  const GOALS = {
    weight_loss: { id: 'weight_loss', label: 'Perte de poids', kcalFactor: 0.82 },
    maintenance: { id: 'maintenance', label: 'Maintien', kcalFactor: 1 },
    muscle_gain: { id: 'muscle_gain', label: 'Prise de masse', kcalFactor: 1.12 },
    recomposition: { id: 'recomposition', label: 'Recomposition', kcalFactor: 0.95 },
  };

  const ACTIVITY = {
    sedentary: { id: 'sedentary', label: 'Sédentaire', factor: 1.2 },
    light: { id: 'light', label: 'Léger (1-2 séances/sem.)', factor: 1.375 },
    moderate: { id: 'moderate', label: 'Modéré (3-4 séances/sem.)', factor: 1.55 },
    active: { id: 'active', label: 'Actif (5-6 séances/sem.)', factor: 1.725 },
    athlete: { id: 'athlete', label: 'Athlète', factor: 1.9 },
  };

  function mapGoalFromProfile(goalText) {
    const g = String(goalText || '').toLowerCase();
    if (g.includes('muscle') || g.includes('masse')) return 'muscle_gain';
    if (g.includes('performance') || g.includes('recomp')) return 'recomposition';
    if (g.includes('maintien')) return 'maintenance';
    if (g.includes('poids') || g.includes('perte') || g.includes('maigrir')) return 'weight_loss';
    return 'weight_loss';
  }

  function mapActivityFromProgram(sessionsPerWeek) {
    const n = Number(sessionsPerWeek) || 3;
    if (n <= 1) return 'light';
    if (n <= 3) return 'moderate';
    if (n <= 5) return 'active';
    return 'athlete';
  }

  function bmi(weightKg, heightCm) {
    const h = Number(heightCm) / 100;
    if (!h || !weightKg) return null;
    return Math.round((Number(weightKg) / (h * h)) * 10) / 10;
  }

  function bmr(profile) {
    const w = Number(profile.weight);
    const h = Number(profile.height);
    const age = Number(profile.age) || 30;
    if (!w || !h) return null;
    const isMale = String(profile.gender || '').toLowerCase().startsWith('h');
    const base = 10 * w + 6.25 * h - 5 * age;
    return Math.round(isMale ? base + 5 : base - 161);
  }

  function tdee(bmrVal, activityLevel) {
    if (!bmrVal) return null;
    const act = ACTIVITY[activityLevel] || ACTIVITY.moderate;
    return Math.round(bmrVal * act.factor);
  }

  function targetKcal(tdeeVal, goalId) {
    if (!tdeeVal) return null;
    const g = GOALS[goalId] || GOALS.weight_loss;
    return Math.round(tdeeVal * g.kcalFactor);
  }

  function macros(kcal, goalId, weightKg) {
    const w = Number(weightKg) || 70;
    const k = Number(kcal) || 2000;
    let proteinPerKg = 1.8;
    let fatPct = 0.28;
    if (goalId === 'muscle_gain') { proteinPerKg = 2; fatPct = 0.25; }
    if (goalId === 'weight_loss') { proteinPerKg = 2.1; fatPct = 0.3; }
    if (goalId === 'recomposition') { proteinPerKg = 2.2; fatPct = 0.27; }

    const protein = Math.round(w * proteinPerKg);
    const fat = Math.round((k * fatPct) / 9);
    const carbs = Math.round((k - protein * 4 - fat * 9) / 4);
    return {
      kcal: k,
      protein: Math.max(protein, 0),
      carbs: Math.max(carbs, 0),
      fat: Math.max(fat, 0),
    };
  }

  /** Calcule le profil nutritionnel complet depuis le profil utilisateur */
  function compute(profile, options) {
    const goalId = options?.goal || mapGoalFromProfile(profile.goal);
    const activityLevel = options?.activityLevel
      || mapActivityFromProgram(options?.sessionsPerWeek || profile.sessionsPerWeek || 4);

    const bmrVal = bmr(profile);
    const tdeeVal = tdee(bmrVal, activityLevel);
    const kcal = targetKcal(tdeeVal, goalId);
    const macro = macros(kcal, goalId, profile.weight);
    const bmiVal = bmi(profile.weight, profile.height);

    return {
      goal: goalId,
      goalLabel: GOALS[goalId]?.label,
      activityLevel,
      activityLabel: ACTIVITY[activityLevel]?.label,
      bmi: bmiVal,
      bmr: bmrVal,
      tdee: tdeeVal,
      targetKcal: kcal,
      protein: macro.protein,
      carbs: macro.carbs,
      fat: macro.fat,
      allergies: options?.allergies || [],
      preferences: options?.preferences || [],
      budget: options?.budget || 'medium',
      waterGoalL: options?.waterGoalL || 2.5,
      updatedAt: new Date().toISOString(),
    };
  }

  global.PulseFitNutritionEngine = {
    GOALS,
    ACTIVITY,
    compute,
    bmi,
    bmr,
    tdee,
    targetKcal,
    macros,
    mapGoalFromProfile,
    mapActivityFromProgram,
  };
})(typeof window !== 'undefined' ? window : globalThis);
