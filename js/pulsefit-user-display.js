/**
 * PulseFit — Affichage profil (données réelles uniquement, pas de placeholders fictifs)
 */
(function (global) {
  'use strict';

  function readAuthUser() {
    try {
      return global.PulseFitAuth?.getUser?.() || JSON.parse(sessionStorage.getItem('pulsefit-user') || 'null');
    } catch {
      return null;
    }
  }

  function displayFirstName(profile, user) {
    const p = profile || {};
    const u = user || readAuthUser();
    if (p.firstName && String(p.firstName).trim()) return String(p.firstName).trim();
    if (u?.firstName && String(u.firstName).trim()) return String(u.firstName).trim();
    if (p.name && String(p.name).trim()) return String(p.name).trim().split(/\s+/)[0];
    if (u?.name && String(u.name).trim()) return String(u.name).trim().split(/\s+/)[0];
    if (u?.email) return String(u.email).split('@')[0];
    return '';
  }

  function displayFullName(profile, user) {
    const p = profile || {};
    const u = user || readAuthUser();
    const fn = displayFirstName(p, u);
    const ln = (p.lastName || u?.lastName || '').trim();
    if (fn && ln) return `${fn} ${ln}`;
    if (p.name && String(p.name).trim()) return String(p.name).trim();
    if (fn) return fn;
    if (u?.email) return String(u.email).split('@')[0];
    return '';
  }

  function avatarUrl(profile, user) {
    const p = profile || {};
    if (p.avatar && String(p.avatar).trim() && !String(p.avatar).includes('pravatar.cc')) {
      return p.avatar;
    }
    const label = displayFirstName(p, user) || displayFullName(p, user) || '?';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(label)}&background=22C55E&color=050505&size=256&bold=true`;
  }

  function greeting(profile, user) {
    const name = displayFirstName(profile, user);
    return name ? `Bonjour, ${name}` : 'Bonjour';
  }

  global.PulseFitUserDisplay = {
    displayFirstName,
    displayFullName,
    avatarUrl,
    greeting,
    readAuthUser,
  };
})(typeof window !== 'undefined' ? window : globalThis);
