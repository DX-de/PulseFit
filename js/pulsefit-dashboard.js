/**
 * PulseFit — Dashboard premium (données réelles du store)
 */
(function (global) {
  'use strict';

  const esc = (s) => global.PFApp?.esc(s) ?? String(s ?? '');

  function lineChart(points, opts) {
    const { w = 480, h = 160, stroke = '#22C55E', fill = 'rgba(34,197,94,0.12)' } = opts || {};
    if (!points.length) return '<p class="dash-muted">Pas encore de données — enregistrez votre poids dans le journal.</p>';
    const vals = points.map((p) => p.value);
    const min = Math.min(...vals) - 0.5;
    const max = Math.max(...vals) + 0.5;
    const range = max - min || 1;
    const coords = points.map((p, i) => {
      const x = 36 + (i / Math.max(1, points.length - 1)) * (w - 72);
      const y = 24 + ((max - p.value) / range) * (h - 48);
      return { x, y, label: p.label };
    });
    const poly = coords.map((c) => `${c.x},${c.y}`).join(' ');
    const area = `${coords[0].x},${h - 20} ${poly} ${coords[coords.length - 1].x},${h - 20}`;
    const dots = coords.map((c) =>
      `<circle cx="${c.x}" cy="${c.y}" r="4" fill="${stroke}" class="dash-chart-dot"/>`).join('');
    const labels = coords.filter((_, i) => i === 0 || i === coords.length - 1 || i % Math.ceil(coords.length / 4) === 0)
      .map((c) => `<text x="${c.x}" y="${h - 4}" fill="rgba(255,255,255,0.45)" font-size="10" text-anchor="middle">${esc(c.label)}</text>`).join('');
    return `<div class="dash-chart"><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Graphique">
      <polygon points="${area}" fill="${fill}"/>
      <polyline fill="none" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round" points="${poly}"/>
      ${dots}${labels}
    </svg></div>`;
  }

  function barChartSeries(series, color) {
    const max = Math.max(...series.map((d) => d.value), 1);
    return `<div class="dash-bars">${series.map((d) => `
      <div class="dash-bars__col" title="${esc(d.label)}: ${d.value}">
        <div class="dash-bars__bar" style="height:${Math.round((d.value / max) * 100)}%;background:${color || 'var(--energy)'}"></div>
        <span>${esc(d.short || d.label)}</span>
      </div>`).join('')}</div>`;
  }

  function xpBar(level) {
    const pct = Math.min(100, Math.max(0, level.progress || 0));
    return `<div class="dash-xp-bar" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100">
      <div class="dash-xp-bar__fill" style="width:${pct}%"></div>
      <span class="dash-xp-bar__label">${level.xp} XP${level.nextMin ? ` · encore ${level.nextMin - level.xp} XP pour le niveau suivant` : ' · Niveau max atteint'}</span>
    </div>`;
  }

  function welcomeCard(data) {
    const p = data.profile;
    const kgLost = data.kgLost;
    return `<article class="dash-welcome">
      <div class="dash-welcome__avatar-wrap">
        <img src="${esc(global.PulseFitUserDisplay?.avatarUrl?.(p) || '')}" alt="" width="72" height="72" class="dash-welcome__avatar">
        <span class="dash-welcome__level">${esc(data.level.name)}</span>
      </div>
      <div class="dash-welcome__body">
        <p class="dash-welcome__eyebrow">Tableau de bord · ${esc(data.planLabel)}</p>
        <h2>${esc(global.PulseFitUserDisplay?.greeting?.(p) || 'Bonjour')} 👋</h2>
        <p class="dash-welcome__sub">${esc(data.motivationLine)}</p>
        <div class="dash-welcome__chips">
          <span>🔥 ${data.streak} jours</span>
          <span>⚡ ${data.xp} XP</span>
          ${kgLost > 0 ? `<span>📉 −${kgLost.toFixed(1)} kg</span>` : ''}
        </div>
      </div>
      ${xpBar(data.level)}
    </article>`;
  }

  function metricCards(data) {
    const cards = [
      { label: 'Poids actuel', value: data.weightLabel, sub: `Objectif ${data.targetLabel} kg` },
      { label: 'Progression objectif', value: `${data.goalProgressPct}%`, sub: 'vers votre cible' },
      { label: 'Calories (sem.)', value: data.caloriesWeek.toLocaleString('fr-FR'), sub: 'kcal brûlées' },
      { label: 'Séances (sem.)', value: `${data.sessionsDone}/${data.sessionsPlanned}`, sub: 'réalisées' },
      { label: 'Streak', value: `${data.streak} j`, sub: `record ${data.streakLongest} j` },
      { label: 'Niveau · XP', value: data.level.name, sub: `${data.xp} XP total` },
    ];
    return `<div class="dash-metrics">${cards.map((c) => `
      <article class="dash-metric">
        <span>${esc(c.label)}</span>
        <strong>${esc(String(c.value))}</strong>
        <small>${esc(c.sub)}</small>
      </article>`).join('')}</div>`;
  }

  function nextActions(actions) {
    if (!actions.length) return '<p class="dash-muted">Tout est à jour pour aujourd\'hui — bravo !</p>';
    return `<ul class="dash-actions">${actions.map((a) => `
      <li class="dash-action ${a.done ? 'is-done' : ''}">
        <span class="dash-action__icon">${a.icon}</span>
        <div>
          <strong>${esc(a.title)}</strong>
          <p>${esc(a.detail)}</p>
        </div>
        ${a.href && !a.done ? `<a href="${a.href}" class="btn btn--primary btn--sm">${esc(a.cta || 'Faire')}</a>` : a.done ? '<span class="dash-action__ok">✓</span>' : ''}
      </li>`).join('')}</ul>`;
  }

  function dailyChallengesSection(rel) {
    const Ch = global.PulseFitChallenges;
    if (!Ch?.getDailyChallenges) return '';
    const list = Ch.getDailyChallenges();
    const done = list.filter((c) => c.done).length;
    return `
    <section class="dash-section">
      <div class="dash-section__head"><h2>Défis du jour</h2><span>${done}/${list.length}</span></div>
      <ul class="dash-challenges" id="dashChallenges">
        ${list.map((c) => `
          <li class="dash-challenge ${c.done ? 'is-done' : ''}" data-challenge="${esc(c.id)}">
            <span class="dash-challenge__icon">${c.icon}</span>
            <div class="dash-challenge__body">
              <strong>${esc(c.title)}</strong>
              <p>${esc(c.hint)} · +${c.xp} XP</p>
              <div class="dash-challenge__bar"><span style="width:${c.progress}%"></span></div>
            </div>
            ${c.done
              ? '<span class="dash-action__ok">✓</span>'
              : `<button type="button" class="btn btn--primary btn--sm" data-challenge-done="${esc(c.id)}">Valider</button>`}
          </li>`).join('')}
      </ul>
      <p class="dash-muted"><a href="${rel('achievements')}">Voir tous les succès →</a></p>
    </section>`;
  }

  function bindChallenges(container, rel) {
    container.querySelectorAll('[data-challenge-done]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const res = global.PulseFitChallenges?.completeChallenge?.(btn.dataset.challengeDone);
        if (res?.ok) {
          btn.closest('.dash-challenge')?.classList.add('is-done', 'dash-challenge--pop');
          const li = btn.closest('.dash-challenge');
          if (li) {
            btn.replaceWith('<span class="dash-action__ok">✓</span>');
          }
          setTimeout(() => global.PulseFitDashboard?.render?.(container), 600);
        } else if (res?.message) {
          alert(res.message);
        }
      });
    });
  }

  function badgesSection(badges, xp) {
    const Store = global.PulseFitStore;
    const defs = Store.BADGE_DEFS || [];
    return `<div class="dash-badges">${defs.map((b) => {
      const ok = badges.includes(b.id);
      return `<span class="dash-badge ${ok ? 'unlocked' : 'locked'}" title="${ok ? 'Débloqué' : 'À débloquer'}">${b.icon} ${esc(b.name)}</span>`;
    }).join('')}</div>
    <p class="dash-muted" style="margin-top:10px">${xp} XP cumulés · débloquez des succès en vous entraînant</p>`;
  }

  function render(container) {
    const Store = global.PulseFitStore;
    if (!Store?.getDashboardData) {
      container.innerHTML = '<p class="dash-muted">Dashboard indisponible.</p>';
      return;
    }
    const data = Store.getDashboardData();
    const session = Store.getTodaySession();
    const rel = (p) => `../${p}/`;
    const onboard = Store.needsOnboarding?.()
      ? `<div class="dash-onboard"><a href="${rel('profile')}">Complétez votre profil pour personnaliser le coach IA →</a></div>`
      : '';
    const freeLock = data.plan === 'free'
      ? `<div class="dash-upgrade-hint"><p>Stats avancées et coach illimité avec <strong>Premium</strong>.</p><a href="${rel('upgrade')}" class="btn btn--primary btn--sm">Passer Premium</a></div>`
      : '';

    container.innerHTML = onboard + `
      ${welcomeCard(data)}
      ${metricCards(data)}
      ${freeLock}
      ${dailyChallengesSection(rel)}
      <section class="dash-section">
        <div class="dash-section__head"><h2>Prochaine action recommandée</h2><span>Coach IA</span></div>
        ${nextActions(data.recommendedActions)}
      </section>
      <div class="dash-grid-2">
        <article class="dash-panel">
          <div class="dash-panel__head"><h3>Évolution du poids</h3><span>${data.startWeight} → ${data.weightLabel} kg</span></div>
          ${lineChart(data.weightSeries)}
        </article>
        <article class="dash-panel">
          <div class="dash-panel__head"><h3>Séances cette semaine</h3><span>${data.sessionsDone}/${data.sessionsPlanned} réalisées</span></div>
          ${barChartSeries(data.sessionsWeekSeries, 'linear-gradient(180deg,#3B82F6,#2563EB)')}
        </article>
      </div>
      <div class="dash-grid-2">
        <article class="dash-panel">
          <div class="dash-panel__head"><h3>Calories brûlées</h3><span>7 derniers jours</span></div>
          ${barChartSeries(data.weeklyCalories, 'linear-gradient(180deg,#F59E0B,#D97706)')}
        </article>
        <article class="dash-panel">
          <div class="dash-panel__head"><h3>Minutes d'entraînement</h3><span>7 derniers jours</span></div>
          ${barChartSeries(data.weeklyMinutes, 'linear-gradient(180deg,#22C55E,#16A34A)')}
        </article>
      </div>
      <div class="dash-grid-2">
        <article class="dash-panel dash-panel--highlight">
          <div class="dash-panel__head"><h3>Séance du jour</h3></div>
          ${session
            ? `<p><strong>${esc(session.title)}</strong> · ${session.durationMin} min · ~${session.calories} kcal</p>
               <a href="${rel('program')}?tab=workout" class="btn btn--primary btn--glow btn--block" style="margin-top:12px">Démarrer la séance</a>`
            : '<p class="dash-muted">Repos ou programme non configuré.</p><a href="' + rel('program') + '?tab=config" class="btn btn--ghost btn--sm" style="margin-top:10px">Configurer le programme →</a>'}
          <a href="${rel('ai-coach')}" class="btn btn--ghost btn--sm btn--block" style="margin-top:8px">Demander au Coach IA</a>
        </article>
        <article class="dash-panel">
          <div class="dash-panel__head"><h3>Succès & badges</h3><span>${data.badgesUnlocked}/${data.badgesTotal}</span></div>
          ${badgesSection(data.badges, data.xp)}
          <a href="${rel('achievements')}" class="btn btn--ghost btn--sm btn--block" style="margin-top:12px">Tous les succès →</a>
        </article>
      </div>`;
    bindChallenges(container, rel);
    requestAnimationFrame(() => window.PulseFitSaaSPolish?.refresh?.());
  }

  global.PulseFitDashboard = { render, lineChart, barChartSeries };
})(typeof window !== 'undefined' ? window : globalThis);
