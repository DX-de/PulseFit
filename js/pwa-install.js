/**
 * PulseFit — PWA install & notifications (structure)
 */
(function () {
  'use strict';

  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.querySelectorAll('[data-pwa-install]').forEach((btn) => {
      btn.hidden = false;
      btn.removeAttribute('aria-hidden');
    });
  });

  async function promptInstall() {
    if (!deferredPrompt) {
      alert('Sur mobile : menu du navigateur → « Ajouter à l\'écran d\'accueil ». Sur desktop : icône d\'installation dans la barre d\'adresse.');
      return false;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    return outcome === 'accepted';
  }

  async function requestNotificationPermission() {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    return Notification.requestPermission();
  }

  function scheduleLocalReminder(title, body, delayMs) {
    if (Notification.permission !== 'granted') return;
    setTimeout(() => {
      try {
        new Notification(title, { body, icon: '/favicon.svg', tag: 'pulsefit-reminder' });
      } catch (_) { /* ignore */ }
    }, delayMs);
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-pwa-install]');
    if (btn) {
      e.preventDefault();
      promptInstall();
    }
    const notif = e.target.closest('[data-pwa-notify]');
    if (notif) {
      e.preventDefault();
      requestNotificationPermission().then((p) => {
        if (p === 'granted') scheduleLocalReminder('PulseFit', 'Rappel : votre séance vous attend !', 1000);
      });
    }
  });

  window.PulseFitPWA = {
    promptInstall,
    requestNotificationPermission,
    scheduleLocalReminder,
  };
})();
