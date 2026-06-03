/**
 * PulseFit — Export programme PDF (fenêtre d'impression)
 */
(function (global) {
  'use strict';

  function fmt(iso) {
    return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  function exportProgramPdf() {
    const Store = global.PulseFitStore;
    if (!Store) return;
    const { state, stats } = Store.getExportData();
    const p = state.program;
    if (!p) {
      alert('Créez d\'abord un programme via le configurateur.');
      return;
    }

    const weekSessions = state.schedule.filter((s) => {
      const end = Store.addDays(Store.todayISO(), 6);
      return s.date >= Store.todayISO() && s.date <= end;
    });

    const rows = weekSessions.map((s) =>
      `<tr><td>${fmt(s.date)}</td><td>${s.title}</td><td>${s.durationMin} min</td><td>${s.status === 'done' ? '✓' : '—'}</td></tr>`
    ).join('');

    const exerciseBlock = (state.schedule || []).slice(0, 12).map((s) => {
      const exs = (s.exercises || []).map((ex) => {
        const name = typeof ex === 'string' ? ex : ex.name;
        const detail = typeof ex === 'object' && ex.sets ? ` — ${ex.sets}×${ex.reps}` : '';
        return `<li>${name}${detail}</li>`;
      }).join('');
      return exs ? `<h3>${s.title} (${fmt(s.date)})</h3><ul>${exs}</ul>` : '';
    }).join('');

    const tr = state.training || {};
    const lvl = global.PulseFitProgram?.getTrainingLevel?.(tr.xp || 0);

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>PulseFit — ${p.program}</title>
    <style>
      body{font-family:system-ui,sans-serif;padding:32px;color:#111;max-width:720px;margin:0 auto}
      h1{font-size:1.5rem;margin-bottom:4px} .tag{color:#16a34a;font-size:.85rem;font-weight:600}
      table{width:100%;border-collapse:collapse;margin:20px 0;font-size:.9rem}
      th,td{border:1px solid #ddd;padding:10px;text-align:left}
      th{background:#f4f4f5}
      .meta{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0}
      .meta div{padding:12px;background:#f9fafb;border-radius:8px}
      .foot{margin-top:32px;font-size:.75rem;color:#666}
      @media print{body{padding:16px}}
    </style></head><body>
    <p class="tag">PulseFit · Programme IA</p>
    <h1>${p.program}</h1>
    <p><strong>${state.profile.name}</strong> · Export du ${new Date().toLocaleDateString('fr-FR')}</p>
    <div class="meta">
      <div><strong>Objectif</strong><br>${p.goal || '—'}</div>
      <div><strong>Niveau</strong><br>${p.level || '—'}</div>
      <div><strong>Séances / semaine</strong><br>${p.sessions || '—'}</div>
      <div><strong>Durée séance</strong><br>${p.duration || '—'}</div>
      <div><strong>Poids actuel</strong><br>${stats.weight.toFixed(1)} kg</div>
      <div><strong>Progression sem.</strong><br>${stats.progressPct}%</div>
      <div><strong>Niveau RPG</strong><br>${lvl?.name || '—'} · ${tr.xp || 0} XP</div>
      <div><strong>Streak</strong><br>${state.streak?.current || 0} jours</div>
    </div>
    <h2>Planning — 7 prochains jours</h2>
    <table><thead><tr><th>Date</th><th>Séance</th><th>Durée</th><th>Fait</th></tr></thead><tbody>${rows || '<tr><td colspan="4">Aucune séance planifiée</td></tr>'}</tbody></table>
    <h2>Exercices du programme</h2>
    ${exerciseBlock || '<p>Aucun exercice planifié.</p>'}
    <h2>Macros cibles</h2>
    <p>${state.nutrition?.targets?.kcal || '—'} kcal · P ${state.nutrition?.targets?.protein || '—'}g · G ${state.nutrition?.targets?.carbs || '—'}g · L ${state.nutrition?.targets?.fat || '—'}g</p>
    <p class="foot">Démo portfolio PulseFit — données locales navigateur. pulsefit.app</p>
    <script>window.onload=function(){window.print();}</script>
    </body></html>`;

    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) {
      alert('Autorisez les pop-ups pour exporter le PDF, puis utilisez Imprimer → Enregistrer en PDF.');
      return;
    }
    w.document.write(html);
    w.document.close();
  }

  global.PulseFitPdf = { exportProgramPdf };
})(typeof window !== 'undefined' ? window : globalThis);
