/**
 * PulseFit — Personnalisation landing (uniquement données utilisateur réelles)
 */
(function () {
  'use strict';

  const Store = () => window.PulseFitStore;
  const UD = () => window.PulseFitUserDisplay;

  const GUEST_PREVIEW = {
    greet: 'Votre tableau de bord',
    avatarLetter: '·',
    progressPct: 0,
    ringOffset: 327,
    caloriesToday: 0,
    trainMin: 0,
    sessionTitle: 'Aucune séance',
    sessionMin: 0,
    streak: 0,
    xp: 0,
    weightLost: null,
  };

  function buildFromAuthSync() {
    const authed = document.body.classList.contains('nav-is-authed');
    if (!authed) return null;

    const state = Store()?.load?.() || {};
    const profile = state.profile || {};
    const stats = Store()?.getStatsFromState?.(state) || Store()?.getStats?.() || {};
    const user = UD()?.readAuthUser?.();
    const today = Store()?.todayISO?.() || new Date().toISOString().slice(0, 10);
    const firstName = UD()?.displayFirstName?.(profile, user) || '';
    const progressPct = stats.progressPct ?? state.goals?.progressPct ?? 0;
    const ringOffset = Math.round(327 - (327 * progressPct) / 100);
    const nutritionTotals = global.PulseFitNutrition?.getDayTotals?.(today);
    const caloriesToday = nutritionTotals?.calories ?? stats.caloriesToday ?? 0;
    const todaySession = state.schedule?.find((s) => s.date === today);
    const startW = Number(profile.startWeight);
    const weight = Number(profile.weight);
    let weightLost = null;
    if (Number.isFinite(startW) && Number.isFinite(weight) && startW > weight) {
      weightLost = (startW - weight).toFixed(1);
    }

    return {
      authed: true,
      firstName,
      greet: UD()?.greeting?.(profile, user) || 'Bonjour',
      weight,
      targetWeight: profile.targetWeight,
      goal: profile.goal,
      xp: stats.xp ?? state.gamification?.xp ?? 0,
      streak: state.streak?.current ?? stats.streak ?? 0,
      progressPct,
      ringOffset,
      caloriesToday: Math.round(caloriesToday),
      trainMin: stats.trainMin ?? 0,
      sessionTitle: todaySession?.title || 'Aucune séance planifiée',
      sessionMin: todaySession?.durationMin || 0,
      avatarLetter: (firstName.charAt(0) || '?').toUpperCase(),
      plan: state.subscription || 'free',
      weightLost,
      hasSession: Boolean(todaySession),
    };
  }

  async function getUserData() {
    const session = window.PulseFitNavUser?.getSession?.();
    if (session && typeof session.then === 'function') {
      const s = await session;
      if (!s?.authed) return null;
      return buildFromAuthSync();
    }
    return buildFromAuthSync();
  }

  function setText(sel, text) {
    document.querySelectorAll(sel).forEach((el) => {
      if (text != null && text !== '') el.textContent = text;
    });
  }

  function fmtKcal(n) {
    if (!n) return '0';
    return n.toLocaleString('fr-FR');
  }

  function setLiveCard(data) {
    const wrap = document.querySelector('.hero__parallax-item--live');
    if (!wrap) return;
    wrap.hidden = false;
    const card = wrap.querySelector('.hero__live-card');
    const counts = card.querySelectorAll('.hero__count');
    if (counts[0]) {
      const lost = data.weightLost != null ? `−${data.weightLost}` : '—';
      counts[0].textContent = data.weightLost != null ? `${lost} kg` : '—';
      counts[0].removeAttribute('data-count-end');
    }
    if (counts[1]) {
      const done = Store()?.getStats?.()?.sessionsDone ?? 0;
      counts[1].textContent = String(done);
      counts[1].removeAttribute('data-count-end');
    }
    if (counts[2]) {
      counts[2].textContent = String(data.streak ?? 0);
      counts[2].removeAttribute('data-count-end');
    }
    const labels = card.querySelectorAll('.hero__live-stats span');
    if (labels[0]) labels[0].textContent = 'kg perdus (vous)';
    if (labels[1]) labels[1].textContent = 'séances cette semaine';
    if (labels[2]) labels[2].textContent = 'jours de streak';
  }

  function applyGuestPreview() {
    const g = GUEST_PREVIEW;
    setText('[data-landing-phone-greet]', g.greet);
    setText('[data-landing-phone-avatar]', g.avatarLetter);
    setText('[data-landing-phone-progress]', '—');
    setText('[data-landing-phone-kcal]', '0');
    setText('[data-landing-phone-min]', '0');
    setText('[data-landing-phone-session]', 'Connectez-vous pour voir votre séance');
    setText('[data-landing-phone-steps]', '—');

    document.querySelectorAll('[data-landing-hover-goal]').forEach((el) => { el.textContent = '—'; });
    document.querySelectorAll('[data-landing-hover-cal]').forEach((el) => { el.innerHTML = '— <small>kcal</small>'; });
    document.querySelectorAll('[data-landing-hover-weight]').forEach((el) => { el.innerHTML = '— <small>kg</small>'; });
    document.querySelectorAll('[data-landing-hover-xp]').forEach((el) => { el.textContent = '—'; });
    document.querySelectorAll('[data-landing-hover-streak]').forEach((el) => { el.innerHTML = '— <small>jours</small>'; });

    document.querySelectorAll('.float-card--1 .float-card__value').forEach((el) => {
      el.innerHTML = '— <span>kcal</span>';
    });
    const fill = document.querySelector('.float-card--1 .float-card__fill');
    if (fill) fill.style.width = '0%';
    document.querySelectorAll('.float-card--2 .float-card__value').forEach((el) => {
      el.textContent = 'Vos séances';
    });
    document.querySelectorAll('.float-card--2 .float-card__meta').forEach((el) => {
      el.textContent = 'Après connexion';
    });
    document.querySelectorAll('.float-card--4 .float-card__value').forEach((el) => {
      el.textContent = '—';
    });

    const ring = document.querySelector('[data-landing-phone-ring]');
    if (ring) ring.setAttribute('stroke-dashoffset', '327');

    document.querySelectorAll('.hero__parallax-item--live').forEach((el) => { el.hidden = true; });
  }

  function applyPhone(data) {
    setText('[data-landing-phone-greet]', data.greet);
    setText('[data-landing-phone-avatar]', data.avatarLetter);
    setText('[data-landing-phone-progress]', `${data.progressPct}%`);
    setText('[data-landing-phone-kcal]', fmtKcal(data.caloriesToday));
    setText('[data-landing-phone-min]', String(data.trainMin));
    const sessionLabel = data.hasSession
      ? `${data.sessionTitle} · ${data.sessionMin} min`
      : data.sessionTitle;
    setText('[data-landing-phone-session]', sessionLabel);

    const ring = document.querySelector('[data-landing-phone-ring]');
    if (ring) ring.setAttribute('stroke-dashoffset', String(data.ringOffset));

    document.querySelectorAll('[data-landing-hover-goal]').forEach((el) => {
      el.textContent = `${data.progressPct}%`;
    });
    document.querySelectorAll('[data-landing-hover-cal]').forEach((el) => {
      el.innerHTML = `${fmtKcal(data.caloriesToday)} <small>kcal</small>`;
    });
    document.querySelectorAll('[data-landing-hover-streak]').forEach((el) => {
      el.innerHTML = `${data.streak} <small>jours</small>`;
    });
    document.querySelectorAll('[data-landing-hover-xp]').forEach((el) => {
      el.textContent = data.xp > 0 ? `+${data.xp}` : '0';
    });
    document.querySelectorAll('[data-landing-hover-weight]').forEach((el) => {
      if (data.weightLost != null) {
        el.innerHTML = `−${data.weightLost} <small>kg</small>`;
      } else {
        el.innerHTML = '— <small>kg</small>';
      }
    });

    document.querySelectorAll('.float-card--1 .float-card__value').forEach((el) => {
      el.innerHTML = `${fmtKcal(data.caloriesToday)} <span>kcal</span>`;
    });
    const fill = document.querySelector('.float-card--1 .float-card__fill');
    if (fill) fill.style.width = `${Math.min(100, data.progressPct)}%`;
    document.querySelectorAll('.float-card--2 .float-card__value').forEach((el) => {
      el.textContent = data.sessionTitle;
    });
    document.querySelectorAll('.float-card--2 .float-card__meta').forEach((el) => {
      el.textContent = data.hasSession
        ? `${data.sessionMin} min · ${data.goal || 'objectif à définir'}`
        : 'Configurez votre programme';
    });
    document.querySelectorAll('.float-card--4 .float-card__value').forEach((el) => {
      el.textContent = data.progressPct > 0 ? `+${data.progressPct}%` : '0%';
    });
    setLiveCard(data);
  }

  function applyCtaAuthed() {
    document.body.classList.add('landing-authed');
    const hasProgram = Store()?.load?.()?.program;

    document.querySelectorAll('[data-landing-cta-main]').forEach((btn) => {
      const lang = document.documentElement.lang || 'fr';
      const L = window.PulseFitLocales?.[lang] || window.PulseFitLocales?.fr || {};
      const label = hasProgram
        ? (L.hero_cta_program || 'Continuer mon programme')
        : (L.hero_cta_dashboard || 'Accéder à mon Dashboard');
      const span = btn.querySelector('[data-i18n="hero_cta"]') || btn.querySelector('span:last-child');
      if (span) span.textContent = label;
      btn.dataset.action = hasProgram ? 'goto-program' : 'goto-dashboard';
    });

    document.querySelectorAll('[data-landing-cta-note]').forEach((el) => { el.hidden = true; });
    document.querySelectorAll('.hero__honesty').forEach((el) => { el.hidden = true; });
  }

  function applyGuest() {
    document.body.classList.remove('landing-authed');
    applyGuestPreview();
    document.querySelectorAll('[data-landing-cta-note]').forEach((el) => { el.hidden = false; });
    document.querySelectorAll('.hero__honesty').forEach((el) => { el.hidden = false; });
  }

  async function personalize() {
    let data = null;
    try {
      data = await getUserData();
    } catch {
      data = buildFromAuthSync();
    }
    if (!data?.authed) {
      applyGuest();
      return;
    }
    applyPhone(data);
    applyCtaAuthed(data);
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="goto-program"]');
    if (btn) {
      e.preventDefault();
      location.href = 'program/';
    }
    const dash = e.target.closest('[data-action="goto-dashboard"]');
    if (dash) {
      e.preventDefault();
      location.href = 'dashboard/';
    }
  });

  async function init() {
    await personalize();
    window.PulseFitLanding = { refresh: personalize };
    const origRefresh = window.PulseFitNavUser?.refresh;
    if (origRefresh) {
      window.PulseFitNavUser.refresh = async () => {
        await origRefresh();
        await personalize();
      };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
