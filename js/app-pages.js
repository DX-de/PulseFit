/**
 * PulseFit — Pages SaaS
 */
(function () {
  'use strict';

  const esc = (s) => window.PFApp?.esc(s) ?? String(s);
  const S = () => window.PulseFitStore;
  const rel = (p) => `../${p}/`;

  function topbar(title, eyebrow) {
    const st = S().getStats();
    const state = S().load();
    const levelName = st.level?.name || 'Débutant';
    return `
    <header class="saas-topbar">
      <div>
        <p class="saas-eyebrow">${esc(eyebrow || 'PulseFit SaaS')}</p>
        <h1>${esc(title)}</h1>
      </div>
      <div class="saas-topbar__right">
        <span class="saas-streak-pill">🔥 ${state.streak?.current ?? 0} jours</span>
        <span class="saas-xp-pill">⚡ ${st.xp ?? 0} XP · ${esc(levelName)}</span>
        <button type="button" class="theme-toggle" id="saasThemeToggle" aria-label="Thème">◐</button>
        <img src="${esc(window.PulseFitUserDisplay?.avatarUrl?.(state.profile) || '')}" alt="" width="40" height="40" style="border-radius:50%">
      </div>
    </header>`;
  }

  function weightChart(weights) {
    if (!weights.length) return '<p class="saas-muted">Pas de données</p>';
    const w = 480; const h = 180;
    const vals = weights.map((x) => x.value);
    const min = Math.min(...vals) - 1; const max = Math.max(...vals) + 1;
    const pts = weights.map((item, i) => {
      const x = 30 + (i / Math.max(1, weights.length - 1)) * (w - 60);
      const y = 20 + ((max - item.value) / (max - min || 1)) * (h - 50);
      return `${x},${y}`;
    }).join(' ');
    return `<div class="saas-chart"><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline fill="none" stroke="#22C55E" stroke-width="3" points="${pts}"/></svg></div>`;
  }

  function barChart(days) {
    const max = Math.max(...days.map((d) => d.minutes), 1);
    return `<div class="saas-bar-chart">${days.map((d) => `
      <div class="saas-bar-chart__col">
        <div class="saas-bar-chart__bar" style="height:${(d.minutes / max) * 100}%"></div>
        <span>${d.label}</span>
      </div>`).join('')}</div>`;
  }

  function statsGrid() {
    const st = S().getStats();
    const state = S().load();
    const weight = Number.isFinite(st.weight) ? st.weight : null;
    const target = Number(state.profile?.targetWeight);
    const calories = Number(st.caloriesWeek) || 0;
    const trainMin = Number(st.trainMin) || 0;
    return `
      <div class="saas-grid-stats">
        <article class="saas-stat"><span>Poids actuel</span><strong>${weight != null ? weight.toFixed(1) : '—'}</strong><small>kg · objectif ${Number.isFinite(target) ? target : '—'} kg</small></article>
        <article class="saas-stat"><span>Streak</span><strong>${state.streak?.current ?? 0}</strong><small>record ${state.streak?.longest ?? 0} j</small></article>
        <article class="saas-stat"><span>XP</span><strong>${st.xp ?? 0}</strong><small>${esc(st.level?.name || 'Débutant')}</small></article>
        <article class="saas-stat"><span>Calories (sem.)</span><strong>${calories.toLocaleString('fr-FR')}</strong><small>kcal brûlées</small></article>
        <article class="saas-stat"><span>Séances</span><strong>${st.sessionsDone ?? 0}/${st.sessionsPlanned ?? 0}</strong><small>terminées cette semaine</small></article>
        <article class="saas-stat"><span>Progression</span><strong>${st.progressPct ?? 0}%</strong><small>${trainMin} min d'entraînement</small></article>
      </div>`;
  }

  const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  function fmtDate(iso) {
    return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  function badgesHtml() {
    const state = S().load();
    const badges = state.gamification?.badges || [];
    return S().BADGE_DEFS.map((b) => {
      const ok = badges.includes(b.id);
      return `<span class="saas-badge ${ok ? 'unlocked' : 'locked'}">${b.icon} ${b.name}</span>`;
    }).join('');
  }

  function dashboard(el) {
    const Store = S();
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    const sessionId = params.get('session');
    const session = sessionId ? Store.getSessionById(sessionId) : Store.getTodaySession();

    if (tab === 'workout' && session) {
      el.innerHTML = topbar('Séance du jour', 'Entraînement') + `<div id="workoutMount"></div>`;
      mountWorkout(document.getElementById('workoutMount'), session.id);
      return;
    }

    if (window.PulseFitDashboard?.render) {
      window.PulseFitDashboard.render(el);
      return;
    }
    const state = Store.load();
    const firstName = window.PulseFitUserDisplay?.displayFirstName?.(state.profile) || '';
    const weight = Number(state.profile?.weight);
    const weightLabel = Number.isFinite(weight) ? weight : '—';
    el.innerHTML = topbar(`Bonjour, ${firstName}`, 'Dashboard') + statsGrid() + `
      <div class="saas-grid-2">
        <article class="saas-panel">
          <div class="saas-panel__head"><h2>Progression poids</h2><span>82 → ${weightLabel} kg</span></div>
          ${weightChart(Store.getWeightHistory())}
        </article>
      </div>`;
  }

  function mountWorkout(container, sessionId) {
    const Store = S();
    const sess = Store.getSessionById(sessionId);
    if (!sess) return;
    let seconds = 0; let timer = null;
    container.innerHTML = `
      <article class="saas-panel">
        <div class="saas-panel__head"><h2>${esc(sess.title)}</h2><span>${sess.durationMin} min</span></div>
        <p id="woTimer" style="font-size:2rem;color:var(--energy);font-family:var(--font-display)">00:00</p>
        <button type="button" class="btn btn--ghost btn--sm" id="woStart">Chrono</button>
        <ul style="list-style:none;margin:16px 0;display:grid;gap:8px">
          ${sess.exercises.map((ex) => `<li style="padding:10px;border:1px solid rgba(255,255,255,0.08);border-radius:10px">${esc(ex.name)}</li>`).join('')}
        </ul>
        <button type="button" class="btn btn--primary btn--block" id="woDone">Terminer la séance (+85 XP)</button>
        <a href="${rel('dashboard')}" class="btn btn--ghost btn--sm btn--block" style="margin-top:8px">Retour</a>
      </article>`;
    document.getElementById('woStart')?.addEventListener('click', function () {
      if (timer) { clearInterval(timer); timer = null; this.textContent = 'Reprendre'; return; }
      this.textContent = 'Pause';
      timer = setInterval(() => {
        seconds += 1;
        const m = String(Math.floor(seconds / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        document.getElementById('woTimer').textContent = `${m}:${s}`;
      }, 1000);
    });
    document.getElementById('woDone')?.addEventListener('click', () => {
      Store.completeSession(sessionId, { durationMin: Math.max(1, Math.round(seconds / 60)) || sess.durationMin, calories: sess.calories, feeling: 8 });
      location.href = rel('dashboard');
    });
  }

  function profile(el) {
    const Store = S();
    const state = Store.load();
    const p = state.profile;
    const stats = Store.getProfileStats(state);
    const activity = Store.getActivityHistory(state, 15);
    const photos = state.nutrition?.progressPhotos || { before: {}, after: {} };
    const beforeUrl = photos.before?.face?.url;
    const afterUrl = photos.after?.face?.url;
    let comparePct = 50;
    const avatarSrc = window.PulseFitUserDisplay?.avatarUrl?.(p) || '';
    const canUpload = Boolean(window.PulseFitAvatar?.upload);
    const canPhoto = Boolean(window.PulseFitNutrition?.uploadProgressPhoto || window.PulseFitJournal?.uploadProgressPhoto);
    const build = window.PF_BUILD || '?';
    const plan = stats.plan?.plan || 'free';

    el.innerHTML = topbar('Mon profil', `Compte · ${esc(stats.plan?.badge || plan)}`) + `
      <div class="ach-plan-banner" style="margin-bottom:16px">
        <span>Abonnement <strong>${esc(stats.plan?.name || plan)}</strong></span>
        <span class="ach-plan-badge ach-plan-badge--${plan}">${esc(stats.plan?.badge || plan)}</span>
        <a href="${rel('upgrade')}" class="btn btn--ghost btn--sm">Gérer</a>
      </div>
      <div class="prof-stats">
        <article><strong>${stats.weight != null ? stats.weight.toFixed(1) : '—'}</strong><span>Poids kg</span></article>
        <article><strong>${stats.goalProgressPct}%</strong><span>Objectif</span></article>
        <article><strong>${stats.xp}</strong><span>XP · ${esc(stats.level?.name || '')}</span></article>
        <article><strong>${stats.totalSessions}</strong><span>Séances</span></article>
        <article><strong>${stats.badgesUnlocked}/${stats.badgesTotal}</strong><span>Succès</span></article>
        <article><strong>${stats.streak || 0}j</strong><span>Streak</span></article>
      </div>
      <div class="saas-grid-2" style="margin-bottom:16px">
        <article class="saas-panel">
          <div class="saas-panel__head"><h2>Comparaison avant / après</h2></div>
          <div class="journal-compare" id="profCompare">
            <img src="${esc(afterUrl || beforeUrl || '')}" alt="" class="journal-compare__base" onerror="this.style.opacity=0.2">
            <img src="${esc(beforeUrl || afterUrl || '')}" alt="" class="journal-compare__after" id="profCompareBefore" style="clip-path: inset(0 ${100 - comparePct}% 0 0)" onerror="this.style.opacity=0.2">
            <input type="range" min="0" max="100" value="${comparePct}" id="profCompareSlider" aria-label="Comparer avant après">
          </div>
          <p class="saas-muted" style="margin-top:8px">Photo face · départ vs progression</p>
        </article>
        <article class="saas-panel">
          <div class="saas-panel__head"><h2>Galerie progression</h2><span>${stats.photoCount} photos</span></div>
          <div class="prof-gallery">
            ${['before', 'after'].flatMap((phase) =>
              ['face', 'profile', 'back'].map((angle) => {
                const ph = photos[phase]?.[angle];
                return `<label><img src="${esc(ph?.url || '')}" alt="" onerror="this.src='../assets/logo-nav.png'"><span>${phase === 'before' ? 'Départ' : 'Suivi'} · ${angle}</span>
                  <input type="file" accept="image/*" data-photo-phase="${phase}" data-photo-angle="${angle}" hidden ${canPhoto ? '' : 'disabled'}></label>`;
              })).join('')}
          </div>
          <p class="saas-muted" style="margin-top:8px">Photos stockées sur votre compte (Supabase)</p>
        </article>
      </div>
      <article class="saas-panel" style="margin-bottom:16px">
        <div class="saas-panel__head"><h2>Historique d'activité</h2><a href="${rel('history')}" class="btn btn--ghost btn--sm">Tout voir</a></div>
        <ul class="prof-activity">${activity.length ? activity.map((a) => `
          <li><strong>${esc(a.title)}</strong> · <span class="saas-muted">${esc(a.date)}</span><br>${esc(a.detail)}</li>`).join('') : '<li class="saas-muted">Aucune activité — commencez une séance.</li>'}</ul>
      </article>
      <form class="saas-panel saas-form" id="profileForm">
        <div class="saas-avatar-upload">
          <label class="saas-avatar-upload__pick" for="avatarFileInput" title="Changer la photo">
            <img src="${esc(avatarSrc)}" alt="" id="avatarPreview" width="80" height="80">
            <span class="saas-avatar-upload__overlay">📷</span>
          </label>
          <input type="file" id="avatarFileInput" accept="image/jpeg,image/png,image/webp,image/gif" hidden ${canUpload ? '' : 'disabled'}>
          <input type="hidden" name="avatar" value="${esc(p.avatar || '')}">
          <div>
            <p class="saas-muted" style="margin:0 0 8px">Photo de profil</p>
            <button type="button" class="btn btn--ghost btn--sm" id="avatarPickBtn" ${canUpload ? '' : 'disabled'}>Choisir une image</button>
            <p class="saas-muted" style="font-size:0.8rem;margin-top:8px">JPG, PNG, WebP · max 2 Mo</p>
            <p class="saas-muted" id="avatarUploadStatus" style="font-size:0.8rem;margin-top:6px"></p>
          </div>
        </div>
        <label>Prénom<input type="text" name="firstName" value="${esc(p.firstName)}" required></label>
        <label>Nom<input type="text" name="lastName" value="${esc(p.lastName)}"></label>
        <label>Âge<input type="number" name="age" value="${p.age != null && p.age !== '' ? p.age : ''}" min="16" max="99"></label>
        <label>Sexe<select name="gender"><option ${p.gender === 'homme' ? 'selected' : ''}>homme</option><option ${p.gender === 'femme' ? 'selected' : ''}>femme</option><option ${p.gender === 'autre' ? 'selected' : ''}>autre</option></select></label>
        <label>Taille (cm)<input type="number" name="height" min="100" max="250" step="1" value="${p.height != null && p.height !== '' ? p.height : ''}" required></label>
        <label>Poids actuel (kg)<input type="number" step="0.1" name="weight" value="${p.weight != null && p.weight !== '' ? p.weight : ''}"></label>
        <label>Poids de départ (kg)<input type="number" step="0.1" name="startWeight" value="${p.startWeight != null && p.startWeight !== '' ? p.startWeight : ''}"></label>
        <label>Objectif<select name="goal">
          ${['Perte de poids', 'Prise de muscle', 'Remise en forme', 'Performance sportive'].map((g) => `<option ${p.goal === g ? 'selected' : ''}>${g}</option>`).join('')}
        </select></label>
        <label>Poids cible (kg)<input type="number" step="0.1" name="targetWeight" value="${p.targetWeight != null && p.targetWeight !== '' ? p.targetWeight : ''}"></label>
        <label>Niveau<select name="level">
          ${['Débutant', 'Intermédiaire', 'Avancé'].map((l) => `<option ${p.level === l ? 'selected' : ''}>${l}</option>`).join('')}
        </select></label>
        <p class="saas-muted" id="saveStatus"></p>
        <button type="submit" class="btn btn--primary">Enregistrer le profil</button>
        <a href="${rel('achievements')}" class="btn btn--ghost btn--block" style="margin-top:10px">Mes succès →</a>
      </form>`;

    const slider = document.getElementById('profCompareSlider');
    const beforeImg = document.getElementById('profCompareBefore');
    slider?.addEventListener('input', () => {
      const v = Number(slider.value);
      if (beforeImg) beforeImg.style.clipPath = `inset(0 ${100 - v}% 0 0)`;
    });

    el.querySelectorAll('[data-photo-phase]').forEach((input) => {
      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file) return;
        const phase = input.dataset.photoPhase;
        const angle = input.dataset.photoAngle;
        try {
          if (window.PulseFitJournal?.uploadProgressPhoto) {
            await window.PulseFitJournal.uploadProgressPhoto(phase, angle, file);
          } else if (window.PulseFitNutrition?.uploadProgressPhoto) {
            await window.PulseFitNutrition.uploadProgressPhoto(phase, angle, file);
          }
          profile(el);
        } catch (err) {
          alert(err.message || 'Échec upload photo');
        }
        input.value = '';
      });
    });

    const form = document.getElementById('profileForm');
    const fileInput = document.getElementById('avatarFileInput');
    const statusEl = document.getElementById('avatarUploadStatus');
    const preview = document.getElementById('avatarPreview');

    async function handleAvatarFile(file) {
      if (!file || !window.PulseFitAvatar) return;
      statusEl.textContent = 'Envoi en cours…';
      statusEl.style.color = 'var(--gray-light)';
      try {
        const url = await window.PulseFitAvatar.upload(file);
        preview.src = url;
        form.querySelector('[name=avatar]').value = url;
        await Store.updateProfileAsync({ avatar: url });
        Store.completeOnboarding({});
        statusEl.textContent = '✓ Photo enregistrée (cloud)';
        statusEl.style.color = 'var(--energy)';
        document.getElementById('saveStatus').textContent = '✓ Profil mis à jour';
      } catch (err) {
        statusEl.textContent = err.message || 'Échec de l’envoi';
        statusEl.style.color = '#f87171';
      }
      fileInput.value = '';
    }

    document.getElementById('avatarPickBtn')?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (file) handleAvatarFile(file);
    });

    function profileFormData() {
      const data = Object.fromEntries(new FormData(form).entries());
      if (!data.avatar) delete data.avatar;
      return Store.normalizeProfileFields(data);
    }

    let saveTimer;
    form.addEventListener('input', (e) => {
      if (e.target.name === 'avatar' || e.target.id === 'avatarFileInput') return;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(async () => {
        const status = document.getElementById('saveStatus');
        try {
          await Store.updateProfileAsync(profileFormData());
          Store.completeOnboarding({});
          status.textContent = '✓ Sauvegardé';
        } catch (err) {
          status.textContent = err.message || 'Erreur de sauvegarde';
        }
      }, 800);
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = document.getElementById('saveStatus');
      const btn = form.querySelector('button[type=submit]');
      btn.disabled = true;
      status.textContent = 'Enregistrement…';
      try {
        await Store.updateProfileAsync(profileFormData());
        Store.completeOnboarding({});
        status.textContent = '✓ Profil enregistré';
      } catch (err) {
        status.textContent = err.message || 'Impossible d’enregistrer sur le serveur';
      }
      btn.disabled = false;
    });
  }

  function community(el) {
    const Store = S();
    const board = Store.getLeaderboard();
    const state = Store.load();
    if (state.subscription === 'free') {
      el.innerHTML = topbar('Communauté', 'Pro') + `
        <article class="saas-panel saas-locked-overlay" style="min-height:200px">
          <p style="text-align:center;padding:40px">Classement et défis — réservé Pro/Elite.<br><a href="${rel('pricing')}" class="btn btn--primary" style="margin-top:16px">Upgrade</a></p>
        </article>`;
      return;
    }
    el.innerHTML = topbar('Communauté', 'Votre progression') + `
      <article class="saas-panel" style="margin-bottom:14px">
        <h2 style="font-family:var(--font-display);margin-bottom:8px">Défi de la semaine</h2>
        <p>${esc(state.community.weeklyChallenge || 'Défi personnel')} — suivez vos séances dans le calendrier.</p>
      </article>
      <article class="saas-panel">
        <div class="saas-panel__head"><h2>Votre classement</h2></div>
        <p class="saas-muted" style="margin-bottom:12px">Classement basé sur vos XP et votre streak réels.</p>
        <ol class="saas-leaderboard" style="list-style:none;padding:0">
          ${board.map((u) => `
            <li class="${u.isMe ? 'is-me' : ''}">
              <span>#${u.rank}</span>
              <img src="${esc(u.avatar)}" alt="" width="36" height="36" style="border-radius:50%">
              <span>${esc(u.name)}</span>
              <span>${u.xp} XP</span>
              <span>🔥 ${u.streak}</span>
            </li>`).join('')}
        </ol>
      </article>`;
  }

  function subscriptionPage(el, title, eyebrow) {
    const plan = S().load().subscription;
    const tiers = Object.values(S().PLAN_TIERS || {});
    const planInfo = S().getPlanInfo(S().load());
    el.innerHTML = topbar(title, eyebrow) + `
      <div class="ach-plan-banner">
        <span>Plan actuel : <strong>${esc(planInfo.name)}</strong></span>
        <span class="ach-plan-badge ach-plan-badge--${plan}">${esc(planInfo.badge || plan)}</span>
      </div>
      <p class="saas-muted" style="margin-bottom:16px">Gérez votre abonnement PulseFit. Les changements sont appliqués sur votre compte (sync Supabase si connecté).</p>
      <div class="saas-pricing-grid">
        ${tiers.map((t) => `
          <article class="saas-price-card ${t.featured ? 'featured' : ''}">
            ${t.featured ? '<span class="saas-plan-badge saas-plan-badge--pro" style="position:absolute;top:16px;right:16px">Populaire</span>' : ''}
            <h3>${esc(t.name)} <span class="ach-plan-badge ach-plan-badge--${t.id}" style="font-size:0.65rem;vertical-align:middle">${esc(t.badge || t.id)}</span></h3>
            <div class="price">${esc(t.price)}<small>/mois</small></div>
            <ul>${t.features.map((f) => `<li>✓ ${esc(f)}</li>`).join('')}</ul>
            <button type="button" class="btn ${plan === t.id ? 'btn--ghost' : 'btn--primary'} btn--block" data-plan="${t.id}">${plan === t.id ? 'Plan actuel' : 'Choisir'}</button>
          </article>`).join('')}
      </div>
      <article class="saas-panel" style="margin-top:20px">
        <h2 style="font-family:var(--font-display);font-size:1rem">Facturation</h2>
        <p class="saas-muted">Plan actuel : <strong>${esc((S().PLAN_TIERS[plan] || {}).name || plan)}</strong></p>
        <p class="saas-muted" style="margin-top:8px">Renouvellement simulé · connectez Stripe pour la production.</p>
        ${plan !== 'free' ? `<button type="button" class="btn btn--ghost btn--sm" id="downgradeFree" style="margin-top:12px">Repasser en Free</button>` : ''}
      </article>`;
    el.querySelectorAll('[data-plan]').forEach((btn) => {
      btn.addEventListener('click', () => {
        S().setSubscription(btn.dataset.plan);
        subscriptionPage(el, title, eyebrow);
      });
    });
    document.getElementById('downgradeFree')?.addEventListener('click', () => {
      S().setSubscription('free');
      subscriptionPage(el, title, eyebrow);
    });
  }

  function pricing(el) {
    subscriptionPage(el, 'Abonnements', 'Premium');
  }

  function upgrade(el) {
    subscriptionPage(el, 'Passer Premium', 'Upgrade');
  }

  let calYear = new Date().getFullYear();
  let calMonth = new Date().getMonth();
  let calView = 'month';

  function calendar(el) {
    const Store = S();
    Store.ensureSchedule();
    const today = Store.todayISO();

    function renderGrid() {
      const days = Store.getCalendarMonth(calYear, calMonth);
      const firstDow = new Date(calYear, calMonth, 1).getDay();
      const offset = (firstDow + 6) % 7;
      let html = WEEKDAYS.map((d) => `<div class="saas-cal-head">${d}</div>`).join('');
      for (let i = 0; i < offset; i++) html += '<div class="saas-cal-cell saas-cal-cell--empty"></div>';
      days.forEach((day) => {
        const has = day.sessions.length;
        const done = has && day.sessions.every((s) => s.status === 'done');
        const planned = day.sessions.some((s) => s.status === 'planned');
        html += `<button type="button" class="saas-cal-cell ${day.date === today ? 'is-today' : ''} ${done && has ? 'is-done' : planned ? 'is-planned' : ''}" data-cal-date="${day.date}">
          <span>${parseInt(day.date.slice(8), 10)}</span>${has ? `<em>${day.sessions.length}</em>` : ''}</button>`;
      });
      return html;
    }

    function showDay(date) {
      const sessions = Store.load().schedule.filter((x) => x.date === date);
      const detail = document.getElementById('calDayDetail');
      if (!detail) return;
      if (!sessions.length) {
        detail.innerHTML = `<p class="saas-muted">Aucune séance le ${fmtDate(date)}.</p>`;
        return;
      }
      detail.innerHTML = sessions.map((sess) => `
        <div class="saas-cal-session">
          <div><strong>${esc(sess.title)}</strong><br><span class="saas-muted">${sess.status === 'done' ? '✓ Terminée' : 'Planifiée'} · ${sess.durationMin} min · ${sess.calories} kcal</span></div>
          <div class="saas-cal-session__actions">
            ${sess.status === 'planned' ? `<button type="button" class="btn btn--primary btn--sm" data-done="${sess.id}">Marquer terminée</button>
            <a href="${rel('program')}?tab=workout&session=${sess.id}" class="btn btn--ghost btn--sm">Lancer</a>` : ''}
          </div>
        </div>`).join('');
      detail.querySelectorAll('[data-done]').forEach((btn) => {
        btn.addEventListener('click', () => {
          Store.markSessionDone(btn.dataset.done);
          calendar(el);
        });
      });
    }

    el.innerHTML = topbar('Calendrier', `${MONTHS[calMonth]} ${calYear}`) + `
      <article class="saas-panel">
        <div class="saas-panel__head">
          <div class="saas-cal-nav">
            <button type="button" class="btn btn--ghost btn--sm" id="calPrev">←</button>
            <h2>${MONTHS[calMonth]} ${calYear}</h2>
            <button type="button" class="btn btn--ghost btn--sm" id="calNext">→</button>
          </div>
          <div class="saas-cal-views">
            <button type="button" class="btn btn--sm ${calView === 'week' ? 'btn--primary' : 'btn--ghost'}" data-cal-view="week">Semaine</button>
            <button type="button" class="btn btn--sm ${calView === 'month' ? 'btn--primary' : 'btn--ghost'}" data-cal-view="month">Mois</button>
          </div>
        </div>
        <div class="saas-cal-grid" id="calGrid">${renderGrid()}</div>
        <div id="calDayDetail" class="saas-cal-detail"></div>
      </article>`;

    document.getElementById('calPrev')?.addEventListener('click', () => {
      calMonth -= 1;
      if (calMonth < 0) { calMonth = 11; calYear -= 1; }
      calendar(el);
    });
    document.getElementById('calNext')?.addEventListener('click', () => {
      calMonth += 1;
      if (calMonth > 11) { calMonth = 0; calYear += 1; }
      calendar(el);
    });
    el.querySelectorAll('[data-cal-view]').forEach((btn) => {
      btn.addEventListener('click', () => {
        calView = btn.dataset.calView;
        if (calView === 'week') {
          const d = new Date(today + 'T12:00:00');
          calYear = d.getFullYear();
          calMonth = d.getMonth();
        }
        calendar(el);
      });
    });
    el.querySelectorAll('[data-cal-date]').forEach((btn) => {
      btn.addEventListener('click', () => showDay(btn.dataset.calDate));
    });
    const weekStart = Store.addDays(today, -((new Date(today + 'T12:00:00').getDay() + 6) % 7));
    if (calView === 'week') showDay(today);
    else showDay(weekStart);
  }

  function history(el) {
    const Store = S();
    const logs = Store.load().sessionLogs;
    el.innerHTML = topbar('Historique', `${logs.length} séances`) + `
      <article class="saas-panel">
        <ul class="saas-history-list">
          ${logs.length ? logs.map((l) => `
            <li>
              <div>
                <strong>${esc(l.title)}</strong>
                <span class="saas-muted">${esc(l.type || 'entraînement')} · ${fmtDate(l.date)}</span>
              </div>
              <div class="saas-history-meta">
                <span>${l.durationMin} min</span>
                <span>${l.calories || 0} kcal</span>
                ${l.feeling != null ? `<span>Ressenti ${l.feeling}/10</span>` : ''}
              </div>
            </li>`).join('') : '<li class="saas-muted">Terminez une séance pour alimenter l\'historique.</li>'}
        </ul>
      </article>`;
  }

  function admin(el) {
    if (!window.PulseFitAuth.isAdmin()) {
      el.innerHTML = topbar('Accès refusé', 'Admin') + '<p class="saas-muted">Réservé administrateur.</p>';
      return;
    }
    const a = S().getAdminStats();
    el.innerHTML = topbar('Admin PulseFit', 'Back-office') + `
      <div class="saas-admin-grid">
        <article class="saas-stat"><span>Utilisateurs</span><strong>${a.users.toLocaleString('fr-FR')}</strong></article>
        <article class="saas-stat"><span>Actifs aujourd'hui</span><strong>${a.activeToday.toLocaleString('fr-FR')}</strong></article>
        <article class="saas-stat"><span>MRR</span><strong>${a.revenueMrr.toLocaleString('fr-FR')}€</strong></article>
        <article class="saas-stat"><span>Séances jour</span><strong>${a.sessionsToday.toLocaleString('fr-FR')}</strong></article>
      </div>
      <div class="saas-grid-2">
        <article class="saas-panel">
          <div class="saas-panel__head"><h2>Abonnements</h2></div>
          <table class="saas-table">
            <tr><th>Free</th><td>${a.subscriptions.free}</td></tr>
            <tr><th>Pro</th><td>${a.subscriptions.pro}</td></tr>
            <tr><th>Elite</th><td>${a.subscriptions.elite}</td></tr>
          </table>
        </article>
        <article class="saas-panel">
          <div class="saas-panel__head"><h2>Coach IA</h2></div>
          <p class="saas-muted">${S().load().coach.conversations.length} conversations actives (démo locale).</p>
          <p>Programmes générés : ${a.programs} séances planifiées</p>
        </article>
      </div>`;
  }

  window.PulseFitPages = {
    dashboard,
    calendar,
    history,
    profile,
    community,
    pricing,
    upgrade,
    admin,
  };
})();
