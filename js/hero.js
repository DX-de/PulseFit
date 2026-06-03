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
  const deviceGlow = document.getElementById('heroDeviceGlow');
  const particlesRoot = document.getElementById('heroParticles');
  const contentLayer = hero.querySelector('[data-hero-parallax="content"]');
  const cardLayers = hero.querySelectorAll('.hero__parallax-item');
  const quotesDots = document.getElementById('heroQuotesDots');
  const interactiveCards = document.getElementById('heroInteractiveCards');
  const hoverCards = interactiveCards?.querySelectorAll('.hero-hover-card') || [];

  const DEPTH = {
    content: { tx: 12, ty: 8, tz: 0, rx: 0.35, ry: 0.5, scroll: -0.05, idle: 0.4 },
    glow: { tx: 18, ty: 12, tz: 0, rx: 0, ry: 0, scroll: -0.1, idle: 0.25 },
    phone: { tx: 26, ty: 18, tz: 32, rx: 0, ry: 0, scroll: -0.16, idle: 0.55 },
    'card-1': { tx: 44, ty: 30, tz: 42, rx: 5, ry: 7, scroll: -0.11, idle: 1, phase: 0 },
    'card-2': { tx: 54, ty: 36, tz: 52, rx: 6, ry: 8, scroll: -0.13, idle: 1.15, phase: 1.2 },
    'card-3': { tx: 40, ty: 28, tz: 38, rx: 4.5, ry: 6.5, scroll: -0.1, idle: 0.9, phase: 2.4 },
    'card-4': { tx: 48, ty: 32, tz: 46, rx: 5.5, ry: 7.5, scroll: -0.12, idle: 1.05, phase: 3.6 },
    'card-live': { tx: 58, ty: 38, tz: 56, rx: 6, ry: 9, scroll: -0.14, idle: 1.2, phase: 0.8 },
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

  /* Particules — plus de profondeur */
  if (particlesRoot && parallaxEnabled) {
    const count = mobileMode ? 0 : window.innerWidth < 1200 ? 28 : 48;
    for (let i = 0; i < count; i += 1) {
      const p = document.createElement('span');
      const isBlue = i % 4 === 0;
      const isLarge = i % 7 === 0;
      p.className = `hero__particle ${isBlue ? 'hero__particle--blue' : 'hero__particle--green'}${isLarge ? ' hero__particle--lg' : ''}`;
      p.style.left = `${8 + Math.random() * 84}%`;
      p.style.top = `${Math.random() * 100}%`;
      p.style.animationDelay = `${Math.random() * 12}s, ${Math.random() * 4}s`;
      p.style.animationDuration = `${14 + Math.random() * 18}s, ${3 + Math.random() * 3}s`;
      const size = isLarge ? 3.5 + Math.random() * 2 : 1.5 + Math.random() * 2.5;
      p.style.width = p.style.height = `${size}px`;
      p.style.opacity = `${0.08 + Math.random() * 0.14}`;
      particlesRoot.appendChild(p);
    }
  }

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let scrollY = 0;
  let time = 0;

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
    scrollY = progress * h * 0.38;
    hero.style.setProperty('--hero-scroll', String(scrollY));
    const glowScale = 1 + progress * 0.14 + (mouseEnabled ? Math.abs(currentX) * 0.08 : 0);
    hero.style.setProperty('--hero-glow-scale', String(glowScale));
  }

  function idleOffset(cfg, t) {
    const amp = cfg.idle || 0.8;
    const ph = cfg.phase || 0;
    return {
      x: Math.sin(t * 0.55 + ph) * amp * 0.012,
      y: Math.cos(t * 0.48 + ph * 1.1) * amp * 0.01,
      z: Math.sin(t * 0.35 + ph) * amp * 2.5,
    };
  }

  function applyLayer(el, cfg, mx, my, sy, t) {
    if (!cfg) return;
    const idle = idleOffset(cfg, t);
    const px = mx * cfg.tx + idle.x * 40;
    const py = my * cfg.ty + sy * cfg.scroll + idle.y * 40;
    const tz = cfg.tz + idle.z;
    const rz = mx * cfg.ry + idle.x * 3;
    const rx = -my * cfg.rx + idle.y * 2;
    el.style.transform = `translate3d(${px}px, ${py}px, ${tz}px) rotateX(${rx}deg) rotateY(${rz}deg)`;
  }

  function applyPhone(mx, my, sy, t) {
    const cfg = DEPTH.phone;
    const idle = idleOffset(cfg, t);
    const px = mx * cfg.tx + idle.x * 30;
    const py = my * cfg.ty + sy * cfg.scroll + idle.y * 30;

    if (phoneStage) {
      phoneStage.style.transform = `translate3d(${px * 0.4}px, ${py * 0.45}px, ${cfg.tz + idle.z}px)`;
    }
  }

  function tick(now) {
    if (!parallaxEnabled) return;

    const dt = Math.min(0.05, (now - (tick.last || now)) / 1000);
    tick.last = now;
    time += dt;

    const lerp = mouseEnabled ? 0.048 : 0.1;
    currentX += (targetX - currentX) * lerp;
    currentY += (targetY - currentY) * lerp;

    const idleX = Math.sin(time * 0.45) * 0.018;
    const idleY = Math.cos(time * 0.38) * 0.014;
    const mx = mouseEnabled ? currentX + idleX : idleX;
    const my = mouseEnabled ? currentY + idleY : idleY;

    hero.style.setProperty('--hero-mx', String(mx));
    hero.style.setProperty('--hero-my', String(my));
    hero.style.setProperty('--hero-glow-shift-x', `${mx * 32}px`);
    hero.style.setProperty('--hero-glow-shift-y', `${my * 20 - scrollY * 0.18}px`);
    hero.style.setProperty('--hero-shine-x', `${50 + mx * 28}%`);
    hero.style.setProperty('--hero-shine-y', `${32 + my * 22}%`);
    hero.style.setProperty('--hero-orbit-rot', `${time * 14}deg`);

    if (mobileMode) {
      const sy = scrollY;
      if (contentLayer) contentLayer.style.transform = `translate3d(0, ${-sy * 0.05}px, 0)`;
      if (phoneStage) phoneStage.style.transform = `translate3d(0, ${-sy * 0.2}px, 0)`;
      cardLayers.forEach((el, i) => {
        const factor = 0.09 + i * 0.025;
        el.style.transform = `translate3d(0, ${-sy * factor}px, 0)`;
      });
      return;
    }

    parallaxLayers.forEach((el) => {
      const key = el.getAttribute('data-hero-parallax');
      if (key === 'phone' || key === 'glow') return;
      applyLayer(el, DEPTH[key], mx, my, scrollY, time);
    });

    applyPhone(mx, my, scrollY, time);

    if (deviceWrap) {
      deviceWrap.style.setProperty('--hero-px', `${mx * 8}px`);
      deviceWrap.style.setProperty('--hero-py', `${my * 5 - scrollY * 0.1}px`);
    }
  }

  if (parallaxEnabled) {
    hero.addEventListener('mousemove', onMouseMove, { passive: true });
    hero.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('scroll', updateScroll, { passive: true });
    updateScroll();

    let running = true;
    const loop = (now) => {
      if (!running) return;
      tick(now);
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
