/**
 * PulseFit — Génération de programmes sportifs
 */
(function (global) {
  'use strict';

  const Ex = () => global.PulseFitExercises;
  const GOALS = {
    'Perte de poids': 'weight',
    'Prise de masse': 'muscle',
    'Remise en forme': 'fit',
    'Endurance': 'cardio',
    'Force': 'strength',
    'Athlétique': 'athletic',
    'Performance sportive': 'athletic',
  };

  const WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  function goalKey(goal) {
    return GOALS[goal] || 'fit';
  }

  function sessionsPerWeek(n) {
    const v = parseInt(String(n), 10);
    return Math.min(6, Math.max(2, Number.isNaN(v) ? 3 : v));
  }

  function durationMin(label) {
    const m = String(label || '').match(/(\d+)/);
    return m ? Number(m[1]) : 45;
  }

  function pickTemplates(gk, perWeek, focusZone) {
    const T = Ex().SESSION_TEMPLATES;
    const pools = {
      weight: ['cardio', 'full', 'upper', 'cardio', 'lower', 'full', 'core'],
      muscle: ['push', 'lower', 'pull', 'upper', 'lower', 'full', 'core'],
      cardio: ['cardio', 'full', 'cardio', 'athletic', 'cardio', 'full', 'core'],
      strength: ['push', 'pull', 'lower', 'full', 'push', 'pull', 'core'],
      athletic: ['athletic', 'full', 'cardio', 'athletic', 'lower', 'full', 'core'],
      fit: ['full', 'cardio', 'upper', 'full', 'lower', 'cardio', 'core'],
    };
    let pool = pools[gk] || pools.fit;
    if (focusZone === 'Haut du corps') pool = pool.map((_, i) => (i % 2 === 0 ? 'upper' : 'cardio'));
    if (focusZone === 'Bas du corps') pool = pool.map((_, i) => (i % 2 === 0 ? 'lower' : 'core'));
    if (focusZone === 'Core') pool = pool.map(() => 'core');
    const offsets = perWeek === 2 ? [1, 4] : perWeek === 3 ? [1, 3, 5] : perWeek === 4 ? [1, 2, 4, 6] : perWeek === 5 ? [1, 2, 3, 5, 6] : [1, 2, 3, 4, 5, 6];
    return offsets.slice(0, perWeek).map((dow, i) => ({ dow, key: pool[i % pool.length] }));
  }

  function buildExercises(templateKey, level, injuries, equipment) {
    const tpl = Ex().SESSION_TEMPLATES[templateKey];
    if (!tpl) return [];
    const inj = (injuries || '').toLowerCase();
    return tpl.ids
      .filter((id) => {
        if (inj.includes('genou') && (id === 'squat' || id === 'lunge')) return false;
        if (inj.includes('épaule') && (id === 'bench' || id === 'shoulder_press')) return false;
        if (equipment === 'Poids du corps uniquement' && ['bench', 'deadlift', 'leg_press'].includes(id)) return false;
        return true;
      })
      .map((id) => Ex().instantiate(id, level));
  }

  function programName(gk, level) {
    const names = {
      weight: 'Metabolic Burn 8 semaines',
      muscle: 'Hypertrophy Builder 10 semaines',
      cardio: 'Endurance Pulse 8 semaines',
      strength: 'Force Progressive 8 semaines',
      athletic: 'Athletic Performance Stack',
      fit: 'Reboot Fitness Progressif',
    };
    return names[gk] || 'PulseFit Program';
  }

  function generate(config, startDate) {
    const gk = goalKey(config.goal);
    const perWeek = sessionsPerWeek(config.sessions);
    const dur = durationMin(config.duration);
    const level = config.level || 'Intermédiaire';
    const intensity = config.level === 'Débutant' ? 0.9 : config.level === 'Avancé' ? 1.1 : 1;
    const plan = pickTemplates(gk, perWeek, config.focusZone);
    const start = startDate || new Date().toISOString().slice(0, 10);
    const schedule = [];
    let idx = 0;

    for (let week = 0; week < 4; week++) {
      plan.forEach(({ dow, key }) => {
        const tpl = Ex().SESSION_TEMPLATES[key];
        const exercises = buildExercises(key, level, config.injuries, config.equipment);
        const date = addDays(start, week * 7 + (dow - 1));
        const diff = level === 'Débutant' ? 4 : level === 'Avancé' ? 8 : 6;
        schedule.push({
          id: `ts-${Date.now()}-${idx++}`,
          date,
          dayLabel: WEEKDAYS[dow - 1],
          title: tpl.title,
          type: tpl.type,
          durationMin: Math.round(dur * intensity),
          calories: Math.round(exercises.reduce((a, e) => a + (e.calories || 0), 0) * 1.2),
          difficulty: diff,
          exercises,
          status: 'planned',
        });
      });
    }
    schedule.sort((a, b) => a.date.localeCompare(b.date));

    return {
      program: {
        goal: config.goal,
        level: config.level,
        duration: config.duration,
        sessions: String(perWeek),
        program: programName(gk, level),
        createdAt: start,
        config,
        intensityMultiplier: intensity,
      },
      schedule,
    };
  }

  function addDays(iso, n) {
    const d = new Date(iso + 'T12:00:00');
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }

  global.PulseFitProgramEngine = {
    GOALS,
    WEEKDAYS,
    generate,
    goalKey,
    programName,
    addDays,
  };
})(typeof window !== 'undefined' ? window : globalThis);
