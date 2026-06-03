/**
 * PulseFit — Catalogue d'exercices
 */
(function (global) {
  'use strict';

  const EXERCISES = {
    pushup: { id: 'pushup', name: 'Pompes', muscle: 'pectoraux', difficulty: 'beginner', calories: 8, gif: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80', tips: 'Corps aligné, coudes à 45°' },
    squat: { id: 'squat', name: 'Squats', muscle: 'jambes', difficulty: 'beginner', calories: 10, gif: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80', tips: 'Genoux dans l\'axe des pieds' },
    plank: { id: 'plank', name: 'Gainage', muscle: 'core', difficulty: 'beginner', calories: 5, gif: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=80', tips: 'Planche 45s minimum' },
    burpee: { id: 'burpee', name: 'Burpees', muscle: 'full body', difficulty: 'intermediate', calories: 15, gif: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80', tips: 'Atterrissage souple' },
    lunge: { id: 'lunge', name: 'Fentes', muscle: 'jambes', difficulty: 'beginner', calories: 9, gif: 'https://images.unsplash.com/photo-1574680096145-d05b474e6976?w=400&q=80', tips: 'Buste droit' },
    pullup: { id: 'pullup', name: 'Tractions', muscle: 'dos', difficulty: 'advanced', calories: 12, gif: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&q=80', tips: 'Scapulas actives' },
    row: { id: 'row', name: 'Rowing haltère', muscle: 'dos', difficulty: 'intermediate', calories: 8, gif: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&q=80', tips: 'Dos plat' },
    bench: { id: 'bench', name: 'Développé couché', muscle: 'pectoraux', difficulty: 'intermediate', calories: 11, gif: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80', tips: 'Contrôle la descente' },
    deadlift: { id: 'deadlift', name: 'Soulevé de terre', muscle: 'jambes', difficulty: 'advanced', calories: 14, gif: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80', tips: 'Dos neutre' },
    jump_rope: { id: 'jump_rope', name: 'Corde à sauter', muscle: 'cardio', difficulty: 'beginner', calories: 12, gif: 'https://images.unsplash.com/photo-1476480862122-209bfaa8edc1?w=400&q=80', tips: 'Rythme constant' },
    mountain: { id: 'mountain', name: 'Mountain climbers', muscle: 'cardio', difficulty: 'intermediate', calories: 10, gif: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=80', tips: 'Hanches basses' },
    dip: { id: 'dip', name: 'Dips', muscle: 'triceps', difficulty: 'intermediate', calories: 9, gif: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=400&q=80', tips: 'Descente 3s' },
    shoulder_press: { id: 'shoulder_press', name: 'Développé épaules', muscle: 'épaules', difficulty: 'intermediate', calories: 9, gif: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80', tips: 'Core serré' },
    leg_press: { id: 'leg_press', name: 'Presse jambes', muscle: 'jambes', difficulty: 'beginner', calories: 10, gif: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80', tips: 'Amplitude complète' },
    bike: { id: 'bike', name: 'Cardio vélo', muscle: 'cardio', difficulty: 'beginner', calories: 11, gif: 'https://images.unsplash.com/photo-1476480862122-209bfaa8edc1?w=400&q=80', tips: 'Zone 2' },
  };

  const SESSION_TEMPLATES = {
    upper: { title: 'Haut du corps', type: 'strength', ids: ['pushup', 'bench', 'row', 'shoulder_press', 'dip', 'plank'] },
    lower: { title: 'Jambes & fessiers', type: 'strength', ids: ['squat', 'lunge', 'deadlift', 'leg_press', 'plank'] },
    cardio: { title: 'Cardio', type: 'cardio', ids: ['jump_rope', 'burpee', 'mountain', 'bike'] },
    full: { title: 'Full Body', type: 'mixed', ids: ['squat', 'pushup', 'row', 'burpee', 'plank', 'lunge'] },
    pull: { title: 'Pull Power', type: 'strength', ids: ['pullup', 'row', 'deadlift', 'plank'] },
    push: { title: 'Push Force', type: 'strength', ids: ['bench', 'pushup', 'shoulder_press', 'dip', 'plank'] },
    core: { title: 'Core & mobilité', type: 'mobility', ids: ['plank', 'mountain', 'lunge'] },
    athletic: { title: 'Athlétique', type: 'hiit', ids: ['burpee', 'jump_rope', 'squat', 'mountain', 'plank'] },
  };

  function get(id) {
    return EXERCISES[id] || null;
  }

  function list() {
    return Object.values(EXERCISES);
  }

  function instantiate(id, level, sets, reps) {
    const ex = EXERCISES[id];
    if (!ex) return null;
    const mult = level === 'Débutant' ? 0.85 : level === 'Avancé' ? 1.15 : 1;
    return {
      id: `${id}-${Date.now()}`,
      exerciseId: id,
      name: ex.name,
      muscle: ex.muscle,
      difficulty: ex.difficulty,
      calories: Math.round(ex.calories * mult),
      gif: ex.gif,
      tips: ex.tips,
      sets: sets || (ex.difficulty === 'beginner' ? 3 : 4),
      reps: reps || (ex.id === 'plank' ? '45 sec' : '12'),
      done: false,
    };
  }

  global.PulseFitExercises = {
    EXERCISES,
    SESSION_TEMPLATES,
    get,
    list,
    instantiate,
  };
})(typeof window !== 'undefined' ? window : globalThis);
