/**
 * PulseFit — Page Programme (coach IA premium)
 */
(function () {
  'use strict';

  const esc = (s) => window.PFApp?.esc(s) ?? String(s ?? '');
  const Store = () => window.PulseFitStore;
  const Prog = () => window.PulseFitProgram;
  const Ex = () => window.PulseFitExercises;

  let activeTab = 'overview';
  let activeSessionId = null;
  let statsRange = 30;
  let timer = { interval: null, restInterval: null, seconds: 0, rest: 0, phase: 'work' };

  const STATUS = {
    done: { icon: '✅', label: 'Terminée', cls: 'is-done' },
    today: { icon: '⏳', label: "Aujourd'hui", cls: 'is-today' },
    upcoming: { icon: '🔒', label: 'À venir', cls: 'is-upcoming' },
    missed: { icon: '❌', label: 'Manquée', cls: 'is-missed' },
  };

  function topbar(title, sub) {
    const tr = Prog().ensureTraining(Store().load());
    const lvl = Prog().getTrainingLevel(tr.xp || 0);
    return `
    <header class="saas-topbar prog-topbar">
      <div>
        <p class="saas-eyebrow">Coach sportif IA · build ${window.PF_BUILD || 'prog'}</p>
        <h1>${esc(title)}</h1>
        <p class="saas-muted">${esc(sub)}</p>
      </div>
      <div class="saas-topbar__right">
        <span class="saas-streak-pill">🔥 ${Store().load().streak?.current || 0}</span>
        <span class="saas-xp-pill">${lvl.name} · ${tr.xp || 0} XP</span>
        <button type="button" class="theme-toggle" id="saasThemeToggle">◐</button>
      </div>
    </header>`;
  }

  function tabs() {
    const t = [
      ['overview', 'Programme'],
      ['workout', 'Séance'],
      ['config', 'Configurer'],
      ['stats', 'Stats'],
      ['history', 'Historique'],
    ];
    return `<nav class="prog-tabs">${t.map(([id, l]) =>
      `<button type="button" class="prog-tabs__btn ${activeTab === id ? 'active' : ''}" data-tab="${id}">${l}</button>`).join('')}</nav>`;
  }

  function weekGrid() {
    const week = Prog().getCurrentWeekSchedule();
    const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    const today = Store().todayISO();
    const byDay = {};
    week.forEach((s) => { byDay[s.dayLabel || ''] = s; });

    return `<div class="prog-week">
      ${days.map((d) => {
        const s = byDay[d] || week.find((x) => x.dayLabel === d);
        const st = s ? STATUS[s.statusKey] || STATUS.upcoming : null;
        return `<button type="button" class="prog-day ${st?.cls || ''} ${!s ? 'is-rest' : ''}" data-open-session="${s?.id || ''}" ${!s ? 'disabled' : ''}>
          <span class="prog-day__name">${d.slice(0, 3)}</span>
          ${s ? `<span class="prog-day__icon">${st.icon}</span><span class="prog-day__title">${esc(s.title)}</span>` : '<span class="prog-day__rest">Repos</span>'}
        </button>`;
      }).join('')}
    </div>`;
  }

  function renderOverview(state) {
    const p = state.program;
    if (!p) {
      return `<article class="saas-panel prog-glass">
        <h2>Créez votre programme IA</h2>
        <p class="saas-muted">Assistant personnalisé : objectif, niveau, matériel, blessures…</p>
        <button type="button" class="btn btn--primary btn--glow btn--block" data-goto-config>Configurer mon programme</button>
      </article>`;
    }
    const lvl = Prog().getTrainingLevel(Prog().ensureTraining(state).xp || 0);
    return `
      <div class="prog-cards">
        <article class="prog-card prog-card--glow"><span>Programme</span><strong>${esc(p.program)}</strong><small>${esc(p.goal)} · ${esc(p.level)}</small></article>
        <article class="prog-card"><span>Niveau RPG</span><strong>${esc(lvl.name)}</strong><small>${lvl.xp} XP</small></article>
        <article class="prog-card"><span>Séances/sem.</span><strong>${p.sessions}</strong><small>${p.duration}</small></article>
        <article class="prog-card"><span>Intensité IA</span><strong>${Math.round((p.intensityMultiplier || 1) * 100)}%</strong><small>Adaptatif</small></article>
      </div>
      <article class="saas-panel prog-glass">
        <div class="saas-panel__head"><h2>Planning hebdomadaire</h2><button type="button" class="btn btn--ghost btn--sm" id="aiAdaptBtn">Adapter IA</button></div>
        ${weekGrid()}
        <p class="saas-muted" id="adaptMsg" style="margin-top:10px"></p>
      </article>
      <div class="prog-actions">
        <button type="button" class="btn btn--primary" id="exportPdfBtn">Exporter mon programme PDF</button>
        <button type="button" class="btn btn--ghost" data-goto-config>Reconfigurer</button>
      </div>`;
  }

  function renderWorkout(state) {
    const today = Store().todayISO();
    let sess = activeSessionId
      ? state.schedule.find((s) => s.id === activeSessionId)
      : state.schedule.find((s) => s.date === today && s.status !== 'done')
        || state.schedule.find((s) => s.status !== 'done');

    if (!sess) {
      return `<p class="saas-muted">Aucune séance active. Choisissez un jour dans le planning.</p>`;
    }
    activeSessionId = sess.id;
    const prog = Prog().exerciseProgress(sess);
    const fmt = (n) => String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');

    return `
      <article class="saas-panel prog-glass">
        <div class="saas-panel__head"><h2>${esc(sess.title)}</h2><span>${sess.durationMin} min · ~${sess.calories} kcal · Diff. ${sess.difficulty}/10</span></div>
        <div class="prog-timer">
          <div class="prog-timer__display" id="timerDisplay">${fmt(timer.seconds)}</div>
          <div class="prog-timer__rest">Repos : <span id="restDisplay">${fmt(timer.rest)}</span></div>
          <div class="prog-timer__btns">
            <button type="button" class="btn btn--primary" id="timerStart">▶ Démarrer</button>
            <button type="button" class="btn btn--ghost" id="timerPause">⏸ Pause</button>
            <button type="button" class="btn btn--ghost" id="timerStop">⏹ Reset</button>
            <button type="button" class="btn btn--ghost btn--sm" id="addRest">+30s repos</button>
          </div>
        </div>
        <div class="prog-ex-progress">
          <div class="prog-ex-progress__bar"><span style="width:${prog.pct}%"></span></div>
          <strong>${prog.done} / ${prog.total} exercices · ${prog.pct}%</strong>
        </div>
        <ul class="prog-ex-list">
          ${(sess.exercises || []).map((ex, i) => `
            <li class="prog-ex-item ${ex.done ? 'is-done' : ''}">
              <label class="prog-ex-check">
                <input type="checkbox" data-ex-idx="${i}" ${ex.done ? 'checked' : ''}>
                <div class="prog-ex-info">
                  <img src="${esc(ex.gif)}" alt="" class="prog-ex-gif" loading="lazy">
                  <div>
                    <strong>${esc(ex.name)}</strong>
                    <span class="saas-muted">${ex.sets} séries · ${esc(String(ex.reps))} · ${ex.muscle}</span>
                    <p class="saas-muted" style="font-size:0.75rem">${esc(ex.tips)}</p>
                  </div>
                </div>
              </label>
            </li>`).join('')}
        </ul>
        <button type="button" class="btn btn--primary btn--block btn--glow" id="finishWorkout">Terminer la séance (+50 XP)</button>
      </article>`;
  }

  function renderConfig(state) {
    const p = state.profile;
    const cfg = state.program?.config || {};
    return `
      <article class="saas-panel prog-glass">
        <div class="saas-panel__head"><h2>Assistant configuration IA</h2></div>
        <form id="progConfigForm" class="saas-form saas-form--grid">
          <label>Sexe<select name="gender"><option ${p.gender === 'homme' ? 'selected' : ''}>homme</option><option ${p.gender === 'femme' ? 'selected' : ''}>femme</option><option ${p.gender === 'autre' ? 'selected' : ''}>autre</option></select></label>
          <label>Âge<input type="number" name="age" value="${p.age || ''}" min="16" max="99"></label>
          <label>Taille (cm)<input type="number" name="height" value="${p.height || ''}"></label>
          <label>Poids (kg)<input type="number" step="0.1" name="weight" value="${p.weight || ''}"></label>
          <label>Objectif<select name="goal">
            ${['Perte de poids', 'Prise de masse', 'Remise en forme', 'Endurance', 'Force', 'Athlétique'].map((g) => `<option ${(cfg.goal || p.goal) === g ? 'selected' : ''}>${g}</option>`).join('')}
          </select></label>
          <label>Niveau<select name="level">
            ${['Débutant', 'Intermédiaire', 'Avancé'].map((l) => `<option ${(cfg.level || p.level) === l ? 'selected' : ''}>${l}</option>`).join('')}
          </select></label>
          <label>Séances / semaine<select name="sessions">${[2, 3, 4, 5, 6].map((n) => `<option value="${n}" ${String(cfg.sessions || state.program?.sessions || 4) === String(n) ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <label>Lieu<select name="place">
            ${['Salle de sport', 'Maison'].map((pl) => `<option ${(cfg.place || (cfg.equipment?.includes('Salle') ? 'Salle de sport' : 'Maison')) === pl ? 'selected' : ''}>${pl}</option>`).join('')}
          </select></label>
          <label>Matériel<select name="equipment">
            ${['Salle complète', 'Haltères + banc', 'Poids du corps uniquement', 'Élastiques', 'Bandes + haltères'].map((e) => `<option ${cfg.equipment === e ? 'selected' : ''}>${e}</option>`).join('')}
          </select></label>
          <label>Temps disponible / séance<select name="duration">
            ${['20 minutes', '30 minutes', '45 minutes', '60 minutes'].map((d) => `<option ${(cfg.duration || state.program?.duration) === d ? 'selected' : ''}>${d}</option>`).join('')}
          </select></label>
          <label>Zone focus<select name="focusZone">
            ${['Full body', 'Haut du corps', 'Bas du corps', 'Core'].map((z) => `<option ${cfg.focusZone === z ? 'selected' : ''}>${z}</option>`).join('')}
          </select></label>
          <label class="saas-form--full">Blessures (optionnel)<input name="injuries" placeholder="ex: genou, épaule" value="${esc(cfg.injuries || '')}"></label>
          <button type="submit" class="btn btn--primary btn--glow btn--block saas-form--full">Générer mon programme IA</button>
        </form>
        <p class="saas-muted" id="configStatus"></p>
      </article>
      <article class="saas-panel prog-glass" style="margin-top:14px">
        <div class="saas-panel__head"><h2>Catalogue exercices</h2><span>${Ex().list().length} exercices</span></div>
        <div class="prog-ex-catalog">${Ex().list().slice(0, 8).map((ex) => `
          <div class="prog-ex-catalog__item"><img src="${esc(ex.gif)}" alt=""><span>${esc(ex.name)}</span></div>`).join('')}</div>
      </article>`;
  }

  function barChart(data, key, color) {
    const max = Math.max(...data.map((d) => d[key]), 1);
    return `<div class="prog-bars">${data.map((d) => `
      <div class="prog-bars__col"><div class="prog-bars__fill" style="height:${(d[key] / max) * 100}%;background:${color}"></div><span>${d.week?.slice(5) || ''}</span></div>`).join('')}</div>`;
  }

  function renderStats() {
    const st = Prog().getStats(statsRange);
    return `
      <div class="prog-range-btns">
        ${[[7, '7j'], [30, '30j'], [90, '90j'], [365, '1 an']].map(([d, l]) =>
          `<button type="button" class="btn btn--sm ${statsRange === d ? 'btn--primary' : 'btn--ghost'}" data-range="${d}">${l}</button>`).join('')}
      </div>
      <div class="prog-cards">
        <article class="prog-card"><span>Séances</span><strong>${st.sessions}</strong></article>
        <article class="prog-card"><span>Calories</span><strong>${st.calories.toLocaleString('fr-FR')}</strong></article>
        <article class="prog-card"><span>Minutes</span><strong>${st.minutes}</strong></article>
        <article class="prog-card"><span>XP training</span><strong>${st.xp}</strong></article>
      </div>
      <div class="saas-grid-2">
        <article class="saas-panel prog-glass"><div class="saas-panel__head"><h2>Séances / semaine</h2></div>${barChart(st.byWeek, 'sessions', '#22C55E')}</article>
        <article class="saas-panel prog-glass"><div class="saas-panel__head"><h2>Calories</h2></div>${barChart(st.byWeek, 'calories', '#3B82F6')}</article>
      </div>
      <article class="saas-panel prog-glass"><div class="saas-badges">${Prog().TRAINING_BADGES.map((b) => {
        const ok = (Store().load().training?.badges || []).includes(b.id);
        return `<span class="saas-badge ${ok ? 'unlocked' : 'locked'}">${b.icon} ${b.name}</span>`;
      }).join('')}</div></article>`;
  }

  function renderHistory() {
    const logs = Store().load().sessionLogs || [];
    return `<article class="saas-panel prog-glass">
      <ul class="saas-history-list">${logs.length ? logs.map((l) => {
        const exCount = Array.isArray(l.exercises) ? l.exercises.length : 0;
        const done = Array.isArray(l.exercises) ? l.exercises.filter((e) => e.done || typeof e === 'string').length : 0;
        const perf = l.feeling != null ? `Ressenti ${l.feeling}/10` : '';
        return `<li>
          <div><strong>${esc(l.title)}</strong><span class="saas-muted">${l.date}</span></div>
          <div class="saas-history-meta">
            <span>${l.durationMin} min</span><span>${l.calories} kcal</span>
            <span>${exCount ? `${done}/${exCount} ex.` : ''}</span>
            <span>${perf}</span>
          </div>
        </li>`;
      }).join('') : '<li class="saas-muted">Aucune séance terminée.</li>'}
      </ul></article>`;
  }

  function bindEvents(el) {
    el.querySelectorAll('[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => { activeTab = btn.dataset.tab; program(el); });
    });
    el.querySelectorAll('[data-goto-config]').forEach((btn) => {
      btn.addEventListener('click', () => { activeTab = 'config'; program(el); });
    });
    el.querySelectorAll('[data-open-session]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!btn.dataset.openSession) return;
        activeSessionId = btn.dataset.openSession;
        activeTab = 'workout';
        timer.seconds = 0;
        program(el);
      });
    });

    document.getElementById('progConfigForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const status = document.getElementById('configStatus');
      status.textContent = 'Génération IA en cours…';
      try {
        Prog().generateProgram(Object.fromEntries(fd.entries()));
        await Store().updateProfileAsync({
          gender: fd.get('gender'),
          age: fd.get('age'),
          height: fd.get('height'),
          weight: fd.get('weight'),
          goal: fd.get('goal'),
          level: fd.get('level'),
        });
        status.textContent = '✓ Programme généré — 4 semaines planifiées';
        activeTab = 'overview';
        program(el);
      } catch (err) {
        status.textContent = err.message || 'Erreur';
      }
    });

    document.getElementById('aiAdaptBtn')?.addEventListener('click', () => {
      const ad = Prog().runAiAdaptation();
      document.getElementById('adaptMsg').textContent = ad?.message || '';
      program(el);
    });

    document.getElementById('exportPdfBtn')?.addEventListener('click', () => window.PulseFitPdf?.exportProgramPdf());

    document.getElementById('finishWorkout')?.addEventListener('click', () => {
      if (!activeSessionId) return;
      Prog().completeWorkout(activeSessionId, { durationMin: Math.max(1, Math.round(timer.seconds / 60)) });
      clearInterval(timer.interval);
      activeTab = 'overview';
      program(el);
    });

    el.querySelectorAll('[data-ex-idx]').forEach((cb) => {
      cb.addEventListener('change', () => {
        Prog().toggleExercise(activeSessionId, Number(cb.dataset.exIdx));
        program(el);
      });
    });

    const fmt = () => {
      const f = (n) => String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
      const d = document.getElementById('timerDisplay');
      const r = document.getElementById('restDisplay');
      if (d) d.textContent = f(timer.seconds);
      if (r) r.textContent = f(timer.rest);
    };
    document.getElementById('timerStart')?.addEventListener('click', () => {
      if (timer.interval) return;
      timer.interval = setInterval(() => { timer.seconds += 1; fmt(); }, 1000);
    });
    document.getElementById('timerPause')?.addEventListener('click', () => {
      clearInterval(timer.interval);
      timer.interval = null;
    });
    document.getElementById('timerStop')?.addEventListener('click', () => {
      clearInterval(timer.interval);
      clearInterval(timer.restInterval);
      timer.interval = null;
      timer.restInterval = null;
      timer.seconds = 0;
      timer.rest = 0;
      fmt();
    });
    document.getElementById('addRest')?.addEventListener('click', () => {
      timer.rest += 30;
      fmt();
      if (timer.restInterval) clearInterval(timer.restInterval);
      timer.restInterval = setInterval(() => {
        if (timer.rest <= 0) {
          clearInterval(timer.restInterval);
          timer.restInterval = null;
          return;
        }
        timer.rest -= 1;
        fmt();
      }, 1000);
    });

    el.querySelectorAll('[data-range]').forEach((btn) => {
      btn.addEventListener('click', () => { statsRange = Number(btn.dataset.range); program(el); });
    });

    document.getElementById('saasThemeToggle')?.addEventListener('click', () => {
      const next = document.body.dataset.theme === 'light' ? 'dark' : 'light';
      document.body.dataset.theme = next;
      localStorage.setItem('pulsefit-theme', next);
    });
  }

  function program(el) {
    const state = Store().ensureSchedule ? Store().ensureSchedule() : Store().load();
    let body = '';
    if (activeTab === 'overview') body = renderOverview(state);
    else if (activeTab === 'workout') body = renderWorkout(state);
    else if (activeTab === 'config') body = renderConfig(state);
    else if (activeTab === 'stats') body = renderStats();
    else body = renderHistory();

    const sub = state.program?.program || 'Configurez votre plan personnalisé';
    el.innerHTML = topbar('Mon programme', sub) + tabs() + `<div class="prog-body">${body}</div>`;
    bindEvents(el);

    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'workout' || params.get('tab') === 'config' || params.get('tab') === 'stats' || params.get('tab') === 'history') {
      activeTab = params.get('tab') === 'workout' ? 'workout' : params.get('tab');
    }
    if (params.get('session')) {
      activeSessionId = params.get('session');
      activeTab = 'workout';
    }
    if (params.get('tab') || params.get('session')) program(el);
  }

  window.PulseFitPages = window.PulseFitPages || {};
  window.PulseFitPages.program = program;
})();
