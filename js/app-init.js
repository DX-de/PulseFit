/**
 * PulseFit — Boot async (auth + cloud + render)
 */
(function () {
  'use strict';

  function loadUserDisplay() {
    if (window.PulseFitUserDisplay) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const base = document.currentScript?.src;
      if (!base) {
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.src = base.replace(/app-init\.js.*$/, 'pulsefit-user-display.js');
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('pulsefit-user-display.js'));
      document.head.appendChild(s);
    });
  }

  const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (isLocal && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
  }

  function loadSaasPolish() {
    return new Promise((resolve) => {
      if (window.PulseFitSaaSPolish) {
        resolve();
        return;
      }
      const base = document.currentScript?.src;
      if (!base) {
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.src = base.replace(/app-init\.js.*$/, 'saas-polish.js');
      s.onload = () => resolve();
      s.onerror = () => resolve();
      document.head.appendChild(s);
    });
  }

  async function bootPage(pageId) {
    try {
      await loadUserDisplay();
    } catch (e) {
      console.warn(e);
    }
    const returnPath = `${pageId}/${location.search}`.replace(/\/$/, '/');
    const authed = await window.PulseFitAuth.requireAuthAsync('../login/', returnPath);
    if (!authed) return;

    try {
      await window.PulseFitStore.init();
    } catch (err) {
      console.warn('PulseFitStore.init:', err);
    }

    await loadSaasPolish();
    window.PFApp.boot(pageId, { skipAuth: true });
    requestAnimationFrame(() => window.PulseFitSaaSPolish?.refresh?.());
  }

  window.PFAppBoot = { bootPage };
})();
