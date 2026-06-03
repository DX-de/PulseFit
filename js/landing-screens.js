/**
 * PulseFit — Section « L'application » : tilt 3D, glow, carte active au scroll
 */
(function () {
  'use strict';

  const section = document.getElementById('screens');
  const track = document.getElementById('screensTrack');
  if (!section || !track) return;

  const cards = [...track.querySelectorAll('.screen-card')];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setCardTilt(card, x, y) {
    const inner = card.querySelector('.screen-card__inner');
    const device = card.querySelector('.screen-card__device');
    const phone = card.querySelector('.app-phone');
    if (!inner) return;
    const rotY = x * 10;
    const rotX = -y * 8;
    inner.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    if (device) device.style.transform = `scale(1.04) translateZ(14px) rotateY(${rotY * 0.5}deg)`;
    if (phone) phone.style.transform = `rotateY(${rotY * 0.35}deg) rotateX(${rotX * 0.25}deg)`;
  }

  function resetCardTilt(card) {
    const inner = card.querySelector('.screen-card__inner');
    const device = card.querySelector('.screen-card__device');
    const phone = card.querySelector('.app-phone');
    if (inner) inner.style.transform = '';
    if (device) device.style.transform = '';
    if (phone) phone.style.transform = '';
  }

  if (!reduced) {
    cards.forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        setCardTilt(card, x, y);
        card.classList.add('is-active');
      });
      card.addEventListener('mouseleave', () => {
        resetCardTilt(card);
        card.classList.remove('is-active');
      });
    });
  }

  const wrap = track.parentElement;
  const progress = document.getElementById('screensProgress');

  function updateActiveFromScroll() {
    if (!wrap || reduced) return;
    const center = wrap.scrollLeft + wrap.clientWidth / 2;
    let closest = null;
    let minDist = Infinity;
    cards.forEach((card) => {
      const left = card.offsetLeft;
      const w = card.offsetWidth;
      const cardCenter = left + w / 2;
      const dist = Math.abs(center - cardCenter);
      if (dist < minDist) {
        minDist = dist;
        closest = card;
      }
    });
    cards.forEach((c) => c.classList.toggle('is-active', c === closest && minDist < wrap.clientWidth * 0.45));
  }

  if (wrap) {
    wrap.addEventListener('scroll', () => {
      updateActiveFromScroll();
      if (progress) {
        const max = wrap.scrollWidth - wrap.clientWidth;
        const pct = max > 0 ? wrap.scrollLeft / max : 0;
        progress.style.width = `${Math.max(18, 18 + pct * 82)}%`;
      }
    }, { passive: true });
    updateActiveFromScroll();
  }

  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('is-visible');
        });
      },
      { root: wrap, threshold: 0.35 }
    );
    cards.forEach((c) => io.observe(c));
  }
})();
