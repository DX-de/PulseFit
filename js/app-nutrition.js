/**
 * PulseFit — Page Nutrition Premium
 */
(function () {
  'use strict';

  const esc = (s) => window.PFApp?.esc(s) ?? String(s ?? '');
  const rel = (p) => `../${p}/`;
  const Store = () => window.PulseFitStore;
  const Nutri = () => window.PulseFitNutrition;
  const Engine = () => window.PulseFitNutritionEngine;
  const AI = () => window.PulseFitNutritionAI;

  let activeTab = 'dashboard';
  let chartRange = 30;

  function topbar(title, sub) {
    const st = Store().getStats();
    const g = Nutri().ensureNutrition(Store().load()).gamification;
    return `
    <header class="saas-topbar nutri-topbar">
      <div>
        <p class="saas-eyebrow">Nutrition Premium</p>
        <h1>${esc(title)}</h1>
        <p class="saas-muted">${esc(sub)}</p>
      </div>
      <div class="saas-topbar__right">
        <span class="saas-streak-pill">🥗 ${g.streak || 0}j</span>
        <span class="saas-xp-pill">⚡ ${g.xp || 0} XP nutri</span>
        <button type="button" class="theme-toggle" id="saasThemeToggle" aria-label="Thème">◐</button>
      </div>
    </header>`;
  }

  function macroBar(label, current, target, color) {
    const pct = target ? Math.min(100, Math.round((current / target) * 100)) : 0;
    return `
      <div class="nutri-macro">
        <div class="nutri-macro__head"><span>${label}</span><strong>${Math.round(current)}g / ${target}g</strong></div>
        <div class="nutri-macro__track"><div class="nutri-macro__fill" style="width:${pct}%;background:${color}"></div></div>
        <small class="saas-muted">${pct}%</small>
      </div>`;
  }

  function ring(percent, label, value, sub) {
    const off = 264 - (264 * Math.min(100, percent)) / 100;
    return `
      <div class="nutri-ring">
        <svg viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="8"/>
          <circle cx="50" cy="50" r="42" fill="none" stroke="var(--energy)" stroke-width="8"
            stroke-dasharray="264" stroke-dashoffset="${off}" stroke-linecap="round" transform="rotate(-90 50 50)"/>
        </svg>
        <div class="nutri-ring__text"><strong>${value}</strong><span>${label}</span><small>${sub}</small></div>
      </div>`;
  }

  function weightSvg(series) {
    if (!series.length) return '<p class="saas-muted">Ajoutez votre poids pour voir le graphique.</p>';
    const w = 520; const h = 160;
    const vals = series.map((x) => x.weight);
    const min = Math.min(...vals) - 1; const max = Math.max(...vals) + 1;
    const pts = series.map((item, i) => {
      const x = 20 + (i / Math.max(1, series.length - 1)) * (w - 40);
      const y = 15 + ((max - item.weight) / (max - min || 1)) * (h - 40);
      return `${x},${y}`;
    }).join(' ');
    return `<div class="nutri-chart"><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline fill="none" stroke="#22C55E" stroke-width="3" points="${pts}"/></svg></div>`;
  }

  function tabNav() {
    const tabs = [
      ['dashboard', 'Dashboard'],
      ['journal', 'Journal'],
      ['ai', 'IA Repas'],
      ['progress', 'Progrès'],
    ];
    return `<nav class="nutri-tabs">${tabs.map(([id, label]) =>
      `<button type="button" class="nutri-tabs__btn ${activeTab === id ? 'active' : ''}" data-nutri-tab="${id}">${label}</button>`).join('')}</nav>`;
  }

  function renderDashboard(state, np, totals, targets) {
    const remaining = Math.max(0, targets.kcal - totals.calories);
    const kcalPct = targets.kcal ? Math.round((totals.calories / targets.kcal) * 100) : 0;
    const water = Nutri().getWater();
    const waterGoal = np.waterGoalL || 2.5;
    const waterPct = Math.min(100, Math.round((water.liters / waterGoal) * 100));
    const p = state.profile;

    return `
      <div class="nutri-cards">
        <article class="nutri-card nutri-card--glow">${ring(kcalPct, 'Calories', remaining, 'restantes')}</article>
        <article class="nutri-card"><span>Objectif</span><strong>${kcalPct}%</strong><small>calories consommées</small></article>
        <article class="nutri-card"><span>Hydratation</span><strong>${water.liters}L</strong><small>/ ${waterGoal}L · ${waterPct}%</small></article>
        <article class="nutri-card"><span>Poids</span><strong>${Number(p.weight).toFixed(1)}</strong><small>kg → cible ${p.targetWeight} kg</small></article>
      </div>
      <div class="saas-grid-2">
        <article class="saas-panel nutri-glass">
          <div class="saas-panel__head"><h2>Calculateur</h2><span>IMC · BMR · TDEE</span></div>
          <dl class="nutri-stats-dl">
            <div><dt>IMC</dt><dd>${np.bmi ?? '—'}</dd></div>
            <div><dt>BMR</dt><dd>${np.bmr ?? '—'} kcal</dd></div>
            <div><dt>TDEE</dt><dd>${np.tdee ?? '—'} kcal</dd></div>
            <div><dt>Objectif</dt><dd>${esc(np.goalLabel || np.goal)}</dd></div>
            <div><dt>Cible</dt><dd><strong>${targets.kcal} kcal</strong></dd></div>
          </dl>
          <form id="nutriCalcForm" class="saas-form" style="margin-top:14px">
            <label>Objectif nutrition<select name="goal">
              ${Object.entries(Engine().GOALS).map(([k, v]) => `<option value="${k}" ${np.goal === k ? 'selected' : ''}>${v.label}</option>`).join('')}
            </select></label>
            <label>Activité<select name="activityLevel">
              ${Object.entries(Engine().ACTIVITY).map(([k, v]) => `<option value="${k}" ${np.activityLevel === k ? 'selected' : ''}>${v.label}</option>`).join('')}
            </select></label>
            <label>Eau (L/jour)<select name="waterGoalL">
              ${[2, 2.5, 3].map((l) => `<option value="${l}" ${np.waterGoalL === l ? 'selected' : ''}>${l} L</option>`).join('')}
            </select></label>
            <button type="submit" class="btn btn--primary btn--block">Recalculer</button>
          </form>
        </article>
        <article class="saas-panel nutri-glass">
          <div class="saas-panel__head"><h2>Macros du jour</h2><span>${totals.calories} / ${targets.kcal} kcal</span></div>
          ${macroBar('Protéines', totals.protein, targets.protein, '#22C55E')}
          ${macroBar('Glucides', totals.carbs, targets.carbs, '#3B82F6')}
          ${macroBar('Lipides', totals.fat, targets.fat, '#a855f7')}
          <div class="nutri-water-actions" style="margin-top:16px">
            <button type="button" class="btn btn--primary btn--sm" id="addWaterBtn">+1 verre (250ml)</button>
            <span class="saas-muted">${water.glasses} verres</span>
          </div>
        </article>
      </div>
      <article class="saas-panel nutri-glass" style="margin-top:14px">
        <div class="saas-panel__head"><h2>Badges nutrition</h2></div>
        <div class="saas-badges">${Nutri().NUTRITION_BADGES.map((b) => {
          const ok = (Nutri().ensureNutrition(state).gamification.badges || []).includes(b.id);
          return `<span class="saas-badge ${ok ? 'unlocked' : 'locked'}">${b.icon} ${b.name}</span>`;
        }).join('')}</div>
      </article>`;
  }

  function renderJournal(today, totals, targets) {
    const day = Nutri().getDayEntries(today);
    return `
      <article class="saas-panel nutri-glass">
        <div class="saas-panel__head"><h2>Recherche aliments</h2><span>Base nutritionnelle</span></div>
        <input type="search" id="foodSearchInput" class="saas-input" placeholder="Rechercher (ex: poulet, banane)…" autocomplete="off">
        <ul id="foodSearchResults" class="nutri-search-list"></ul>
        <div class="nutri-barcode-stub" style="margin-top:14px;padding:12px;border-radius:10px;border:1px dashed rgba(34,197,94,0.35)">
          <strong>📷 Scanner code-barres</strong>
          <p class="saas-muted" style="margin:8px 0">Structure prête — saisie manuelle du code en attendant la caméra.</p>
          <form id="barcodeForm" class="saas-form" style="display:flex;gap:8px;flex-wrap:wrap">
            <input name="code" placeholder="EAN / code-barres" pattern="[0-9]{8,14}" style="flex:1;min-width:140px">
            <button type="submit" class="btn btn--ghost btn--sm">Rechercher</button>
          </form>
          <p id="barcodeStatus" class="saas-muted" style="font-size:0.8rem;margin-top:8px"></p>
        </div>
      </article>
      <article class="saas-panel nutri-glass" style="margin-top:12px">
        <div class="saas-panel__head"><h2>Ajouter un aliment</h2><span>${today}</span></div>
        <form id="addFoodForm" class="saas-form saas-form--grid">
          <label>Repas<select name="mealKey">${Nutri().MEALS.map((k) => `<option value="${k}">${Nutri().MEAL_LABELS[k]}</option>`).join('')}</select></label>
          <label>Nom<input name="name" required placeholder="Ex: Poulet grillé"></label>
          <label>Quantité<input name="quantity" placeholder="150g"></label>
          <label>Calories<input type="number" name="calories" min="0" required></label>
          <label>Protéines (g)<input type="number" step="0.1" name="protein" min="0"></label>
          <label>Glucides (g)<input type="number" step="0.1" name="carbs" min="0"></label>
          <label>Lipides (g)<input type="number" step="0.1" name="fat" min="0"></label>
          <button type="submit" class="btn btn--primary btn--block">Ajouter</button>
        </form>
      </article>
      ${Nutri().MEALS.map((mealKey) => `
        <article class="saas-panel nutri-glass" style="margin-top:12px">
          <div class="saas-panel__head"><h2>${Nutri().MEAL_LABELS[mealKey]}</h2>
            <span>${(day[mealKey] || []).reduce((a, e) => a + e.calories, 0)} kcal</span></div>
          <ul class="nutri-food-list">
            ${(day[mealKey] || []).length ? (day[mealKey] || []).map((e) => `
              <li>
                <div><strong>${esc(e.name)}</strong><span class="saas-muted">${esc(e.quantity)} · ${e.calories} kcal · P${e.protein} G${e.carbs} L${e.fat}</span></div>
                <button type="button" class="btn btn--ghost btn--sm" data-del-food="${e.id}" data-date="${today}">×</button>
              </li>`).join('') : '<li class="saas-muted">Aucun aliment</li>'}
          </ul>
        </article>`).join('')}
      <article class="saas-panel nutri-glass" style="margin-top:12px">
        <strong>Total jour :</strong> ${totals.calories} kcal · P ${Math.round(totals.protein)}g · G ${Math.round(totals.carbs)}g · L ${Math.round(totals.fat)}g
        <span class="saas-muted"> / objectif ${targets.kcal} kcal</span>
      </article>`;
  }

  function renderAI(np) {
    return `
      <article class="saas-panel nutri-glass">
        <div class="saas-panel__head"><h2>Générer ma journée IA</h2><span>Coach nutrition</span></div>
        <form id="aiMealForm" class="saas-form">
          <label>Consigne<textarea name="prompt" rows="2" placeholder="Ex: Je veux perdre du poids avec 2000 kcal, sans gluten"></textarea></label>
          <label>Allergies (virgules)<input name="allergies" value="${esc((np.allergies || []).join(', '))}"></label>
          <label>Préférences<input name="preferences" placeholder="végétarien, rapide…" value="${esc((np.preferences || []).join(', '))}"></label>
          <label>Budget<select name="budget">
            <option value="low" ${np.budget === 'low' ? 'selected' : ''}>Économique</option>
            <option value="medium" ${np.budget === 'medium' ? 'selected' : ''}>Standard</option>
            <option value="high" ${np.budget === 'high' ? 'selected' : ''}>Premium</option>
          </select></label>
          <button type="submit" class="btn btn--primary btn--glow btn--block">Générer les 4 repas</button>
        </form>
        <div id="aiMealResult"></div>
      </article>
      <article class="saas-panel nutri-glass" style="margin-top:14px">
        <div class="saas-panel__head"><h2>Liste de courses</h2></div>
        <button type="button" class="btn btn--ghost btn--block" id="genShopBtn">Générer ma liste de courses</button>
        <div id="shopListResult"></div>
      </article>`;
  }

  function renderProgress(state) {
    const p = state.profile;
    const series = Nutri().getWeightSeries(chartRange);
    const start = p.startWeight || p.weight;
    const delta = start - p.weight;
    const photos = Nutri().ensureNutrition(state).progressPhotos;

    return `
      <div class="saas-grid-2">
        <article class="saas-panel nutri-glass">
          <div class="saas-panel__head"><h2>Poids</h2></div>
          <p>Actuel : <strong>${Number(p.weight).toFixed(1)} kg</strong> · Cible : <strong>${p.targetWeight} kg</strong></p>
          <p class="nutri-delta ${delta >= 0 ? 'is-loss' : ''}">${delta >= 0 ? '▼' : '▲'} ${Math.abs(delta).toFixed(1)} kg depuis le départ</p>
          <form id="addWeightForm" class="saas-form" style="margin-top:12px">
            <label>Nouveau poids (kg)<input type="number" step="0.1" name="weight" required></label>
            <button type="submit" class="btn btn--primary btn--block">Enregistrer</button>
          </form>
          <div class="nutri-range-btns">
            ${[[7, '7j'], [30, '30j'], [90, '90j'], [365, '1 an']].map(([d, l]) =>
              `<button type="button" class="btn btn--sm ${chartRange === d ? 'btn--primary' : 'btn--ghost'}" data-range="${d}">${l}</button>`).join('')}
          </div>
          ${weightSvg(series)}
        </article>
        <article class="saas-panel nutri-glass">
          <div class="saas-panel__head"><h2>Photos progression</h2><span>Avant / Après</span></div>
          <div class="nutri-photos-grid">
            ${['before', 'after'].map((phase) => `
              <div class="nutri-photo-phase">
                <h3>${phase === 'before' ? 'Avant' : 'Après'}</h3>
                ${['face', 'profile', 'back'].map((angle) => {
                  const ph = photos[phase]?.[angle];
                  return `<label class="nutri-photo-slot">
                    <img src="${ph?.url || '../favicon.svg'}" alt="${angle}">
                    <span>${angle}</span>
                    <input type="file" accept="image/*" data-photo-phase="${phase}" data-photo-angle="${angle}" hidden>
                  </label>`;
                }).join('')}
              </div>`).join('')}
          </div>
        </article>
      </div>`;
  }

  function bindEvents(el, today) {
    el.querySelectorAll('[data-nutri-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.nutriTab;
        nutrition(el);
      });
    });

    document.getElementById('nutriCalcForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      Nutri().recalculateProfile({
        goal: fd.get('goal'),
        activityLevel: fd.get('activityLevel'),
        waterGoalL: Number(fd.get('waterGoalL')),
      });
      if (window.PulseFitNutritionCloud?.isEnabled?.()) {
        await window.PulseFitNutritionCloud.pushProfile(Store().load());
      }
      nutrition(el);
    });

    document.getElementById('addWaterBtn')?.addEventListener('click', () => {
      Nutri().addWaterGlass(today);
      nutrition(el);
    });

    const searchInput = document.getElementById('foodSearchInput');
    const searchResults = document.getElementById('foodSearchResults');
    const renderSearch = () => {
      if (!searchInput || !searchResults) return;
      const hits = Nutri().searchFoods(searchInput.value);
      searchResults.innerHTML = hits.map((f) => `
        <li>
          <button type="button" class="nutri-search-item" data-food-id="${esc(f.id)}">
            <strong>${esc(f.name)}</strong>
            <span>${f.per100g.calories} kcal / 100g · P${f.per100g.protein} G${f.per100g.carbs} L${f.per100g.fat}</span>
          </button>
        </li>`).join('') || '<li class="saas-muted">Aucun résultat</li>';
      searchResults.querySelectorAll('[data-food-id]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const grams = prompt('Quantité en grammes ?', '150');
          if (!grams) return;
          const meal = prompt('Repas : breakfast, lunch, dinner, snack', 'lunch');
          Nutri().addFoodFromDatabase(today, meal || 'lunch', btn.dataset.foodId, grams);
          nutrition(el);
        });
      });
    };
    searchInput?.addEventListener('input', renderSearch);
    renderSearch();

    document.getElementById('barcodeForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = new FormData(e.target).get('code');
      const res = Nutri().lookupBarcode(String(code || '').trim());
      const status = document.getElementById('barcodeStatus');
      if (status) {
        status.textContent = res.found
          ? `✓ ${res.food.name} — ajoutez via la recherche ci-dessus`
          : res.message;
      }
      if (res.found && searchInput) {
        searchInput.value = res.food.name;
        renderSearch();
      }
    });

    document.getElementById('addFoodForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      Nutri().addFoodEntry(today, fd.get('mealKey'), Object.fromEntries(fd.entries()));
      e.target.reset();
      nutrition(el);
    });

    el.querySelectorAll('[data-del-food]').forEach((btn) => {
      btn.addEventListener('click', () => {
        Nutri().removeFoodEntry(btn.dataset.date, btn.dataset.delFood);
        nutrition(el);
      });
    });

    document.getElementById('aiMealForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const state = Store().load();
      const np = Nutri().getProfile();
      np.allergies = String(fd.get('allergies')).split(',').map((s) => s.trim()).filter(Boolean);
      np.preferences = String(fd.get('preferences')).split(',').map((s) => s.trim()).filter(Boolean);
      np.budget = fd.get('budget');
      Nutri().recalculateProfile(np);
      const plan = AI().generateDayPlan({
        nutritionProfile: np,
        prompt: fd.get('prompt'),
        date: today,
      });
      Nutri().saveAiDayPlan(plan);
      const box = document.getElementById('aiMealResult');
      box.innerHTML = `<p class="saas-muted">${esc(plan.summary)}</p>
        ${plan.meals.map((m) => `<div class="nutri-ai-meal"><strong>${Nutri().MEAL_LABELS[m.mealKey]}</strong> — ${esc(m.title)} (${m.totalKcal} kcal)</div>`).join('')}
        <button type="button" class="btn btn--primary btn--block" id="applyAiPlan" style="margin-top:12px">Ajouter au journal</button>`;
      document.getElementById('applyAiPlan')?.addEventListener('click', () => {
        Nutri().applyAiPlanToJournal(plan);
        nutrition(el);
      });
    });

    document.getElementById('genShopBtn')?.addEventListener('click', () => {
      const state = Store().load();
      const n = Nutri().ensureNutrition(state);
      const week = Object.values(n.aiPlans).slice(0, 7);
      if (!week.length) {
        const plan = AI().generateDayPlan({ nutritionProfile: Nutri().getProfile(), date: today });
        week.push(plan);
      }
      const list = AI().generateShoppingList(week, n.profile?.budget || 'medium');
      Nutri().saveShoppingList(list);
      document.getElementById('shopListResult').innerHTML = `
        <p style="margin-top:12px"><strong>~${list.estimatedPrice}€</strong> estimés</p>
        <ul class="nutri-shop-list">${list.items.map((i) => `<li><span>${esc(i.name)}</span><span>${esc(i.quantity)}</span><strong>${i.price}€</strong></li>`).join('')}</ul>`;
    });

    document.getElementById('addWeightForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const w = Number(new FormData(e.target).get('weight'));
      Nutri().addWeightEntry(w);
      nutrition(el);
    });

    el.querySelectorAll('[data-range]').forEach((btn) => {
      btn.addEventListener('click', () => {
        chartRange = Number(btn.dataset.range);
        nutrition(el);
      });
    });

    el.querySelectorAll('[data-photo-phase]').forEach((input) => {
      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file) return;
        try {
          await Nutri().uploadProgressPhoto(input.dataset.photoPhase, input.dataset.photoAngle, file);
          nutrition(el);
        } catch (err) {
          alert(err.message);
        }
      });
    });

    document.getElementById('saasThemeToggle')?.addEventListener('click', () => {
      const next = document.body.dataset.theme === 'light' ? 'dark' : 'light';
      document.body.dataset.theme = next;
      localStorage.setItem('pulsefit-theme', next);
    });
  }

  function nutrition(el) {
    const state = Store().load();
    if (!Nutri().getProfile()?.targetKcal) Nutri().recalculateProfile();
    const np = Nutri().getProfile();
    const targets = Nutri().getTargets();
    const today = Store().todayISO();
    const totals = Nutri().getDayTotals(today);

    let body = '';
    if (activeTab === 'dashboard') body = renderDashboard(state, np, totals, targets);
    else if (activeTab === 'journal') body = renderJournal(today, totals, targets);
    else if (activeTab === 'ai') body = renderAI(np);
    else body = renderProgress(state);

    el.innerHTML = topbar('Nutrition', `${targets.kcal} kcal · ${np.goalLabel || 'objectif personnalisé'}`)
      + tabNav() + `<div class="nutri-body">${body}</div>`;

    bindEvents(el, today);
  }

  window.PulseFitPages = window.PulseFitPages || {};
  window.PulseFitPages.nutrition = nutrition;
})();
