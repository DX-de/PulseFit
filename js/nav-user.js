/**
 * PulseFit — Bloc utilisateur navbar (landing)
 */
(function () {
  'use strict';

  const PLAN_MEMBER = {
    free: 'Free Member',
    pro: 'Pro Member',
    elite: 'Elite Member',
  };

  const UD = () => window.PulseFitUserDisplay;

  function readUser() {
    try {
      return window.PulseFitAuth?.getUser?.() || JSON.parse(sessionStorage.getItem('pulsefit-user') || 'null');
    } catch {
      return null;
    }
  }

  async function checkSupabaseSession() {
    if (!window.PulseFitAuth?.getSession) return false;
    try {
      const session = await window.PulseFitAuth.getSession();
      return Boolean(session?.user);
    } catch {
      return false;
    }
  }

  async function isAuthenticated() {
    if (window.PulseFitAuth?.initSession) {
      try {
        await window.PulseFitAuth.initSession();
      } catch {
        /* Supabase optionnel */
      }
    }

    const supabaseOk = await checkSupabaseSession();
    if (supabaseOk) return true;

    const flag = sessionStorage.getItem('pulsefit-authed') === '1';
    const user = readUser();
    if (flag && user && (user.email || user.firstName || user.id)) return true;

    if (flag && !user) sessionStorage.removeItem('pulsefit-authed');
    return false;
  }

  function buildSession(authed, user) {
    if (!authed) return { authed: false };

    const state = window.PulseFitStore?.load?.() || {};
    const profile = state.profile || {};
    const stats = window.PulseFitStore?.getStatsFromState?.(state) || window.PulseFitStore?.getStats?.() || {};
    const firstName = UD()?.displayFirstName?.(profile, user) || '';
    const plan = (state.subscription || 'free').toLowerCase();
    const avatar = UD()?.avatarUrl?.(profile, user) || '';
    const streak = state.streak?.current ?? stats.streak ?? 0;
    const xp = stats.xp ?? state.gamification?.xp ?? 0;
    const hasProgram = Boolean(state.program);

    return {
      authed: true,
      firstName,
      plan,
      planLine: PLAN_MEMBER[plan] || PLAN_MEMBER.free,
      avatar,
      xp,
      streak,
      hasProgram,
      ctaHref: hasProgram ? 'program/' : 'dashboard/',
      ctaKey: hasProgram ? 'nav_continue_program' : 'nav_dashboard',
    };
  }

  async function getSession() {
    const authed = await isAuthenticated();
    if (!authed) return { authed: false };
    return buildSession(true, readUser());
  }

  function setAuthVisibility(authed) {
    document.documentElement.classList.toggle('nav-is-authed', authed);
    document.body.classList.toggle('nav-is-authed', authed);
    document.querySelectorAll('[data-nav-auth-guest]').forEach((el) => {
      el.hidden = authed;
      el.setAttribute('aria-hidden', String(authed));
    });
    document.querySelectorAll('[data-nav-auth-user]').forEach((el) => {
      el.hidden = !authed;
      el.setAttribute('aria-hidden', String(!authed));
    });
  }

  function updateFields(session) {
    const nameLabel = session.firstName || 'Mon compte';
    document.querySelectorAll('[data-nav-user-name]').forEach((el) => {
      el.textContent = nameLabel;
    });
    document.querySelectorAll('[data-nav-user-plan-line]').forEach((el) => {
      el.textContent = session.planLine;
      el.className = `nav__user-plan-line nav__user-plan-line--${session.plan}`;
    });
    document.querySelectorAll('[data-nav-user-xp]').forEach((el) => {
      el.textContent = `${session.xp} XP`;
    });
    document.querySelectorAll('[data-nav-user-streak]').forEach((el) => {
      el.textContent = `🔥 ${session.streak} jour${session.streak > 1 ? 's' : ''}`;
    });
    document.querySelectorAll('[data-nav-user-avatar]').forEach((el) => {
      el.src = session.avatar;
      el.alt = nameLabel;
    });
    document.querySelectorAll('[data-nav-authed-cta]').forEach((el) => {
      el.href = session.ctaHref;
      const lang = document.documentElement.lang || 'fr';
      const labels = window.PulseFitLocales?.[lang] || window.PulseFitLocales?.fr || {};
      el.textContent = labels[session.ctaKey] || (session.hasProgram ? 'Continuer mon programme' : 'Dashboard');
    });
    document.querySelectorAll('[data-nav-user-plan]').forEach((el) => {
      el.textContent = session.plan.toUpperCase();
      el.classList.remove('nav__user-plan--free', 'nav__user-plan--pro', 'nav__user-plan--elite');
      el.classList.add(`nav__user-plan--${session.plan}`);
    });
  }

  async function render() {
    window.PulseFitAuth?.clearLegacyDemo?.();
    const session = await getSession();
    setAuthVisibility(session.authed);
    if (session.authed) updateFields(session);
    if (window.PulseFitLanding?.refresh) await window.PulseFitLanding.refresh();
  }

  function closeDropdowns() {
    document.querySelectorAll('.nav__user-wrap.is-open').forEach((wrap) => {
      wrap.classList.remove('is-open');
      wrap.querySelector('.nav__user')?.setAttribute('aria-expanded', 'false');
      wrap.querySelector('.nav__dropdown')?.setAttribute('hidden', '');
    });
  }

  let dropdownBound = false;

  function bindDropdowns() {
    if (dropdownBound) return;
    dropdownBound = true;

    document.querySelectorAll('.nav__user-wrap').forEach((wrap) => {
      const btn = wrap.querySelector('.nav__user');
      const menu = wrap.querySelector('.nav__dropdown');
      if (!btn || !menu) return;
      menu.addEventListener('click', (e) => e.stopPropagation());
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = wrap.classList.contains('is-open');
        closeDropdowns();
        if (!open) {
          wrap.classList.add('is-open');
          btn.setAttribute('aria-expanded', 'true');
          menu.removeAttribute('hidden');
        }
      });
    });

    document.addEventListener('click', closeDropdowns);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDropdowns();
    });
  }

  function bindLogout() {
    document.querySelectorAll('[data-nav-logout]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        closeDropdowns();
        if (window.PulseFitAuth?.logout) await window.PulseFitAuth.logout();
        sessionStorage.removeItem('pulsefit-authed');
        sessionStorage.removeItem('pulsefit-user');
        document.documentElement.classList.remove('nav-is-authed');
        await render();
        location.href = 'index.html';
      });
    });
  }

  async function init() {
    await render();
    bindDropdowns();
    bindLogout();
    window.addEventListener('storage', (e) => {
      if (e.key === 'pulsefit-app-state' || e.key === 'pulsefit-authed') {
        render();
      }
    });
    window.PulseFitNavUser = { refresh: render, getSession };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
