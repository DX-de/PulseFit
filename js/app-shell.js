/**
 * PulseFit — Shell SaaS (nav, layout, boot)
 */
(function () {
  'use strict';

  const NAV = [
    { id: 'dashboard', path: 'dashboard', label: 'Accueil', icon: '⌂' },
    { id: 'achievements', path: 'achievements', label: 'Succès', icon: '🏅' },
    { id: 'calendar', path: 'calendar', label: 'Calendrier', icon: '📅' },
    { id: 'program', path: 'program', label: 'Programme', icon: '📋' },
    { id: 'journal', path: 'journal', label: 'Journal', icon: '📝' },
    { id: 'history', path: 'history', label: 'Historique', icon: '🕐' },
    { id: 'nutrition', path: 'nutrition', label: 'Nutrition', icon: '🥗' },
    { id: 'ai-coach', path: 'ai-coach', label: 'Coach IA', icon: '✦' },
    { id: 'profile', path: 'profile', label: 'Profil', icon: '👤' },
    { id: 'community', path: 'community', label: 'Communauté', icon: '◎', pro: true },
    { id: 'pricing', path: 'pricing', label: 'Abonnements', icon: '◆' },
    { id: 'admin', path: 'admin', label: 'Admin', icon: '⚙', admin: true },
  ];

  const MOBILE_NAV = ['dashboard', 'calendar', 'program', 'ai-coach', 'profile'];

  function rel(path) {
    return `../${path}/`;
  }

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s ?? '';
    return d.innerHTML;
  }

  function renderShell(root, activePage) {
    const Store = window.PulseFitStore;
    const state = Store.load();
    const stats = Store.getStats();
    const plan = state.subscription || 'free';
    const planLabel = { free: 'Free', pro: 'Pro', elite: 'Elite' }[plan] || 'Free';
    const planBadgeClass = `saas-plan-badge--${plan}`;
    const isAdmin = window.PulseFitAuth.isAdmin();

    const navHtml = NAV.filter((n) => !n.admin || isAdmin).map((n) => {
      const locked = n.pro && plan === 'free';
      return `<a href="${rel(n.path)}" class="saas-nav__link ${n.id === activePage ? 'active' : ''} ${locked ? 'locked' : ''}" data-nav="${n.id}">${n.icon} ${n.label}${locked ? ' 🔒' : ''}</a>`;
    }).join('');

    const mobileHtml = MOBILE_NAV.map((id) => {
      const n = NAV.find((x) => x.id === id);
      return `<a href="${rel(n.path)}" class="${id === activePage ? 'active' : ''}"><span>${n.icon}</span>${n.label}</a>`;
    }).join('');

    root.innerHTML = `
      <div class="saas-layout">
        <aside class="saas-sidebar">
          <a href="../index.html" class="saas-logo" aria-label="PulseFit — Accueil">
            <img src="../assets/logo-nav.png" srcset="../assets/logo-nav.png 1x, ../assets/logo-128.png 2x" class="pf-brand-logo" width="32" height="32" alt="" decoding="async">
            <span class="saas-logo__wordmark">PulseFit</span>
          </a>
          <div class="saas-plan-badge ${planBadgeClass}">${planLabel}</div>
          <nav class="saas-nav">${navHtml}</nav>
          <div class="saas-sidebar__foot">
            <button type="button" class="btn btn--ghost btn--sm btn--block" id="saasExportPdf">Export PDF</button>
            <button type="button" class="btn btn--ghost btn--sm btn--block" id="saasLogout">Déconnexion</button>
          </div>
        </aside>
        <div class="saas-main" id="saas-content"></div>
        <nav class="saas-mobile-nav">${mobileHtml}</nav>
      </div>`;

    document.getElementById('saasExportPdf')?.addEventListener('click', () => {
      if (!Store.isPremiumFeature('export_pdf')) {
        location.href = rel('upgrade');
        return;
      }
      window.PulseFitPdf?.exportProgramPdf();
    });
    document.getElementById('saasLogout')?.addEventListener('click', async () => {
      await window.PulseFitAuth.logout();
      location.href = '../login/';
    });
  }

  function bindTheme() {
    const saved = localStorage.getItem('pulsefit-theme');
    if (saved) document.body.dataset.theme = saved;
    document.getElementById('saasThemeToggle')?.addEventListener('click', () => {
      const next = document.body.dataset.theme === 'light' ? 'dark' : 'light';
      document.body.dataset.theme = next;
      localStorage.setItem('pulsefit-theme', next);
    });
  }

  function boot(pageId, opts) {
    if (!opts?.skipAuth) {
      const returnPath = `${pageId}/${location.search}`.replace(/\/$/, '/');
      if (!window.PulseFitAuth.requireAuth('../login/', returnPath)) return;
    }

    const root = document.getElementById('saas-app');
    if (!root) return;

    const savedTheme = localStorage.getItem('pulsefit-theme');
    if (savedTheme) document.body.dataset.theme = savedTheme;

    renderShell(root, pageId);
    const content = document.getElementById('saas-content');
    const renderer = window.PulseFitPages?.[pageId];
    if (!renderer || !content) {
      if (content) content.innerHTML = '<p class="saas-muted">Page introuvable.</p>';
      return;
    }
    try {
      renderer(content);
    } catch (err) {
      console.error('PulseFit render error:', err);
      content.innerHTML = `
        <div class="saas-panel">
          <h2>Erreur d'affichage</h2>
          <p class="saas-muted">Rechargez la page ou réinitialisez les données locales.</p>
          <button type="button" class="btn btn--primary" id="saasResetData">Réinitialiser</button>
        </div>`;
      document.getElementById('saasResetData')?.addEventListener('click', () => {
        window.PulseFitStore.resetDemo();
        location.reload();
      });
    }
    bindTheme();
  }

  window.PFApp = { boot, rel, esc };
})();
