/**
 * PulseFit — Coach IA local (règles · intentions · données utilisateur)
 * Mode gratuit : moteur local. Mode premium : API via ai-coach-service (hybride).
 */
(function (global) {
  'use strict';

  const Store = () => global.PulseFitStore;
  const Context = () => global.PulseFitAICoachContext;

  const INTENTS = [
    { id: 'pain', words: ['douleur', 'mal ', 'blessure', 'blessé', 'casse', 'genou', 'épaule', 'dos fait', 'tendinite', 'courbature'] },
    { id: 'stagnation', words: ['stagne', 'stagnation', 'plateau', 'bloqué', 'plus rien', 'ça bouge pas', 'inchangé'] },
    { id: 'fatigue', words: ['fatigu', 'épuis', 'crevé', 'épuisement', 'pas de force', 'nuit courte', 'mal dormi'] },
    { id: 'motivation', words: ['motiv', 'envie', 'abandon', 'décourag', 'lass', 'flemme', 'pas le courage', 'démotiv'] },
    { id: 'gym', words: ['salle', 'gym', 'musculation', 'haltère', 'barre', 'smith', 'je vais à la salle', 'à la salle'] },
    { id: 'home', words: ['maison', 'domicile', 'sans matériel', 'poids du corps', 'salon', 'chez moi'] },
    { id: 'quick_session', words: ['20 min', '30 min', '15 min', 'minute', 'rapide', 'express', 'peu de temps', 'séance courte', 'pas longtemps'] },
    { id: 'meals', words: ['que manger', 'manger ce soir', 'manger ce midi', 'petit-déjeuner', 'dîner', 'déjeuner', 'collation', 'idée repas', 'recette'] },
    { id: 'nutrition', words: ['nutrition', 'macro', 'protéine', 'glucide', 'lipide', 'alimentation', 'manger', 'repas'] },
    { id: 'calories', words: ['calorie', 'kcal', 'énergie aliment', 'trop mangé', 'déficit', 'surplus'] },
    { id: 'weight_loss', words: ['perdre', 'maigrir', 'perte de poids', 'kilos', 'gras', 'ventre', 'sèche', 'mincir'] },
    { id: 'muscle', words: ['muscle', 'masse', 'prendre du muscle', 'hypertroph', 'volume', 'grossir', 'prendre de la masse'] },
    { id: 'progress', words: ['progression', 'progresse', 'analyse', 'évolution', 'résultat', 'bilan', 'où j\'en suis', 'comment je vais'] },
    { id: 'program', words: ['programme', 'planning', 'plan ', 'organiser ma semaine', 'réorganiser', 'adapter le programme'] },
    { id: 'cheat', words: ['craqu', 'écart', 'cheat', 'trop mangé', 'binge', 'excès'] },
    { id: 'recovery', words: ['récup', 'repos', 'sommeil', 'dormir', 'off day', 'jour off'] },
  ];

  const QUICK_SUGGESTIONS = [
    { id: 'time20', label: '⚡ Je n\'ai que 20 minutes', prompt: 'Je n\'ai que 20 minutes, quelle séance faire maintenant ?' },
    { id: 'fatigue', label: '😴 Je suis fatigué aujourd\'hui', prompt: 'Je suis fatigué aujourd\'hui, adapte ma séance sans me surcharger.' },
    { id: 'dinner', label: '🍽️ Que manger ce soir ?', prompt: 'Que manger ce soir selon mes macros et mon objectif ?' },
    { id: 'gym', label: '🏋️ Je vais à la salle', prompt: 'Je vais à la salle, propose-moi une séance adaptée avec exercices et repos.' },
    { id: 'progress', label: '📊 Analyse ma progression', prompt: 'Analyse ma progression (poids, séances, nutrition) et dis-moi quoi ajuster.' },
    { id: 'motivation', label: '🔥 Motive-moi', prompt: 'Motive-moi avec des conseils personnalisés basés sur mes stats.' },
    { id: 'home', label: '🏠 Séance maison', prompt: 'Crée une séance maison adaptée à mon niveau et mon matériel.' },
    { id: 'stagnation', label: '📉 Je stagne', prompt: 'Mon poids ou ma progression stagne, que faire concrètement ?' },
  ];

  function detectIntents(text) {
    const t = (text || '').toLowerCase();
    return INTENTS
      .map((i) => ({
        id: i.id,
        score: i.words.reduce((s, w) => s + (t.includes(w) ? 1 : 0), 0),
      }))
      .filter((i) => i.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i += 1) h = ((h << 5) - h) + s.charCodeAt(i);
    return h;
  }

  function pickVariant(pool, seed, history) {
    if (!pool.length) return '';
    const recentBot = (history || [])
      .filter((m) => m.role === 'bot' || m.role === 'assistant')
      .slice(-6)
      .map((m) => (m.text || '').slice(0, 120));

    for (let i = 0; i < pool.length; i += 1) {
      const idx = Math.abs(seed + i * 7919) % pool.length;
      const candidate = typeof pool[idx] === 'function' ? pool[idx]() : pool[idx];
      const key = candidate.slice(0, 48);
      if (!recentBot.some((b) => b.includes(key))) return candidate;
    }
    const idx = Math.abs(seed) % pool.length;
    return typeof pool[idx] === 'function' ? pool[idx]() : pool[idx];
  }

  function firstName(p) {
    return p.firstName || p.name?.split?.(/\s+/)?.[0] || '';
  }

  function displayName(p) {
    const fn = firstName(p);
    return fn || 'toi';
  }

  function extractMinutes(text) {
    const m = (text || '').match(/(\d+)\s*min/);
    return m ? Math.min(60, Math.max(10, Number(m[1]))) : 20;
  }

  function mealFromText(text) {
    const t = (text || '').toLowerCase();
    if (/petit.?déjeuner|breakfast/.test(t)) return 'breakfast';
    if (/midi|déjeuner|lunch/.test(t)) return 'lunch';
    if (/collation|snack/.test(t)) return 'snack';
    return 'dinner';
  }

  function buildData(state) {
    const ctx = Context().build(state);
    const p = ctx.profile;
    const stats = ctx.stats;
    const today = Store().todayISO();
    const logs = state.sessionLogs || [];
    const totalSessions = logs.length;
    const lastJournal = (state.journal || [])
      .slice()
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
    const stagnation = analyzeStagnation(state, ctx);

    return {
      ctx,
      p,
      stats,
      today,
      firstName: displayName(p),
      weight: p.weight,
      targetWeight: p.targetWeight,
      goal: p.goal || 'Remise en forme',
      level: p.level || 'Intermédiaire',
      streak: stats.streak || state.streak?.current || 0,
      xp: stats.xp || state.gamification?.xp || 0,
      levelName: stats.level || 'Débutant',
      sessionsWeek: stats.sessionsDoneWeek || 0,
      sessionsPlanned: stats.sessionsPlannedWeek || 0,
      caloriesWeek: stats.caloriesWeek || 0,
      trainMinWeek: stats.trainMinWeek || 0,
      progressPct: stats.progressPct || 0,
      programName: ctx.program?.name || null,
      programSessions: ctx.program?.sessionsPerWeek,
      todaySession: ctx.todaySession,
      nutritionToday: ctx.nutrition?.today || { calories: 0, protein: 0, carbs: 0, fat: 0 },
      nutritionTargets: ctx.nutrition?.targets || {},
      wellness: ctx.wellness,
      daysSinceSession: ctx.daysSinceLastSession,
      weightDeltaMonth: ctx.weightDeltaMonth,
      lastJournal,
      totalSessions,
      stagnation,
      memory: state.coach?.memory || {},
      subscription: state.subscription || 'free',
    };
  }

  function analyzeStagnation(state, ctx) {
    const series = ctx.weightHistory || [];
    if (series.length < 3) return null;
    const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date));
    const delta = sorted[sorted.length - 1].value - sorted[0].value;
    if (Math.abs(delta) < 0.35 && sorted.length >= 3) {
      return { delta, weeks: 2 };
    }
    return null;
  }

  function openings(d) {
    return [
      () => `${d.firstName}, j'ai regardé ton profil PulseFit.`,
      () => `OK ${d.firstName} — voici ce que je vois dans tes données.`,
      () => `${d.firstName}, on reste concret avec tes chiffres du jour.`,
      () => `Bien reçu ${d.firstName}. Je m'appuie sur ton programme et ton journal.`,
      () => `${d.firstName}, parlons clair avec ce que tu as vraiment enregistré.`,
    ];
  }

  function fatigueBlocks(d) {
    const energy = d.wellness?.energy;
    const blocks = [
      () => {
        let s = '**Aujourd\'hui, on protège ta récupération.**\n';
        s += energy != null
          ? `Ton journal indique une énergie à **${energy}/10** — on ne force pas une séance lourde.\n`
          : 'Sans séance écrasante : l\'objectif est de bouger sans creuser le déficit.\n';
        s += '✓ **Séance légère** : 20–25 min mobilité + marche active (6–7 km/h)\n';
        s += '✓ **Alternative** : yoga flow ou vélo doux 30 min\n';
        s += '✓ **Hydratation** : vise **2,5 L** d\'eau aujourd\'hui\n';
        s += '✓ **Sommeil** : coucher avant 23h, écrans coupés 1h avant\n';
        if (d.streak >= 3) {
          s += `\nTa série de **${d.streak} jours** reste intacte avec 15 min de mouvement intentionnel — pas besoin d\'un hero workout.`;
        }
        s += `\nRappel objectif **${d.goal}** : la régularité bat l\'intensité quand tu es fatigué.`;
        return s;
      },
      () => {
        let s = `${d.firstName}, fatigue = signal, pas faiblesse.\n\n`;
        s += `**Plan du jour** :\n`;
        s += '1. Échauffement 5 min (articulations, pas de sprint)\n';
        s += '2. Circuit doux 15 min : squats au poids du corps, gainage, étirements dynamiques\n';
        s += '3. Étirements 5 min\n\n';
        s += `Poids **${d.weight} kg** → objectif **${d.targetWeight || '—'} kg**. On garde le cap sans surcharge.\n`;
        s += 'Ce soir : protéines au dîner + magnésium (légumes verts, amandes) pour le sommeil.';
        return s;
      },
    ];
    return blocks;
  }

  function gymBlocks(d) {
    const sess = d.todaySession;
    return [
      () => {
        if (sess?.exercises?.length) {
          const ex = sess.exercises.slice(0, 5).map((e) => {
            const sets = e.sets ? `${e.sets}×${e.reps || '?'}` : '';
            return `**${e.name}** ${sets}`.trim();
          });
          return `**Séance salle du jour** : ${sess.title} · **${sess.durationMin} min** · ~**${sess.calories} kcal**\n\n`
            + '**Échauffement (8 min)** : vélo ou rameur léger + mobilité épaules/hanches\n\n'
            + '**Bloc principal** :\n' + ex.map((x) => `✓ ${x}`).join('\n')
            + `\n\n**Repos** : 90–120 s sur les composés, 60 s sur l'isolation.\n`
            + '**Retour au calme** : 5 min étirements + 10 min marche légère.';
        }
        return `**Séance salle type (${d.level})** — objectif ${d.goal} :\n\n`
          + '✓ Échauffement 8 min (rameur + bandes)\n'
          + '✓ Squat ou presse : 4×8–10\n'
          + '✓ Développé ou pompes lestées : 4×8–10\n'
          + '✓ Rowing : 3×10–12\n'
          + '✓ Fentes marchées : 3×10/jambe\n'
          + '✓ Gainage : 3×45 s\n\n'
          + `Durée totale **45–50 min** · repos **90 s** entre séries lourdes.\n`
          + (d.programName ? `Programme actif : **${d.programName}**.` : 'Configure ton programme IA pour des séances encore plus ciblées.');
      },
      () => {
        return `${d.firstName}, parfait pour la salle.\n\n`
          + `Niveau **${d.level}** · **${d.sessionsWeek}/${d.sessionsPlanned}** séances cette semaine.\n\n`
          + '**Structure recommandée** :\n'
          + '• 5 min activation (fessiers, core)\n'
          + '• 35 min force (composés d\'abord)\n'
          + '• 10 min finisher cardio modéré\n'
          + '• 5 min étirements\n\n'
          + '**Focus** : qualité des reps, pas le ego lifting. '
          + (d.goal?.toLowerCase().includes('poids') ? 'Cardio finisher 8–12 min après la force.' : 'Charge progressive +2,5 kg quand tu termines toutes les reps.');
      },
    ];
  }

  function mealsBlocks(d, mealKey) {
    const t = d.nutritionTargets;
    const today = d.nutritionToday;
    const mealLabel = { breakfast: 'petit-déjeuner', lunch: 'déjeuner', dinner: 'dîner', snack: 'collation' }[mealKey] || 'repas';
    const proteinNeed = Math.max(0, (t.protein || 0) - (today.protein || 0));
    const kcalLeft = Math.max(0, (t.kcal || 0) - (today.calories || 0));

    return [
      () => {
        let s = `**${mealLabel.charAt(0).toUpperCase() + mealLabel.slice(1)}** adapté à **${d.goal}** :\n\n`;
        if (mealKey === 'dinner') {
          s += '✓ **Option A** : saumon 150 g + quinoa 80 g cuit + brocoli → ~**520 kcal**, **42 g** protéines\n';
          s += '✓ **Option B** : omelette 3 œufs + légumes + 1 tranche pain complet → ~**480 kcal**, **35 g** protéines\n';
          s += '✓ **Alternative rapide** : skyr 0 % + banane + 20 g amandes → **25 min** de prep\n';
        } else if (mealKey === 'lunch') {
          s += '✓ Poulet grillé + riz basmati + salade (portion main)\n';
          s += '✓ Ou bol complet : légumineuses + thon + avocat\n';
        } else {
          s += '✓ Protéines au petit-déjeuner (œufs, skyr) + glucides lents (flocons, fruits)\n';
        }
        s += `\n**Cibles jour** : **${t.kcal || '—'} kcal** · P **${t.protein || '—'}g** · G **${t.carbs || '—'}g** · L **${t.fat || '—'}g**\n`;
        s += `Déjà consommé aujourd'hui : **${Math.round(today.calories)} kcal**, **${Math.round(today.protein)} g** protéines.\n`;
        if (proteinNeed > 15) s += `Il te reste environ **${Math.round(proteinNeed)} g** de protéines à placer — priorise-les sur ce repas.`;
        if (kcalLeft > 0 && kcalLeft < 800) s += `\nBudget restant ~**${Math.round(kcalLeft)} kcal** — évite les extras liquides/sucrés.`;
        return s;
      },
      () => {
        return `${d.firstName}, pour ce soir avec ton objectif **${d.goal}** :\n\n`
          + `Macros cibles : **${t.kcal} kcal/j** (P **${t.protein}g**).\n\n`
          + '**Assiette simple** :\n'
          + '• 1/2 assiette légumes\n'
          + '• 1/4 protéine maigre (poulet, tofu, poisson)\n'
          + '• 1/4 féculents complexes ou lipides de qualité\n\n'
          + '**Alternative express** : wrap complet poulet-avocat + salade verte.';
      },
    ];
  }

  function motivationBlocks(d) {
    return [
      () => `**${d.firstName}**, la motivation fluctue — tes données, elles, restent.\n\n`
        + `• **${d.streak} jours** de série\n`
        + `• **${d.xp} XP** · niveau **${d.levelName}**\n`
        + `• **${d.sessionsWeek}/${d.sessionsPlanned}** séances cette semaine\n\n`
        + 'Aujourd\'hui : **une seule action** — 15 min de mouvement ou valider un repas dans Nutrition. '
        + 'C\'est suffisant pour garder l\'élan.',
      () => `${d.firstName}, tu n'as pas besoin d'être parfait, juste présent.\n\n`
        + `Progression semaine : **${d.progressPct}%**. `
        + (d.weightDeltaMonth != null
          ? `Sur 30 jours : **${d.weightDeltaMonth > 0 ? '+' : ''}${d.weightDeltaMonth.toFixed(1)} kg**. `
          : '')
        + `\n\n**Micro-objectif** : termine la prochaine séance planifiée ou note ton poids dans le journal. `
        + 'Le cerveau suit le corps quand les preuves s\'accumulent.',
    ];
  }

  function quickSessionBlocks(d, minutes) {
    return [
      () => `**Séance express ${minutes} min** (niveau **${d.level}**) :\n\n`
        + '✓ 3 min échauffement jumping jacks + rotations\n'
        + `✓ ${Math.max(8, minutes - 8)} min circuit : squats, pompes, fentes, mountain climbers (40 s effort / 20 s repos)\n`
        + '✓ 2 min gainage + étirements\n\n'
        + `~**${Math.round(minutes * 9)} kcal** estimées · parfait pour maintenir ta série (**${d.streak} j**).`,
      () => `${d.firstName}, **${minutes} minutes** suffisent :\n\n`
        + '1. Mobilité hanches 4 min\n'
        + '2. 3 tours : 12 squats + 10 pompes (genoux OK) + 30 s planche\n'
        + '3. Marche sur place 2 min cool down\n\n'
        + `Objectif **${d.goal}** : on déclenche le métabolisme sans fatigue de plus.`,
    ];
  }

  function weightLossBlocks(d) {
    return [
      () => {
        const tgt = d.targetWeight || (d.weight ? d.weight - 5 : null);
        let s = `**Perte de poids** — lecture de tes données :\n\n`;
        s += `• Poids actuel : **${d.weight} kg**${tgt ? ` → cible **${tgt} kg**` : ''}\n`;
        if (d.weightDeltaMonth != null) {
          s += `• 30 derniers jours : **${d.weightDeltaMonth > 0 ? '+' : ''}${d.weightDeltaMonth.toFixed(1)} kg**\n`;
        }
        s += `• Activité : **${d.caloriesWeek} kcal** brûlées cette semaine · **${d.trainMinWeek} min** d'entraînement\n\n`;
        s += '**Plan réaliste** :\n';
        s += '✓ Déficit modéré (~300–450 kcal/j selon ton profil)\n';
        s += `✓ **${d.sessionsPlanned || 3}–4** séances/sem. (force + cardio modéré)\n`;
        s += '✓ Protéines élevées pour préserver le muscle\n';
        s += '✓ Pas de restriction extrême — ça casse la série\n';
        if (d.stagnation) s += '\n⚠ Stagnation détectée : on ajuste les calories ou le cardio de 10 %.';
        return s;
      },
    ];
  }

  function muscleBlocks(d) {
    return [
      () => `**Prise de muscle** — profil **${d.level}** :\n\n`
        + `• Poids **${d.weight} kg** · objectif **${d.goal}**\n`
        + `• Protéines cibles : **${d.nutritionTargets.protein || '—'} g/j**\n\n`
        + '✓ Séances force 4×/sem. (composés lourds)\n'
        + '✓ Surplus calorique léger (+200–300 kcal)\n'
        + '✓ Progression charge : +2,5 % quand tu atteins les reps\n'
        + '✓ Sommeil 7 h+ (c\'est là que le muscle se construit)',
    ];
  }

  function progressBlocks(d) {
    return [
      () => `**Bilan progression** :\n\n`
        + `• Semaine : **${d.progressPct}%** · **${d.sessionsWeek}/${d.sessionsPlanned}** séances\n`
        + `• **${d.trainMinWeek} min** d'entraînement · **${d.caloriesWeek} kcal** dépensées\n`
        + `• XP : **${d.xp}** · streak **${d.streak} j**\n`
        + (d.weightDeltaMonth != null ? `• Poids (30 j) : **${d.weightDeltaMonth > 0 ? '+' : ''}${d.weightDeltaMonth.toFixed(1)} kg**\n` : '')
        + (d.lastJournal ? `• Dernier journal : ${d.lastJournal.text?.slice(0, 80) || d.lastJournal.type}\n` : '')
        + '\n**À ajuster** : '
        + (d.sessionsWeek < d.sessionsPlanned ? 'priorité aux séances manquantes. ' : '')
        + (d.nutritionToday.protein < (d.nutritionTargets.protein || 0) * 0.6 ? 'remonter les protéines aujourd\'hui. ' : 'continue sur cette lancée.'),
    ];
  }

  function stagnationBlocks(d) {
    return [
      () => `**Stagnation** — normal, mais on peut débloquer :\n\n`
        + (d.stagnation ? `Poids quasi stable (~**${d.stagnation.delta.toFixed(1)} kg** sur 2 sem.).\n` : 'Peu de variation récente sur la balance.\n')
        + '\n**Leviers** :\n'
        + '✓ +2000 pas/j pendant 10 jours\n'
        + '✓ Réduire 150 kcal/j OU ajouter 2× cardio 20 min\n'
        + '✓ Vérifier les écarts du week-end (journal nutrition)\n'
        + '✓ Changer 1 exercice clé pour relancer l\'adaptation',
    ];
  }

  function painBlocks(d) {
    return [
      () => `**Douleur / blessure** — prudence avant tout :\n\n`
        + '✓ **Pas de douleur aiguë** pendant l\'effort — stop si ça tire mal\n'
        + '✓ Séance alternative : mobilité + marche, pas de charges lourdes\n'
        + '✓ Glace 15 min zone sensible si inflammation récente\n'
        + '✓ Si ça persiste > 7 jours → avis médical / kiné\n\n'
        + 'Je note ta contrainte en mémoire pour adapter les exercices proposés.',
    ];
  }

  function programBlocks(d) {
    return [
      () => (d.programName
        ? `**Programme actif** : **${d.programName}** · **${d.programSessions}** séances/sem.\n\n`
          + '**Semaine type** :\n'
          + '• Jour 1 : Force haut du corps\n'
          + '• Jour 2 : Cardio modéré\n'
          + '• Jour 3 : Repos actif / marche\n'
          + '• Jour 4 : Force bas du corps\n'
          + '• Jour 5 : Full body ou mobilité\n\n'
          + 'Utilise l\'onglet Programme pour régénérer selon ta fatigue.'
        : 'Tu n\'as pas encore de programme IA — lance le configurateur (objectif, niveau, lieu) pour un plan complet avec séries et repos.'),
    ];
  }

  function caloriesBlocks(d) {
    const t = d.nutritionTargets;
    const today = d.nutritionToday;
    return [
      () => `**Calories aujourd'hui** :\n\n`
        + `• Objectif : **${t.kcal || '—'} kcal**\n`
        + `• Consommé (enregistré) : **${Math.round(today.calories)} kcal**\n`
        + `• Protéines : **${Math.round(today.protein)} / ${t.protein || '—'} g**\n`
        + `• Glucides : **${Math.round(today.carbs)} g** · Lipides : **${Math.round(today.fat)} g**\n\n`
        + (today.calories < (t.kcal || 0) * 0.7
          ? 'Tu es en dessous de ta cible — évite de trop sous-manger si tu t\'entraînes.'
          : 'Tu es proche ou au-dessus — priorise les aliments denses en nutriments, pas les calories vides.'),
    ];
  }

  function homeBlocks(d) {
    return [
      () => `**Séance maison** (${d.level}) :\n\n`
        + '✓ Échauffement 5 min\n'
        + '✓ 4 tours : 15 squats, 12 pompes, 20 fentes alternées, 40 s planche\n'
        + '✓ Repos 60 s entre tours\n'
        + '✓ Finisher : montées de genoux 3 min\n\n'
        + 'Matériel optionnel : bouteilles d\'eau comme haltères.',
    ];
  }

  function fitGoalBlocks(d) {
    return [
      () => `**Remise en forme** — régularité avant l'intensité :\n\n`
        + `• **${d.sessionsWeek}/${d.sessionsPlanned}** séances cette semaine · streak **${d.streak} j**\n`
        + `• Objectif : **${d.goal}** · niveau **${d.level}**\n\n`
        + '✓ 3 séances courtes (25–35 min) valent mieux qu\'une séance épuisante\n'
        + '✓ Marche 6000+ pas les jours off\n'
        + '✓ Validez vos défis quotidiens dans le dashboard (+XP)\n'
        + '✓ Célébrez chaque séance terminée — la habitude précède les résultats',
      () => `${d.firstName}, votre corps s'adapte progressivement.\n\n`
        + `Progression objectif : **${d.progressPct}%** · **${d.xp} XP**.\n\n`
        + '**Cette semaine** : une séance + un repas équilibré par jour suffisent pour relancer la dynamique. '
        + 'Le coach PulseFit suit votre poids et vos séances pour ajuster les conseils.',
    ];
  }

  function goalKeyFromProfile(d) {
    const g = (d.goal || '').toLowerCase();
    if (g.includes('poids') || g.includes('perte') || g.includes('maigrir')) return 'weight_loss';
    if (g.includes('muscle') || g.includes('masse')) return 'muscle';
    if (g.includes('performance') || g.includes('sport')) return 'performance';
    if (g.includes('remise') || g.includes('forme') || g.includes('fit')) return 'fit';
    return 'fit';
  }

  function generalBlocks(d) {
    return [
      () => `${d.firstName}, récap de ton PulseFit :\n\n`
        + `• **${d.weight} kg** · objectif **${d.goal}** · niveau **${d.level}**\n`
        + `• **${d.sessionsWeek}/${d.sessionsPlanned}** séances · **${d.streak} j** de série · **${d.xp} XP**\n`
        + (d.todaySession ? `• Séance prévue : **${d.todaySession.title}** (${d.todaySession.durationMin} min)\n` : '• Pas de séance planifiée aujourd\'hui — repos ou configuration programme\n')
        + '\nPose-moi une question précise (fatigue, repas, salle, 20 min, progression…) pour un plan détaillé.',
    ];
  }

  function buildActions(primary, d, userText, minutes, mealKey) {
    const actions = [];
    if (primary === 'fatigue' || primary === 'recovery' || primary === 'pain') {
      actions.push({ type: 'adapt_program', payload: { reason: primary } });
      actions.push({ type: 'express_session', payload: { minutes: 25 } });
    }
    if (primary === 'quick_session') {
      actions.push({ type: 'express_session', payload: { minutes } });
    }
    if (primary === 'gym') {
      actions.push({ type: 'express_session', payload: { minutes: d.todaySession?.durationMin || 45 } });
      if (!d.programName) actions.push({ type: 'generate_program_gym', payload: {} });
    }
    if (primary === 'home') {
      actions.push({ type: 'generate_program_home', payload: {} });
      actions.push({ type: 'express_session', payload: { minutes: 30 } });
    }
    if (primary === 'meals' || primary === 'nutrition') {
      actions.push({ type: 'generate_meal', payload: { meal: mealKey } });
    }
    if (primary === 'weight_loss') {
      const kg = (userText.match(/(\d+(?:[.,]\d+)?)\s*kg/) || [])[1];
      if (kg) actions.push({ type: 'save_memory', payload: { key: 'weight_goal_kg', value: kg.replace(',', '.'), category: 'goal' } });
    }
    if (primary === 'muscle') actions.push({ type: 'generate_program_gym', payload: {} });
    if (primary === 'program') actions.push({ type: 'adapt_program', payload: { reason: 'weekly_plan' } });
    if (primary === 'stagnation') actions.push({ type: 'adapt_program', payload: { reason: 'plateau' } });
    return actions;
  }

  function extractMemoryUpdates(userText) {
    const updates = [];
    const t = userText.toLowerCase();
    const kg = (userText.match(/(\d+(?:[.,]\d+)?)\s*kg/) || [])[1];
    if (kg) updates.push({ key: 'weight_goal_kg', value: kg.replace(',', '.'), category: 'goal' });
    if (/végétarien|vegetarien|vegan/i.test(t)) updates.push({ key: 'diet', value: 'végétarien', category: 'preference' });
    if (/genou|épaule|dos|cheville|bless|douleur/i.test(t)) {
      updates.push({ key: 'injury_note', value: userText.slice(0, 200), category: 'difficulty' });
    }
    if (/salle|gym/i.test(t)) updates.push({ key: 'pref_location', value: 'salle', category: 'preference' });
    if (/maison|domicile/i.test(t)) updates.push({ key: 'pref_location', value: 'maison', category: 'preference' });
    if (/fatigu/i.test(t)) updates.push({ key: 'last_state', value: 'fatigue', category: 'state' });
    return updates;
  }

  function compose(userText, state, history) {
    const d = buildData(state);
    const intents = detectIntents(userText);
    if (d.stagnation && !intents.some((i) => i.id === 'stagnation') && /poids|progress|stagne|plateau/i.test(userText)) {
      intents.unshift({ id: 'stagnation', score: 2 });
    }
    let primary = intents[0]?.id || 'general';
    const profileGoal = goalKeyFromProfile(d);

    if (primary === 'general' && profileGoal === 'fit') {
      primary = 'fit_goal';
    } else if (primary === 'general' && profileGoal === 'weight_loss' && !intents.length) {
      primary = 'weight_loss';
    } else if (primary === 'general' && profileGoal === 'muscle' && !intents.length) {
      primary = 'muscle';
    }

    if (primary === 'nutrition' && /que manger|ce soir|ce midi|petit.?déj/i.test(userText)) {
      primary = 'meals';
    }
    if (primary === 'recovery' && intents.some((i) => i.id === 'fatigue')) primary = 'fatigue';

    const minutes = extractMinutes(userText);
    const mealKey = mealFromText(userText);
    const seed = hashStr(`${userText}|${d.today}|${primary}|${history?.length || 0}`);

    const opener = pickVariant(openings(d), seed, history);
    let body = '';

    const generators = {
      fatigue: () => fatigueBlocks(d),
      gym: () => gymBlocks(d),
      home: () => homeBlocks(d),
      meals: () => mealsBlocks(d, mealKey),
      nutrition: () => mealsBlocks(d, mealKey),
      quick_session: () => quickSessionBlocks(d, minutes),
      motivation: () => motivationBlocks(d),
      weight_loss: () => weightLossBlocks(d),
      muscle: () => muscleBlocks(d),
      progress: () => progressBlocks(d),
      stagnation: () => stagnationBlocks(d),
      pain: () => painBlocks(d),
      program: () => programBlocks(d),
      calories: () => caloriesBlocks(d),
      cheat: () => [
        () => `${d.firstName}, un écart n'efface pas **${d.totalSessions}** séances de travail.\n\n`
          + '✓ Repas suivant : protéines + légumes\n'
          + '✓ 20 min de marche ce soir\n'
          + '✓ Pas de restriction extrême demain\n'
          + `On vise **${d.nutritionTargets.kcal} kcal** en moyenne, pas la perfection quotidienne.`,
      ],
      recovery: () => fatigueBlocks(d),
      fit_goal: () => fitGoalBlocks(d),
      general: () => generalBlocks(d),
    };

    const pool = (generators[primary] || generators.general)();
    body = pickVariant(pool, seed + 17, history);

    if (intents[1] && intents[1].score > 0 && intents[1].id !== primary) {
      const sec = intents[1].id;
      if (sec === 'motivation' && primary !== 'motivation') {
        body += '\n\n' + pickVariant(motivationBlocks(d), seed + 31, history).split('\n\n')[0];
      }
    }

    const memory = d.memory;
    const memLines = [];
    if (memory.injury_note) memLines.push(`📌 Je retiens : contrainte « ${memory.injury_note.slice(0, 60)}… »`);
    if (memory.weight_goal_kg) memLines.push(`📌 Objectif mémorisé : **-${memory.weight_goal_kg} kg**`);
    if (memory.pref_location) memLines.push(`📌 Lieu préféré : **${memory.pref_location}**`);
    if (memory.diet) memLines.push(`📌 Régime : **${memory.diet}**`);

    const closings = [
      '**Tu gères — une prochaine petite action suffit.**',
      '**On avance ensemble, séance par séance.**',
      '**Dis-moi si tu veux que j\'adapte ton programme automatiquement.**',
      '**Je reste dispo pour la suite.**',
    ];
    const close = pickVariant(closings, seed + 99, history);

    const text = [opener, '', body, memLines.length ? '\n' + memLines.join('\n') : '', '', close].filter(Boolean).join('\n');

    return {
      text,
      actions: buildActions(primary, d, userText, minutes, mealKey),
      provider: 'local',
      intents: intents.map((i) => i.id),
      primary,
      memoryUpdates: extractMemoryUpdates(userText),
      data: d,
    };
  }

  /** Hybride : API payante uniquement si configurée + abonnement premium */
  function shouldUseRemoteLLM(state) {
    const Providers = global.PulseFitAIProviders;
    if (!Providers?.isConfigured?.()) return false;
    const sub = state?.subscription || 'free';
    return sub === 'pro' || sub === 'elite';
  }

  global.PulseFitLocalAICoachEngine = {
    INTENTS,
    QUICK_SUGGESTIONS,
    detectIntents,
    buildData,
    compose,
    extractMemoryUpdates,
    shouldUseRemoteLLM,
  };
})(typeof window !== 'undefined' ? window : globalThis);
