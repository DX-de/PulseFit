/**
 * PulseFit — Page Journal IA premium
 */
(function () {
  'use strict';

  const esc = (s) => window.PFApp?.esc(s) ?? String(s ?? '');
  const Store = () => window.PulseFitStore;
  const Journal = () => window.PulseFitJournal;
  const Engine = () => window.PulseFitJournalEngine;

  let activeTab = 'dashboard';
  let chartRange = 30;
  let comparePct = 50;

  const TABS = [
    ['dashboard', 'Dashboard'],
    ['today', 'Aujourd\'hui'],
    ['weight', 'Poids'],
    ['photos', 'Photos'],
    ['notes', 'Notes'],
    ['timeline', 'Timeline'],
    ['ai', 'Analyse IA'],
  ];

  function topbar() {
    const state = Store().load();
    const w = Journal().ensureWellness(state);
    const xp = w.gamification?.xp || 0;
    return `
    <header class="saas-topbar journal-topbar">
      <div>
        <p class="saas-eyebrow">Journal IA · build ${window.PF_BUILD || 'journal'}</p>
        <h1>Mon journal</h1>
        <p class="saas-muted">Suivi intelligent · performances · récupération</p>
      </div>
      <div class="saas-topbar__right">
        <span class="saas-streak-pill">🔥 ${state.streak?.current || 0}</span>
        <span class="saas-xp-pill">${xp} XP journal</span>
        <button type="button" class="theme-toggle" id="saasThemeToggle">◐</button>
      </div>
    </header>`;
  }

  function tabsNav() {
    return `<nav class="journal-tabs">${TABS.map(([id, label]) =>
      `<button type="button" class="journal-tabs__btn ${activeTab === id ? 'active' : ''}" data-journal-tab="${id}">${label}</button>`).join('')}</nav>`;
  }

  function metricSliders(entry) {
    return Engine().METRICS.map((m) => `
      <div class="journal-metric">
        <label>
          <span class="journal-metric__icon">${m.icon}</span>
          <span>${m.label}</span>
          <span class="journal-metric__val" data-metric-val="${m.key}">${entry[m.key] ?? 7}</span>
          <input type="range" name="${m.key}" min="1" max="10" value="${entry[m.key] ?? 7}" data-metric-range="${m.key}">
        </label>
      </div>`).join('');
  }

  function weightSvg(series) {
    if (!series.length) return '<p class="saas-muted">Ajoutez votre poids pour voir le graphique.</p>';
    const w = 480;
    const h = 160;
    const vals = series.map((x) => x.value);
    const min = Math.min(...vals) - 0.5;
    const max = Math.max(...vals) + 0.5;
    const pts = series.map((item, i) => {
      const x = 30 + (i / Math.max(1, series.length - 1)) * (w - 60);
      const y = 16 + ((max - item.value) / (max - min || 1)) * (h - 40);
      return `${x},${y}`;
    }).join(' ');
    return `<div class="journal-chart"><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline fill="none" stroke="#22C55E" stroke-width="3" points="${pts}"/></svg></div>`;
  }

  function renderDashboard(state) {
    const w = Journal().ensureWellness(state);
    const avg = Engine().dashboardAverages(w, 7);
    const wd = Engine().weightDelta(state);
    const completion = Engine().completionRate(w, 7);
    const report = w.lastAnalysisAt ? { insights: w.insights, alerts: w.alerts } : Journal().getAnalysis();

    return `
      <div class="journal-cards">
        <article class="journal-card journal-card--ai"><span>Humeur (7j)</span><strong>${avg.mood ?? '—'}</strong></article>
        <article class="journal-card"><span>Énergie</span><strong>${avg.energy ?? '—'}</strong></article>
        <article class="journal-card"><span>Sommeil</span><strong>${avg.sleep ?? '—'}</strong></article>
        <article class="journal-card"><span>Motivation</span><strong>${avg.motivation ?? '—'}</strong></article>
        <article class="journal-card"><span>Poids</span><strong>${wd.current?.toFixed(1) ?? '—'} kg</strong></article>
        <article class="journal-card"><span>Journal 7j</span><strong>${completion}%</strong></article>
      </div>
      ${(report.alerts || []).slice(0, 2).map((a) =>
        `<div class="journal-alert">${esc(a.message)}</div>`).join('')}
      ${(report.insights || []).slice(0, 2).map((i) =>
        `<div class="journal-insight journal-alert--success">${esc(i.message)}</div>`).join('')}
      <article class="saas-panel journal-glass">
        <div class="saas-panel__head"><h2>Progression poids</h2></div>
        ${weightSvg(Journal().getWeightSeries(30))}
        <button type="button" class="btn btn--ghost btn--sm" data-journal-tab="weight">Voir détail →</button>
      </article>
      <div class="saas-panel journal-glass" style="margin-top:14px">
        <div class="saas-badges">${Journal().JOURNAL_BADGES.map((b) => {
          const ok = (w.gamification?.badges || []).includes(b.id);
          return `<span class="saas-badge ${ok ? 'unlocked' : 'locked'}">${b.icon} ${b.name}</span>`;
        }).join('')}</div>
      </div>`;
  }

  function renderToday(state) {
    const entry = Journal().getTodayEntry(state);
    return `
      <article class="saas-panel journal-glass">
        <div class="saas-panel__head"><h2>Journal du jour</h2><span>${Store().todayISO()}</span></div>
        <form id="journalDailyForm" class="journal-metrics">
          ${metricSliders(entry)}
          <label class="saas-form--full" style="margin-top:12px">Note du jour<textarea name="note" rows="3" placeholder="Ressenti, douleurs, fatigue, objectifs…">${esc(entry.note || '')}</textarea></label>
          <button type="submit" class="btn btn--primary btn--glow btn--block" style="margin-top:14px">Enregistrer (+10 XP)</button>
        </form>
        <p class="saas-muted" id="dailyStatus"></p>
      </article>`;
  }

  function renderWeight(state) {
    const wd = Engine().weightDelta(state);
    const series = Journal().getWeightSeries(chartRange);
    return `
      <article class="saas-panel journal-glass">
        <p>Actuel : <strong>${wd.current?.toFixed(1)} kg</strong> · Cible : <strong>${wd.target} kg</strong></p>
        <p class="saas-muted">${wd.delta >= 0 ? '▼' : '▲'} ${Math.abs(wd.delta).toFixed(1)} kg depuis le départ</p>
        <form id="journalWeightForm" class="saas-form" style="margin-top:12px">
          <label>Poids (kg)<input type="number" step="0.1" name="weight" value="${state.profile.weight || ''}" required></label>
          <label>Note (optionnel)<input name="note" placeholder="Matin à jeun…"></label>
          <button type="submit" class="btn btn--primary btn--block">Enregistrer</button>
        </form>
        <div class="journal-range-btns">
          ${[[7, '7j'], [30, '30j'], [90, '90j'], [365, '1 an']].map(([d, l]) =>
            `<button type="button" class="btn btn--sm ${chartRange === d ? 'btn--primary' : 'btn--ghost'}" data-weight-range="${d}">${l}</button>`).join('')}
        </div>
        ${weightSvg(series)}
      </article>`;
  }

  function renderPhotos(state) {
    const photos = state.nutrition?.progressPhotos || { before: {}, after: {} };
    const before = photos.before?.face?.url;
    const after = photos.after?.face?.url;

    return `
      <div class="saas-grid-2">
        <article class="saas-panel journal-glass">
          <div class="saas-panel__head"><h2>Comparaison Face</h2><span>Avant / Après</span></div>
          <div class="journal-compare" id="photoCompare">
            <img src="${esc(after || before || '../favicon.svg')}" alt="après" class="journal-compare__base">
            <img src="${esc(before || after || '../favicon.svg')}" alt="avant" class="journal-compare__after" id="compareBefore" style="clip-path: inset(0 ${100 - comparePct}% 0 0)">
            <input type="range" min="0" max="100" value="${comparePct}" id="compareSlider">
          </div>
        </article>
        <article class="saas-panel journal-glass">
          <div class="saas-panel__head"><h2>Ajouter une photo</h2></div>
          <p class="saas-muted">Face · Profil · Dos — stockage Supabase</p>
          <div class="journal-photos-grid">
            ${['before', 'after'].flatMap((phase) =>
              ['face', 'profile', 'back'].map((angle) => {
                const ph = photos[phase]?.[angle];
                return `<label class="journal-photo-slot">
                  <img src="${esc(ph?.url || '../favicon.svg')}" alt="">
                  <span>${phase === 'before' ? 'Avant' : 'Après'} · ${angle}</span>
                  <input type="file" accept="image/*" data-photo-phase="${phase}" data-photo-angle="${angle}" hidden>
                </label>`;
              })).join('')}
          </div>
        </article>
      </div>`;
  }

  function renderNotes(state) {
    const notes = Journal().ensureWellness(state).notes || [];
    return `
      <article class="saas-panel journal-glass">
        <form id="journalNoteForm" class="saas-form">
          <label>Note personnelle<textarea name="body" rows="4" required placeholder="Douleurs, fatigue, objectifs…"></textarea></label>
          <label>Tags (optionnel)<input name="tags" placeholder="fatigue, genou, objectif"></label>
          <button type="submit" class="btn btn--primary btn--block">Ajouter</button>
        </form>
      </article>
      <article class="saas-panel journal-glass" style="margin-top:14px">
        <div class="saas-panel__head"><h2>Historique</h2></div>
        <ul class="journal-notes-list">${notes.length ? notes.map((n) => `
          <li><time class="saas-muted">${esc(n.date)}</time><p>${esc(n.body)}</p>${n.tags?.length ? `<span class="saas-muted">${esc(n.tags.join(' · '))}</span>` : ''}</li>`).join('') : '<li class="saas-muted">Aucune note.</li>'}</ul>
      </article>`;
  }

  function renderTimeline(state) {
    const events = Journal().buildTimeline(state);
    return `<article class="saas-panel journal-glass">
      <div class="saas-panel__head"><h2>Timeline de progression</h2></div>
      <ul class="journal-timeline">${events.length ? events.map((e) => `
        <li><span>${e.icon}</span> <strong>${esc(e.title)}</strong><br><span class="saas-muted">${esc(e.meta)} · ${esc(e.date)}</span></li>`).join('') : '<li class="saas-muted">Complétez votre journal et vos séances.</li>'}
      </ul></article>`;
  }

  function renderAi(state) {
    const w = Journal().ensureWellness(state);
    const report = Journal().getAnalysis();
    return `
      <article class="saas-panel journal-glass">
        <div class="saas-panel__head"><h2>Analyse IA</h2><button type="button" class="btn btn--ghost btn--sm" id="refreshAi">Actualiser</button></div>
        <p class="saas-muted">Croise humeur, énergie, poids, sommeil, nutrition et séances.</p>
        <h3 style="margin-top:16px;font-size:0.9rem">Insights</h3>
        ${(report.insights || []).map((i) => `<div class="journal-insight">${esc(i.message)}</div>`).join('') || '<p class="saas-muted">Pas encore assez de données.</p>'}
        <h3 style="margin-top:16px;font-size:0.9rem">Alertes</h3>
        ${(report.alerts || []).map((a) => `<div class="journal-alert">${esc(a.message)}</div>`).join('') || '<p class="saas-muted">Aucune alerte.</p>'}
        <h3 style="margin-top:16px;font-size:0.9rem">Recommandations</h3>
        ${(report.recommendations || []).map((r) => `<div class="journal-reco">${esc(r)}</div>`).join('')}
        <p class="saas-muted" style="margin-top:12px">Dernière analyse : ${w.lastAnalysisAt ? new Date(w.lastAnalysisAt).toLocaleString('fr-FR') : '—'}</p>
      </article>
      <p class="saas-muted" style="margin-top:10px">Le Coach IA utilise ces données pour adapter programme et nutrition.</p>`;
  }

  function bindEvents(el) {
    el.querySelectorAll('[data-journal-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.journalTab;
        journal(el);
      });
    });

    el.querySelectorAll('[data-metric-range]').forEach((input) => {
      input.addEventListener('input', () => {
        const val = el.querySelector(`[data-metric-val="${input.dataset.metricRange}"]`);
        if (val) val.textContent = input.value;
      });
    });

    document.getElementById('journalDailyForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const metrics = {};
      Engine().METRICS.forEach((m) => { metrics[m.key] = Number(fd.get(m.key)); });
      metrics.note = fd.get('note');
      Journal().saveDaily(metrics);
      document.getElementById('dailyStatus').textContent = '✓ Journal enregistré · analyse IA mise à jour';
      activeTab = 'dashboard';
      journal(el);
    });

    document.getElementById('journalWeightForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      Journal().addWeight(fd.get('weight'), fd.get('note'));
      journal(el);
    });

    document.getElementById('journalNoteForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const tags = String(fd.get('tags') || '').split(',').map((t) => t.trim()).filter(Boolean);
      Journal().addNote(fd.get('body'), tags);
      e.target.reset();
      journal(el);
    });

    el.querySelectorAll('[data-weight-range]').forEach((btn) => {
      btn.addEventListener('click', () => {
        chartRange = Number(btn.dataset.weightRange);
        journal(el);
      });
    });

    document.getElementById('compareSlider')?.addEventListener('input', (e) => {
      comparePct = Number(e.target.value);
      const img = document.getElementById('compareBefore');
      if (img) img.style.clipPath = `inset(0 ${100 - comparePct}% 0 0)`;
    });

    el.querySelectorAll('[data-photo-phase]').forEach((input) => {
      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file) return;
        try {
          await Journal().uploadProgressPhoto(input.dataset.photoPhase, input.dataset.photoAngle, file);
          journal(el);
        } catch (err) {
          alert(err.message || 'Upload impossible');
        }
      });
    });

    document.getElementById('refreshAi')?.addEventListener('click', () => journal(el));

    document.getElementById('saasThemeToggle')?.addEventListener('click', () => {
      const next = document.body.dataset.theme === 'light' ? 'dark' : 'light';
      document.body.dataset.theme = next;
      localStorage.setItem('pulsefit-theme', next);
    });
  }

  function journal(el) {
    const state = Store().load();
    let body = '';
    if (activeTab === 'dashboard') body = renderDashboard(state);
    else if (activeTab === 'today') body = renderToday(state);
    else if (activeTab === 'weight') body = renderWeight(state);
    else if (activeTab === 'photos') body = renderPhotos(state);
    else if (activeTab === 'notes') body = renderNotes(state);
    else if (activeTab === 'timeline') body = renderTimeline(state);
    else body = renderAi(state);

    el.innerHTML = topbar() + tabsNav() + `<div class="journal-body">${body}</div>`;
    bindEvents(el);

    const params = new URLSearchParams(location.search);
    if (params.get('tab') && TABS.some(([id]) => id === params.get('tab'))) {
      activeTab = params.get('tab');
      journal(el);
    }
  }

  window.PulseFitPages = window.PulseFitPages || {};
  window.PulseFitPages.journal = journal;
})();
