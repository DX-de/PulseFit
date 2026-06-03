/**
 * PulseFit — Hero premium · parallax 3D (landing uniquement)
 */
(function () {
  'use strict';

  const hero = document.getElementById('hero');
  if (!hero) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const deviceWrap = document.getElementById('heroDevice');
  const phoneStage = hero.querySelector('[data-hero-parallax="phone"]');
  const phone = document.getElementById('heroPhone');
  const phoneFrame = phone?.querySelector('.phone-mockup__frame');
  const deviceGlow = document.getElementById('heroDeviceGlow');
  const particlesRoot = document.getElementById('heroParticles');
  const contentLayer = hero.querySelector('[data-hero-parallax="content"]');
  const cardLayers = hero.querySelectorAll('.hero__parallax-item');
  const quotesTrack = document.getElementById('heroQuotesTrack');
  const quotesDots = document.getElementById('heroQuotesDots');
  const interactiveCards = document.getElementById('heroInteractiveCards');
  const hoverCards = interactiveCards?.querySelectorAll('.hero-hover-card') || [];

  const DEPTH = {
    content: { tx: 10, ty: 6, tz: 0, rx: 0.4, ry: 0.6, scroll: -0.06 },
    glow: { tx: 14, ty: 10, tz: 0, rx: 0, ry: 0, scroll: -0.08 },
    phone: { tx: 22, ty: 16, tz: 24, rx: 7, ry: 9, scroll: -0.14 },
    'card-1': { tx: 38, ty: 28, tz: 36, rx: 4, ry: 6, scroll: -0.1 },
    'card-2': { tx: 48, ty: 32, tz: 44, rx: 5, ry: 7, scroll: -0.12 },
    'card-3': { tx: 34, ty: 26, tz: 32, rx: 3.5, ry: 5.5, scroll: -0.09 },
    'card-4': { tx: 42, ty: 30, tz: 40, rx: 4.5, ry: 6.5, scroll: -0.11 },
    'card-live': { tx: 52, ty: 34, tz: 48, rx: 5, ry: 8, scroll: -0.13 },
  };

  const parallaxLayers = hero.querySelectorAll('[data-hero-parallax]');
  let parallaxEnabled = !reducedMotion;
  let mouseEnabled = parallaxEnabled && finePointer && window.innerWidth >= 1024;
  let mobileMode = window.innerWidth < 1024;

  function refreshMode() {
    mobileMode = window.innerWidth < 1024;
    mouseEnabled = parallaxEnabled && finePointer && !mobileMode;
    hero.classList.toggle('hero--parallax-active', parallaxEnabled && !reducedMotion);
    hero.classList.toggle('hero--parallax-off', !parallaxEnabled || reducedMotion);
  }

  refreshMode();
  window.addEventListener('resize', refreshMode, { passive: true });

  /* Particules vertes + bleues */
  if (particlesRoot && parallaxEnabled) {
    const count = mobileMode ? 0 : window.innerWidth < 1200 ? 22 : 36;
    for (let i = 0; i < count; i += 1) {
      const p = document.createElement('span');
      const isBlue = i % 3 === 0;
      p.className = `hero__particle ${isBlue ? 'hero__particle--blue' : 'hero__particle--green'}`;
      p.style.left = `${Math.random() * 100}%`;
      p.style.top = `${Math.random() * 100}%`;
      p.style.animationDelay = `${Math.random() * 10}s`;
      p.style.animationDuration = `${12 + Math.random() * 16}s`;
      p.style.opacity = `${0.06 + Math.random() * 0.12}`;
      const size = 1.5 + Math.random() * 2.5;
      p.style.width = p.style.height = `${size}px`;
      particlesRoot.appendChild(p);
    }
  }

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let scrollY = 0;
  function onMouseMove(e) {
    if (!mouseEnabled) return;
    const rect = hero.getBoundingClientRect();
    targetX = (e.clientX - rect.left) / rect.width - 0.5;
    targetY = (e.clientY - rect.top) / rect.height - 0.5;
  }

  function onMouseLeave() {
    targetX = 0;
    targetY = 0;
  }

  function updateScroll() {
    const rect = hero.getBoundingClientRect();
    const h = Math.max(rect.height, 1);
    const progress = Math.min(1, Math.max(0, -rect.top / h));
    scrollY = progress * h * 0.35;
    hero.style.setProperty('--hero-scroll', String(scrollY));
    const glowScale = 1 + progress * 0.12 + (mouseEnabled ? Math.abs(currentX) * 0.06 : 0);
    hero.style.setProperty('--hero-glow-scale', String(glowScale));
  }

  function applyLayer(el, cfg, mx, my, sy) {
    if (!cfg) return;
    const px = mx * cfg.tx;
    const py = my * cfg.ty + sy * cfg.scroll;
    const rz = mx * cfg.ry;
    const rx = -my * cfg.rx;
    el.style.transform = `translate3d(${px}px, ${py}px, ${cfg.tz}px) rotateX(${rx}deg) rotateY(${rz}deg)`;
  }

  function applyPhone(mx, my, sy) {
    const cfg = DEPTH.phone;
    const px = mx * cfg.tx;
    const py = my * cfg.ty + sy * cfg.scroll;
    const rotY = -8 + mx * cfg.ry;
    const rotX = 4 - my * cfg.rx;

    if (phoneStage) {
      phoneStage.style.transform = `translate3d(${px * 0.35}px, ${py * 0.4}px, ${cfg.tz}px)`;
    }
    if (phoneFrame) {
      phoneFrame.style.transform = `rotateY(${rotY}deg) rotateX(${rotX}deg)`;
    } else if (phone) {
      phone.style.transform = `translate3d(${px}px, ${py}px, 0) rotateY(${rotY}deg) rotateX(${rotX}deg)`;
    }
  }

  function tick() {
    if (!parallaxEnabled) return;

    const lerp = mouseEnabled ? 0.07 : 0.12;
    currentX += (targetX - currentX) * lerp;
    currentY += (targetY - currentY) * lerp;

    const mx = mouseEnabled ? currentX : 0;
    const my = mouseEnabled ? currentY : 0;

    hero.style.setProperty('--hero-mx', String(mx));
    hero.style.setProperty('--hero-my', String(my));
    hero.style.setProperty('--hero-glow-shift-x', `${mx * 28}px`);
    hero.style.setProperty('--hero-glow-shift-y', `${my * 18 - scrollY * 0.15}px`);

    if (mobileMode) {
      const sy = scrollY;
      if (contentLayer) contentLayer.style.transform = `translate3d(0, ${-sy * 0.05}px, 0)`;
      if (phoneStage) phoneStage.style.transform = `translate3d(0, ${-sy * 0.18}px, 0)`;
      cardLayers.forEach((el, i) => {
        const factor = 0.08 + i * 0.02;
        el.style.transform = `translate3d(0, ${-sy * factor}px, 0)`;
      });
      if (phoneFrame) phoneFrame.style.transform = 'rotateY(-6deg) rotateX(3deg)';
      return;
    }

    parallaxLayers.forEach((el) => {
      const key = el.getAttribute('data-hero-parallax');
      if (key === 'phone' || key === 'glow') return;
      applyLayer(el, DEPTH[key], mx, my, scrollY);
    });

    applyPhone(mx, my, scrollY);

    if (deviceWrap) {
      deviceWrap.style.setProperty('--hero-px', `${mx * 6}px`);
      deviceWrap.style.setProperty('--hero-py', `${my * 4 - scrollY * 0.08}px`);
    }
  }

  if (parallaxEnabled) {
    hero.addEventListener('mousemove', onMouseMove, { passive: true });
    hero.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('scroll', updateScroll, { passive: true });
    updateScroll();

    let running = true;
    const loop = () => {
      if (!running) return;
      tick();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    if ('IntersectionObserver' in window) {
      const pauseObs = new IntersectionObserver(
        (entries) => {
          running = entries[0]?.isIntersecting ?? true;
          if (running) requestAnimationFrame(loop);
        },
        { rootMargin: '80px 0px', threshold: 0 },
      );
      pauseObs.observe(hero);
    }

    document.addEventListener('visibilitychange', () => {
      running = document.visibilityState === 'visible';
    });
  }

  /* Cartes interactives au survol du téléphone */
  let hoverInterval = null;
  let hoverIndex = 0;

  function setHoverCard(index) {
    hoverCards.forEach((card, i) => card.classList.toggle('is-active', i === index));
    hoverIndex = index;
  }

  function startHoverCycle() {
    if (reducedMotion || hoverCards.length < 2) return;
    stopHoverCycle();
    hoverInterval = setInterval(() => {
      setHoverCard((hoverIndex + 1) % hoverCards.length);
    }, 2200);
  }

  function stopHoverCycle() {
    if (hoverInterval) clearInterval(hoverInterval);
    hoverInterval = null;
  }

  const hoverTarget = phone || deviceWrap;
  if (hoverTarget && interactiveCards) {
    hoverTarget.addEventListener('mouseenter', () => {
      deviceWrap?.classList.add('is-hovered');
      interactiveCards.setAttribute('aria-hidden', 'false');
      startHoverCycle();
    });
    hoverTarget.addEventListener('mouseleave', () => {
      deviceWrap?.classList.remove('is-hovered');
      interactiveCards.setAttribute('aria-hidden', 'true');
      stopHoverCycle();
      setHoverCard(0);
    });
    hoverTarget.addEventListener('focusin', () => deviceWrap?.classList.add('is-hovered'));
    hoverTarget.addEventListener('focusout', () => deviceWrap?.classList.remove('is-hovered'));
  }

  /* Compteurs live */
  function animateCount(el) {
    const end = Number(el.dataset.countEnd) || 0;
    const prefix = el.dataset.countPrefix || '';
    const suffix = el.dataset.countSuffix || '';
    const duration = 1800;
    const start = performance.now();

    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      const current = Math.round(end * eased);
      if (prefix === '-') {
        el.textContent = `-${current}${suffix}`;
      } else if (end >= 1000) {
        el.textContent = `${prefix}${current.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}${suffix}`;
      } else {
        el.textContent = `${prefix}${current}${suffix}`;
      }
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  const countEls = hero.querySelectorAll('.hero__count[data-count-end]');
  if (countEls.length && 'IntersectionObserver' in window) {
    const countObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || entry.target.dataset.counted) return;
          entry.target.dataset.counted = '1';
          if (!reducedMotion) animateCount(entry.target);
        });
      },
      { threshold: 0.3 },
    );
    countEls.forEach((el) => countObs.observe(el));
  }

  /* Carousel témoignages hero */
  const quotes = hero.querySelectorAll('.hero__quote');
  const dotBtns = quotesDots?.querySelectorAll('button') || [];

  function showQuote(index) {
    quotes.forEach((q, i) => q.classList.toggle('is-active', i === index));
    dotBtns.forEach((d, i) => d.classList.toggle('is-active', i === index));
  }

  let quoteIndex = 0;
  let quoteTimer = null;

  function startQuoteCarousel() {
    if (quotes.length < 2 || reducedMotion) return;
    quoteTimer = setInterval(() => {
      quoteIndex = (quoteIndex + 1) % quotes.length;
      showQuote(quoteIndex);
    }, 5000);
  }

  dotBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      quoteIndex = Number(btn.dataset.quote) || 0;
      showQuote(quoteIndex);
      if (quoteTimer) {
        clearInterval(quoteTimer);
        startQuoteCarousel();
      }
    });
  });

  startQuoteCarousel();

  requestAnimationFrame(() => {
    hero.classList.add('hero--loaded');
  });
})();
