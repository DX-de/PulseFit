(function () {
  'use strict';

  function applyTheme() {
    const saved = localStorage.getItem('pulsefit-theme');
    if (saved) document.body.dataset.theme = saved;
  }

  function resolveNext(raw) {
    if (!raw) return '../dashboard/';
    const next = decodeURIComponent(raw).replace(/^\//, '');
    const legacy = {
      'dashboard/?view=calendar': '../calendar/',
      'dashboard/?view=journal': '../journal/',
      'dashboard/?view=coach': '../ai-coach/',
      'dashboard/?view=history': '../history/',
      'dashboard/?view=workouts': '../dashboard/?tab=workout',
      'dashboard/': '../dashboard/',
      dashboard: '../dashboard/',
      'calendar/': '../calendar/',
      calendar: '../calendar/',
      'journal/': '../journal/',
      journal: '../journal/',
      'ai-coach/': '../ai-coach/',
      'ai-coach': '../ai-coach/',
      'history/': '../history/',
      history: '../history/',
      'program/': '../program/',
      program: '../program/',
    };
    if (legacy[next]) return legacy[next];
    if (next.startsWith('../') || next.startsWith('http')) return next;
    return `../${next}${next.endsWith('/') ? '' : '/'}`;
  }

  function goNext() {
    const next = new URLSearchParams(location.search).get('next');
    location.href = resolveNext(next);
  }

  applyTheme();

  (async function init() {
    if (window.PulseFitAuth?.initSession) await window.PulseFitAuth.initSession();
    if (window.PulseFitAuth?.isAuthed?.()) {
      goNext();
      return;
    }

    document.querySelectorAll('[data-oauth]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const res = await window.PulseFitAuth.loginWithProvider(btn.dataset.oauth);
        if (res.ok && !res.redirect) goNext();
      });
    });
  })();

  window.PFAuth = {
    goNext,
    resolveNext,
    showError(id, msg) {
      const el = document.getElementById(id);
      if (el) { el.textContent = msg; el.hidden = !msg; }
    },
  };
})();
