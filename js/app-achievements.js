/**
 * PulseFit — Page Succès / Achievements
 */
(function () {
  'use strict';

  const esc = (s) => window.PFApp?.esc(s) ?? String(s ?? '');
  const Store = () => window.PulseFitStore;
  const rel = (p) => `../${p}/`;

  function topbar(state) {
    const st = Store().getStats();
    return `
    <header class="saas-topbar">
      <div>
        <p class="saas-eyebrow">Gamification</p>
        <h1>Succès & récompenses</h1>
        <p class="saas-muted">Débloquez des badges en progressant chaque jour</p>
      </div>
      <div class="saas-topbar__right">
        <span class="saas-streak-pill">🔥 ${state.streak?.current ?? 0}</span>
        <span class="saas-xp-pill">⚡ ${st.xp ?? 0} XP</span>
        <button type="button" class="theme-toggle" id="saasThemeToggle" aria-label="Thème">◐</button>
      </div>
    </header>`;
  }

  function planBanner(planInfo) {
    const plan = planInfo.plan || 'free';
    return `
    <div class="ach-plan-banner">
      <div>
        <strong>Abonnement actuel</strong>
        <p class="saas-muted" style="margin:4px 0 0">${esc((planInfo.features || []).slice(0, 2).join(' · '))}</p>
      </div>
      <span class="ach-plan-badge ach-plan-badge--${plan}">${esc(planInfo.badge || planInfo.name)}</span>
      ${plan === 'free' ? `<a href="${rel('upgrade')}" class="btn btn--primary btn--sm">Passer Pro</a>` : ''}
    </div>`;
  }

  function achievements(el) {
    const state = Store().load();
    Store().checkBadges(state);
    Store().save(state);
    const badges = state.gamification?.badges || [];
    const defs = Store().BADGE_DEFS || [];
    const stats = Store().getProfileStats();
    const unlocked = badges.length;

    el.innerHTML = topbar(state) + planBanner(stats.plan) + `
      <div class="ach-summary">
        <article class="ach-summary__card"><strong>${unlocked}/${defs.length}</strong><span>Badges</span></article>
        <article class="ach-summary__card"><strong>${stats.xp}</strong><span>XP total</span></article>
        <article class="ach-summary__card"><strong>${stats.totalSessions}</strong><span>Séances</span></article>
        <article class="ach-summary__card"><strong>${stats.goalProgressPct}%</strong><span>Objectif</span></article>
      </div>
      <article class="saas-panel">
        <div class="saas-panel__head"><h2>Tous les succès</h2></div>
        <div class="ach-grid">
          ${defs.map((b) => {
            const ok = badges.includes(b.id);
            return `
            <article class="ach-card ${ok ? 'is-unlocked' : ''}">
              <div class="ach-card__icon">${b.icon}</div>
              <h3>${esc(b.name)}</h3>
              <p>${esc(b.desc || '')}</p>
              <span class="ach-card__status">${ok ? 'Débloqué' : 'À débloquer'}</span>
            </article>`;
          }).join('')}
        </div>
      </article>
      <p class="saas-muted" style="margin-top:16px"><a href="${rel('dashboard')}">← Retour au dashboard</a></p>`;

    requestAnimationFrame(() => window.PulseFitSaaSPolish?.refresh?.());

    document.getElementById('saasThemeToggle')?.addEventListener('click', () => {
      const next = document.body.dataset.theme === 'light' ? 'dark' : 'light';
      document.body.dataset.theme = next;
      localStorage.setItem('pulsefit-theme', next);
    });
  }

  window.PulseFitPages = window.PulseFitPages || {};
  window.PulseFitPages.achievements = achievements;
})();
