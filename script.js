/**
 * PulseFit — Landing (SaaS premium)
 */

(function () {
  'use strict';

  const nav = document.getElementById('nav');
  const navBurger = document.getElementById('navBurger');
  const mobileMenu = document.getElementById('mobileMenu');
  const screensTrack = document.getElementById('screensTrack');
  const screensProgress = document.getElementById('screensProgress');
  const configModal = document.getElementById('configModal');
  const configContent = document.getElementById('configContent');
  const configProgress = document.getElementById('configProgress');
  const configClose = document.getElementById('configClose');
  const videoModal = document.getElementById('videoModal');
  const stickyCta = document.getElementById('stickyCta');
  const stickyClose = document.getElementById('stickyClose');
  const testimonialsTrack = document.getElementById('testimonialsTrack');
  const baInput = document.getElementById('baInput');
  const baAfterLayer = document.getElementById('baAfterLayer');
  const baHandle = document.getElementById('baHandle');
  const themeToggle = document.getElementById('themeToggle');
  const langToggle = document.getElementById('langToggle');
  const heroFloatsMobile = document.getElementById('heroFloatsMobile');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let currentLang = localStorage.getItem('pulsefit-lang') || (navigator.language.startsWith('en') ? 'en' : 'fr');

  function t(key) {
    return window.PulseFitLocales?.[currentLang]?.[key] || window.PulseFitLocales?.fr?.[key] || key;
  }

  function applyI18n() {
    document.documentElement.lang = currentLang;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      if (t(key)) el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
      const key = el.dataset.i18nHtml;
      if (t(key)) el.innerHTML = t(key);
    });
    document.querySelectorAll('.lang-toggle').forEach((btn) => {
      btn.textContent = currentLang === 'fr' ? 'EN' : 'FR';
      btn.setAttribute('aria-label', t('lang_label'));
    });
    document.getElementById('configTitle')?.textContent && (document.getElementById('configTitle').textContent = t('config_title'));
    window.PulseFitNavUser?.refresh?.();
    window.PulseFitLanding?.refresh?.();
  }

  document.querySelectorAll('.lang-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentLang = currentLang === 'fr' ? 'en' : 'fr';
      localStorage.setItem('pulsefit-lang', currentLang);
      applyI18n();
      if (!configModal?.hidden && configStepIndex < configSteps.length) renderConfigStep();
    });
  });

  applyI18n();

  if ('serviceWorker' in navigator) {
    const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    window.addEventListener('load', () => {
      if (isLocal) {
        navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
        return;
      }
      navigator.serviceWorker.register('sw.js?v=6').catch(() => {});
    });
  }

  const transformProfiles = [
    { beforeImg: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=900&q=80', afterImg: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=900&q=80', before: '82 kg', after: '74 kg', loss: '-8 kg', duration: '8 semaines', weekHighlight: 2 },
    { beforeImg: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=900&q=80', afterImg: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=900&q=80', before: '68 kg', after: '63 kg', loss: '-5 kg', duration: '10 semaines', weekHighlight: 2 },
    { beforeImg: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900&q=80', afterImg: 'https://images.unsplash.com/photo-1574680096145-d05b474e6976?w=900&q=80', before: '88 kg', after: '81 kg', loss: '-7 kg', duration: '12 semaines', weekHighlight: 2 },
  ];

  let demoInterval = null;

  // Theme
  const savedTheme = localStorage.getItem('pulsefit-theme');
  if (savedTheme) document.body.dataset.theme = savedTheme;

  document.querySelectorAll('.theme-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = document.body.dataset.theme === 'light' ? 'dark' : 'light';
      document.body.dataset.theme = next;
      localStorage.setItem('pulsefit-theme', next);
    });
  });

  // Sticky CTA
  const stickyDismissed = localStorage.getItem('pulsefit-sticky-dismissed') === '1';

  window.addEventListener('scroll', () => {
    nav?.classList.toggle('scrolled', window.scrollY > 40);
    if (!stickyCta || stickyDismissed) return;
    const show = window.scrollY > window.innerHeight * 0.55;
    stickyCta.classList.toggle('visible', show);
    stickyCta.setAttribute('aria-hidden', show ? 'false' : 'true');
    document.body.classList.toggle('has-sticky', show);
  }, { passive: true });

  stickyClose?.addEventListener('click', () => {
    localStorage.setItem('pulsefit-sticky-dismissed', '1');
    stickyCta.classList.remove('visible');
    document.body.classList.remove('has-sticky');
  });

  function closeMobileMenu() {
    navBurger?.classList.remove('open');
    mobileMenu?.classList.remove('open');
    navBurger?.setAttribute('aria-expanded', 'false');
    mobileMenu?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function openMobileMenu() {
    navBurger?.classList.add('open');
    mobileMenu?.classList.add('open');
    navBurger?.setAttribute('aria-expanded', 'true');
    mobileMenu?.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  navBurger?.addEventListener('click', () => {
    if (mobileMenu?.classList.contains('open')) closeMobileMenu();
    else openMobileMenu();
  });

  mobileMenu?.querySelector('[data-close-menu]')?.addEventListener('click', closeMobileMenu);

  mobileMenu?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMobileMenu);
  });

  mobileMenu?.querySelectorAll('[data-nav-logout]').forEach((btn) => {
    btn.addEventListener('click', closeMobileMenu);
  });

  document.querySelectorAll('[data-scroll]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelector(btn.dataset.scroll)?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  document.querySelectorAll('.nav__link').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href?.startsWith('#')) return;
      e.preventDefault();
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  const navSections = [
    { id: 'hero', nav: 'home' },
    { id: 'screens', nav: 'app' },
    { id: 'program-cta', nav: 'program' },
    { id: 'daily-loop', nav: 'nutrition' },
    { id: 'ai', nav: 'coach' },
    { id: 'pricing', nav: 'pricing' },
  ];

  function setActiveNav(key) {
    document.querySelectorAll('.nav__link[data-nav]').forEach((a) => {
      a.classList.toggle('is-active', a.dataset.nav === key);
    });
  }

  const sectionEls = navSections
    .map(({ id }) => document.getElementById(id))
    .filter(Boolean);

  if (sectionEls.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (!visible.length) return;
        const id = visible[0].target.id;
        const match = navSections.find((s) => s.id === id);
        if (match) setActiveNav(match.nav);
      },
      { rootMargin: '-40% 0px -45% 0px', threshold: [0, 0.15, 0.4] },
    );
    sectionEls.forEach((el) => observer.observe(el));
    setActiveNav('home');
  }

  const parallaxEl = document.querySelector('[data-parallax]:not(#heroDevice)');
  if (parallaxEl && !reducedMotion) {
    window.addEventListener('scroll', () => {
      if (window.scrollY < window.innerHeight) {
        parallaxEl.style.transform = `translateY(${window.scrollY * 0.08}px)`;
      }
    }, { passive: true });
  }

  const trackWrap = screensTrack?.parentElement;
  if (trackWrap && screensProgress) {
    trackWrap.addEventListener('scroll', () => {
      const max = trackWrap.scrollWidth - trackWrap.clientWidth;
      const pct = max > 0 ? (trackWrap.scrollLeft / max) * 100 : 0;
      screensProgress.style.width = `${Math.max(20, 20 + pct * 0.8)}%`;
    }, { passive: true });
  }

  if (testimonialsTrack && !reducedMotion) {
    testimonialsTrack.innerHTML += testimonialsTrack.innerHTML;
  } else if (testimonialsTrack) {
    testimonialsTrack.style.animation = 'none';
  }

  // Hero mobile floats carousel
  const floatData = [
    { icon: '🔥', label: 'Calories', value: 'Vos stats' },
    { icon: '🎯', label: 'Objectif', value: 'Vos séances' },
    { icon: '🤖', label: 'Programme IA', value: 'Sur mesure' },
    { icon: '📈', label: 'Progression', value: 'En temps réel' },
  ];

  if (heroFloatsMobile && window.innerWidth < 768) {
    let floatIndex = 0;
    heroFloatsMobile.innerHTML = '<div class="hero-float-mobile"></div>';
    const el = heroFloatsMobile.querySelector('.hero-float-mobile');

    function renderFloat() {
      const f = floatData[floatIndex];
      el.innerHTML = `<span>${f.icon}</span><div><small>${f.label}</small><strong>${f.value}</strong></div>`;
      el.classList.remove('fade-in');
      void el.offsetWidth;
      el.classList.add('fade-in');
    }

    renderFloat();
    if (!reducedMotion) {
      setInterval(() => {
        floatIndex = (floatIndex + 1) % floatData.length;
        renderFloat();
      }, 3200);
    }
  }

  // Configurator
  const configData = {};
  let configStepIndex = 0;
  const getConfigSteps = () => window.PulseFitConfigSteps?.[currentLang] || window.PulseFitConfigSteps.fr;
  let configSteps = getConfigSteps();

  function trapFocus(container) {
    const focusable = container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    container.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    first?.focus();
  }

  function lockBody(lock) {
    document.body.style.overflow = lock ? 'hidden' : '';
  }

  function openModal(el) {
    if (!el) return;
    el.hidden = false;
    lockBody(true);
    const panel = el.querySelector('.config-modal__panel, .video-modal__panel');
    if (panel) trapFocus(panel);
  }

  function closeModal(el) {
    if (!el) return;
    el.hidden = true;
    if (configModal?.hidden && videoModal?.hidden) lockBody(false);
  }

  function getProgramRecommendation() {
    const goal = configData.goal || '';
    if (goal.includes('poids')) return 'Metabolic Burn 8 semaines';
    if (goal.includes('muscle')) return 'Hypertrophy Builder 10 semaines';
    if (goal.includes('Performance')) return 'Athletic Performance Stack';
    return 'Reboot Fitness Progressif';
  }

  function updateConfigProgress() {
    if (!configProgress) return;
    const ratio = (configStepIndex / (configSteps.length + 1)) * 100;
    configProgress.style.width = `${Math.min(100, Math.max(8, ratio))}%`;
  }

  function renderConfigStep() {
    configSteps = getConfigSteps();
    const step = configSteps[configStepIndex];
    updateConfigProgress();
    configContent.innerHTML = `
      <div class="config-step">
        <h4>${step.question}</h4>
        <div class="config-options">
          ${step.options.map((o) => `<button type="button" class="config-option" data-value="${o}">${o}</button>`).join('')}
        </div>
      </div>`;
    configContent.querySelectorAll('.config-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        configContent.querySelectorAll('.config-option').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        configData[step.key] = btn.dataset.value;
        setTimeout(() => {
          configStepIndex += 1;
          if (configStepIndex < configSteps.length) renderConfigStep();
          else renderConfigLoading();
        }, 300);
      });
    });
  }

  function renderConfigLoading() {
    configProgress.style.width = '92%';
    configContent.innerHTML = `
      <div class="config-loading">
        <div class="config-loading__spinner"></div>
        <h4>${t('config_loading')}</h4>
      </div>`;
    setTimeout(renderConfigResult, 1400);
  }

  function renderConfigResult() {
    configProgress.style.width = '100%';
    const program = getProgramRecommendation();
    const payload = { ...configData, program };
    try {
      sessionStorage.setItem('pulsefit-program', JSON.stringify(payload));
      window.PulseFitStore?.setProgram(payload);
    } catch (_) { /* ignore */ }

    configContent.innerHTML = `
      <div class="config-result">
        <h4>${t('config_ready')}</h4>
        <ul>
          <li><span>${currentLang === 'fr' ? 'Objectif' : 'Goal'}</span><span>${configData.goal || '-'}</span></li>
          <li><span>${currentLang === 'fr' ? 'Niveau' : 'Level'}</span><span>${configData.level || '-'}</span></li>
          <li><span>${currentLang === 'fr' ? 'Durée / séance' : 'Duration'}</span><span>${configData.duration || '-'}</span></li>
          <li><span>${currentLang === 'fr' ? 'Séances / semaine' : 'Sessions / week'}</span><span>${configData.sessions || '-'}</span></li>
          <li><span>${currentLang === 'fr' ? 'Programme' : 'Program'}</span><span>${program}</span></li>
        </ul>
        <a href="${isLoggedIn() ? 'program/' : 'login/'}" class="btn btn--primary btn--block">${isLoggedIn() ? (currentLang === 'fr' ? 'Voir mon programme' : 'View my program') : t('config_dashboard')}</a>
        <button type="button" class="btn btn--ghost btn--block" data-action="config-restart">${t('config_restart')}</button>
      </div>`;

    configContent.querySelector('[data-action="config-restart"]')?.addEventListener('click', () => {
      configStepIndex = 0;
      configSteps.forEach((s) => { configData[s.key] = ''; });
      renderConfigStep();
    });
  }

  function openConfigurator() {
    configStepIndex = 0;
    configSteps = getConfigSteps();
    configSteps.forEach((s) => { configData[s.key] = ''; });
    document.getElementById('configTitle').textContent = t('config_title');
    openModal(configModal);
    renderConfigStep();
  }

  window.PulseFit = { openConfigurator };

  function isLoggedIn() {
    return sessionStorage.getItem('pulsefit-authed') === '1';
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="goto-program"]')) {
      e.preventDefault();
      closeMobileMenu();
      location.href = 'program/';
      return;
    }
    if (e.target.closest('[data-action="goto-dashboard"]')) {
      e.preventDefault();
      closeMobileMenu();
      location.href = 'dashboard/';
      return;
    }
    if (e.target.closest('[data-action="config"]')) {
      e.preventDefault();
      closeMobileMenu();
      if (isLoggedIn()) {
        const hasProgram = window.PulseFitStore?.load?.()?.program;
        location.href = hasProgram ? 'program/' : 'dashboard/';
        return;
      }
      openConfigurator();
    }
  });

  configClose?.addEventListener('click', () => closeModal(configModal));
  configModal?.querySelector('[data-close-config]')?.addEventListener('click', () => closeModal(configModal));

  if (window.location.hash === '#open-config') openConfigurator();

  // Before/after
  function setBaPosition(value) {
    const pct = `${value}%`;
    if (baAfterLayer) baAfterLayer.style.clipPath = `inset(0 0 0 ${pct})`;
    if (baHandle) baHandle.style.left = pct;
  }

  function loadProfile(index) {
    const p = transformProfiles[index];
    if (!p) return;
    document.getElementById('baBeforeImg').src = p.beforeImg;
    document.getElementById('baAfterImg').src = p.afterImg;
    document.getElementById('baBeforeWeight').textContent = p.before;
    document.getElementById('baAfterWeight').textContent = p.after;
    document.getElementById('baLoss').textContent = p.loss;
    document.getElementById('baDuration').textContent = p.duration;
    document.querySelectorAll('.transform-tab').forEach((tab, i) => tab.classList.toggle('active', i === index));
    document.querySelectorAll('#baTimeline span').forEach((span, i) => {
      span.classList.toggle('active', i === p.weekHighlight);
    });
  }

  baInput?.addEventListener('input', (e) => setBaPosition(e.target.value));
  setBaPosition(baInput?.value || 52);
  loadProfile(0);
  document.querySelectorAll('.transform-tab').forEach((tab) => {
    tab.addEventListener('click', () => loadProfile(Number(tab.dataset.profile)));
  });

  // Video demo
  function startDemoCycle() {
    const cards = document.querySelectorAll('.demo-screen__card');
    let i = 0;
    demoInterval = setInterval(() => {
      cards.forEach((c) => c.classList.remove('active'));
      cards[i].classList.add('active');
      i = (i + 1) % cards.length;
    }, 1800);
  }

  function stopDemoCycle() {
    if (demoInterval) clearInterval(demoInterval);
    demoInterval = null;
  }

  document.getElementById('videoDemoTrigger')?.addEventListener('click', () => {
    openModal(videoModal);
    startDemoCycle();
  });

  videoModal?.querySelectorAll('[data-close-video]').forEach((btn) => {
    btn.addEventListener('click', () => {
      stopDemoCycle();
      closeModal(videoModal);
    });
  });

  // Metrics
  function animateMetric(el) {
    const target = Number(el.dataset.metric);
    const suffix = el.dataset.suffix || '';
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / 2200, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = `${Math.round(target * eased).toLocaleString('fr-FR')}${suffix}`;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  let metricsDone = false;
  function initMetrics() {
    if (metricsDone) return;
    metricsDone = true;
    document.querySelectorAll('.metric-card__value[data-metric]').forEach(animateMetric);
  }

  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { display: false }, y: { display: false } },
    animation: { duration: reducedMotion ? 0 : 1800 },
  };

  function createLineChart(id, data, color) {
    const ctx = document.getElementById(id);
    if (!ctx || typeof Chart === 'undefined') return;
    new Chart(ctx, {
      type: 'line',
      data: { labels: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'], datasets: [{ data, borderColor: color, backgroundColor: `${color}22`, fill: true, tension: 0.4, borderWidth: 2, pointRadius: 0 }] },
      options: { ...chartDefaults, scales: { x: { display: false }, y: { display: false, min: Math.min(...data) * 0.95 } } },
    });
  }

  function createBarChart(id, data, color) {
    const ctx = document.getElementById(id);
    if (!ctx || typeof Chart === 'undefined') return;
    new Chart(ctx, {
      type: 'bar',
      data: { labels: ['L', 'M', 'M', 'J', 'V', 'S', 'D'], datasets: [{ data, backgroundColor: data.map((_, i) => (i === data.length - 1 ? color : `${color}66`)), borderRadius: 6 }] },
      options: chartDefaults,
    });
  }

  let chartsInitialized = false;
  function initCharts() {
    if (chartsInitialized) return;
    chartsInitialized = true;
    createLineChart('chartWeight', [82, 80.5, 79.2, 78.1, 77, 75.8, 74], '#22C55E');
    createBarChart('chartCalories', [2100, 2400, 1900, 2600, 2200, 2800, 2500], '#3B82F6');
    createBarChart('chartSessions', [4, 5, 6, 5, 7, 8, 7], '#22C55E');
  }

  function animateCounter(el, target) {
    const isFloat = String(target).includes('.');
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / 2000, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = target * eased;
      el.textContent = isFloat ? v.toFixed(1) : Math.round(v).toLocaleString('fr-FR');
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function initCounters() {
    document.querySelectorAll('.chart-card__metric[data-count]').forEach((el) => {
      const t = parseFloat(el.dataset.count);
      if (!Number.isNaN(t)) animateCounter(el, t);
    });
  }

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      if (entry.target.id === 'dashboard') { initCharts(); initCounters(); }
      if (entry.target.id === 'metrics') initMetrics();
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll(
    '.section-header, .screen-card, .program-cta__card, .chart-card, .ai-bubble, .ba-compare, .price-card, .cta-final__content, .testimonial-card, .testimonial-featured, .metric-card, .why-card, .partner-logo, .faq-item, .step-card, .daily-loop__card, .daily-loop__cta, .mobile-device, .mobile-showcase__cta, .landing-feature-card, .transform, .social-proof, .pricing, .faq'
  ).forEach((el) => {
    el.classList.add('reveal');
    revealObserver.observe(el);
  });

  const metricsEl = document.getElementById('metrics');
  if (metricsEl) revealObserver.observe(metricsEl);

  document.querySelectorAll('.chart-card, .price-card, .why-card, .step-card, .landing-feature-card, .metric-card, .testimonial-card, .float-card').forEach((el) => el.classList.add('depth-hover'));

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!configModal?.hidden) closeModal(configModal);
    if (!videoModal?.hidden) { stopDemoCycle(); closeModal(videoModal); }
  });
})();
