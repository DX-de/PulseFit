/** Charge les scripts app et boot la page */
(function (pageId) {
  const scripts = [
    '../pulsefit-store.js',
    '../pulsefit-auth.js',
    '../pulsefit-pdf.js',
    '../js/ai-coach-engine.js',
    '../js/app-pages.js',
    '../js/app-shell.js',
  ];
  function load(i) {
    if (i >= scripts.length) {
      window.PFApp.boot(pageId);
      return;
    }
    const s = document.createElement('script');
    s.src = scripts[i];
    s.onload = () => load(i + 1);
    document.body.appendChild(s);
  }
  load(0);
})();
