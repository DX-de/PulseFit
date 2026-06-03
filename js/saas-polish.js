/**
 * PulseFit — Animations & micro-interactions app SaaS
 */
(function () {
  'use strict';

  function refreshContentAnimation() {
    const main = document.getElementById('saas-content');
    if (!main) return;
    main.classList.remove('saas-content-ready');
    void main.offsetWidth;
    main.classList.add('saas-content-ready');
  }

  function observeContent() {
    const main = document.getElementById('saas-content');
    if (!main || !window.MutationObserver) {
      refreshContentAnimation();
      return;
    }
    const obs = new MutationObserver(() => {
      clearTimeout(observeContent._t);
      observeContent._t = setTimeout(refreshContentAnimation, 40);
    });
    obs.observe(main, { childList: true });
    refreshContentAnimation();
  }

  function init() {
    if (document.body.classList.contains('saas-body')) {
      observeContent();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.PulseFitSaaSPolish = { refresh: refreshContentAnimation };
})();
