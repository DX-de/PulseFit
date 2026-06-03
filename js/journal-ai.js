/**
 * PulseFit — Analyse IA journal (insights, alertes, recommandations)
 */
(function (global) {
  'use strict';

  const Store = () => global.PulseFitStore;
  const Engine = () => global.PulseFitJournalEngine;

  function lastNDays(daily, n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const d = Store().addDays(Store().todayISO(), -i);
      if (daily[d]) out.push({ date: d, ...daily[d] });
    }
    return out;
  }

  function trend(values) {
    if (values.length < 3) return 0;
    const half = Math.floor(values.length / 2);
    const recent = values.slice(0, half);
    const older = values.slice(half);
    const avg = (arr) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
    return avg(recent) - avg(older);
  }

  function analyze(state) {
    const wellness = state.wellness || { daily: {} };
    const daily = wellness.daily;
    const days7 = lastNDays(daily, 7);
    const days14 = lastNDays(daily, 14);
    const insights = [];
    const alerts = [];
    const recommendations = [];

    const avgEnergy = Engine().averageMetric(daily, 'energy', 7);
    const avgMood = Engine().averageMetric(daily, 'mood', 7);
    const avgSleep = Engine().averageMetric(daily, 'sleep', 7);
    const avgMotivation = Engine().averageMetric(daily, 'motivation', 7);
    const avgStress = Engine().averageMetric(daily, 'stress', 7);

    const energyTrend = trend(days7.map((d) => d.energy).filter(Boolean));
    const moodTrend = trend(days7.map((d) => d.mood).filter(Boolean));

    if (avgSleep != null && avgSleep >= 7.5) {
      insights.push({ type: 'recovery', severity: 'success', message: 'Votre récupération est excellente.' });
    } else if (avgSleep != null && avgSleep < 5.5) {
      alerts.push({ type: 'sleep', severity: 'warning', message: 'Sommeil insuffisant détecté sur 7 jours.' });
      recommendations.push('Visez 7–8 h de sommeil et réduisez les écrans avant le coucher.');
    }

    if (energyTrend < -0.8) {
      insights.push({ type: 'energy', severity: 'warning', message: 'Votre énergie baisse depuis une semaine.' });
      recommendations.push('Essayez une séance plus légère ou un jour de repos actif.');
    } else if (energyTrend > 0.5) {
      insights.push({ type: 'energy', severity: 'success', message: 'Votre niveau d\'énergie progresse.' });
    }

    if (avgMood != null && avgMood >= 7) {
      insights.push({ type: 'mood', severity: 'success', message: 'Humeur stable et positive cette semaine.' });
    }

    const series = Engine().getWeightSeries(30);
    if (series.length >= 10) {
      const last10 = series.slice(-10).map((s) => s.value);
      const range = Math.max(...last10) - Math.min(...last10);
      if (range < 0.3) {
        insights.push({ type: 'weight', severity: 'info', message: 'Votre poids stagne depuis 10 jours.' });
        const goal = (state.profile?.goal || '').toLowerCase();
        if (goal.includes('poids') || goal.includes('perte')) {
          recommendations.push('Ajustez légèrement le déficit calorique ou augmentez le NEAT (marche).');
        }
      } else {
        const wDelta = Engine().weightDelta(state);
        if (Math.abs(wDelta.delta) >= 1) {
          insights.push({ type: 'weight', severity: 'success', message: 'Votre progression poids est très bonne.' });
        }
      }
    }

    const sessionsWeek = (state.sessionLogs || []).filter((l) => l.date >= Store().addDays(Store().todayISO(), -7)).length;
    const planned = (state.schedule || []).filter((s) => {
      const d = s.date;
      return d >= Store().addDays(Store().todayISO(), -7) && d <= Store().todayISO();
    }).length;
    if (sessionsWeek >= 5 && avgEnergy != null && avgEnergy < 5) {
      alerts.push({ type: 'overtraining', severity: 'danger', message: 'Signes possibles de surentraînement.' });
      recommendations.push('Ajoutez un jour de repos et privilégiez mobilité / étirements.');
    }

    if (avgMotivation != null && avgMotivation < 4.5) {
      alerts.push({ type: 'motivation', severity: 'warning', message: 'Baisse de motivation détectée.' });
      recommendations.push('Fixez un mini-objectif (15 min) et célébrez chaque séance terminée.');
    }

    if (avgStress != null && avgStress >= 7.5) {
      alerts.push({ type: 'stress', severity: 'warning', message: 'Niveau de stress élevé.' });
      recommendations.push('Intégrez respiration 5 min et une séance mobilité cette semaine.');
    }

    const nutri = state.nutrition;
    const today = Store().todayISO();
    const water = nutri?.water?.[today];
    if (water && water.liters < (nutri?.profile?.waterGoalL || 2) * 0.5) {
      recommendations.push('Augmentez votre hydratation : objectif non atteint aujourd\'hui.');
    }
    const avgNutri = Engine().averageMetric(daily, 'nutrition', 7);
    if (avgNutri != null && avgNutri < 6) {
      recommendations.push('Augmentez vos protéines et planifiez vos repas la veille.');
    }

    if (sessionsWeek < Math.max(1, Math.floor(planned * 0.5)) && planned > 0) {
      recommendations.push('Reprenez le rythme : une séance courte vaut mieux qu\'aucune.');
    }

    if (!recommendations.length && insights.length) {
      recommendations.push('Continuez sur cette lancée — votre équilibre global est bon.');
    }

    const progressPct = Store().getStatsFromState?.(state)?.progressPct ?? state.goals?.progressPct ?? 0;
    if (progressPct >= 75) {
      insights.push({ type: 'progress', severity: 'success', message: 'Votre progression globale est très bonne.' });
    }

    if (moodTrend < -0.6) {
      alerts.push({ type: 'fatigue', severity: 'warning', message: 'Fatigue émotionnelle possible (humeur en baisse).' });
    }

    return {
      insights,
      alerts,
      recommendations,
      summary: {
        avgEnergy,
        avgMood,
        avgSleep,
        avgMotivation,
        avgStress,
        sessionsWeek,
        progressPct,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  function coachContext(state) {
    const report = analyze(state);
    return {
      report,
      text: [
        ...report.insights.map((i) => i.message),
        ...report.alerts.map((a) => `⚠ ${a.message}`),
        ...report.recommendations.map((r) => `→ ${r}`),
      ].join('\n'),
    };
  }

  global.PulseFitJournalAI = { analyze, coachContext };
})(typeof window !== 'undefined' ? window : globalThis);
