/**
 * PulseFit — Page Coach IA premium
 */
(function () {
  'use strict';

  const esc = (s) => window.PFApp?.esc(s) ?? String(s ?? '');
  const Store = () => window.PulseFitStore;
  const Coach = () => window.PulseFitAICoach;
  const Providers = () => window.PulseFitAIProviders;

  let isLoading = false;

  function formatBotText(text) {
    return esc(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  function topbar(state, analysis) {
    const remote = window.PulseFitLocalAICoachEngine?.shouldUseRemoteLLM?.(state)
      && Providers()?.isConfigured?.();
    const sub = state.subscription || 'free';
    const subLabel = { free: 'Free', pro: 'Pro', elite: 'Elite' }[sub] || 'Free';
    return `
    <header class="saas-topbar">
      <div>
        <p class="saas-eyebrow">Cerveau PulseFit · build ${window.PF_BUILD || 'coach'}</p>
        <h1>Coach IA</h1>
        <p class="saas-muted">Votre coach personnel — données réelles PulseFit</p>
      </div>
      <div class="saas-topbar__right">
        <span class="coach-provider-badge ${remote ? 'is-live' : ''}">${remote ? '● Coach IA cloud (Premium)' : '● Coach local · données réelles'}</span>
        <span class="coach-plan-badge coach-plan-badge--${sub}">${subLabel}</span>
        <span class="saas-streak-pill">🔥 ${analysis?.metrics?.streak ?? state.streak?.current ?? 0}</span>
        <button type="button" class="theme-toggle" id="saasThemeToggle">◐</button>
      </div>
    </header>`;
  }

  function renderDashboard(analysis) {
    const m = analysis?.metrics || {};
    const weightDelta = analysis?.ctx?.weightDeltaMonth;
    const weightTrend = weightDelta != null
      ? `${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)} kg / 30j`
      : '—';
    const goalPct = analysis?.ctx?.stats?.goalProgressPct ?? m.progressPct ?? 0;

    return `
    <section class="coach-dash" aria-label="Tableau de bord IA">
      <article class="coach-dash-card">
        <span class="coach-dash-card__icon">🔥</span>
        <span class="coach-dash-card__label">Série actuelle</span>
        <strong class="coach-dash-card__value">${m.streak ?? 0} j</strong>
      </article>
      <article class="coach-dash-card">
        <span class="coach-dash-card__icon">⚡</span>
        <span class="coach-dash-card__label">XP total</span>
        <strong class="coach-dash-card__value">${m.xp ?? 0}</strong>
      </article>
      <article class="coach-dash-card">
        <span class="coach-dash-card__icon">🏋️</span>
        <span class="coach-dash-card__label">Séances semaine</span>
        <strong class="coach-dash-card__value">${m.sessionsWeek ?? 0}/${m.sessionsPlanned ?? 0}</strong>
      </article>
      <article class="coach-dash-card">
        <span class="coach-dash-card__icon">⚖️</span>
        <span class="coach-dash-card__label">Évolution poids</span>
        <strong class="coach-dash-card__value">${weightTrend}</strong>
      </article>
      <article class="coach-dash-card coach-dash-card--wide">
        <span class="coach-dash-card__icon">🎯</span>
        <span class="coach-dash-card__label">Progression objectif</span>
        <strong class="coach-dash-card__value">${goalPct}%</strong>
        <div class="coach-dash-progress"><span style="width:${Math.min(100, goalPct)}%"></span></div>
      </article>
    </section>`;
  }

  function renderNotifications(notifications) {
    if (!notifications?.length) return '';
    return `
    <section class="coach-notifications" aria-label="Notifications coach">
      ${notifications.map((n) => `
        <div class="coach-notification coach-notification--${esc(n.type || 'info')}">
          <span class="coach-notification__dot"></span>
          ${esc(n.message)}
        </div>`).join('')}
    </section>`;
  }

  function renderHistorySidebar(state, activeId) {
    const groups = Coach().getGroupedHistory(state);
    const renderGroup = (label, items) => {
      if (!items.length) return '';
      return `
        <div class="coach-history-group">
          <h4>${label}</h4>
          ${items.map((c) => `
            <button type="button" class="coach-history-item ${c.id === activeId ? 'is-active' : ''}" data-conv="${esc(c.id)}">
              <span class="coach-history-item__title">${esc(c.title || 'Conversation')}</span>
              <span class="coach-history-item__preview">${esc(c.preview)}</span>
            </button>`).join('')}
        </div>`;
    };

    return `
    <aside class="coach-history" aria-label="Historique conversations">
      <button type="button" class="btn btn--ghost btn--sm btn--block coach-history-new" id="coachNewConv">+ Nouvelle conversation</button>
      ${renderGroup('Aujourd\'hui', groups.today)}
      ${renderGroup('Hier', groups.yesterday)}
      ${renderGroup('Cette semaine', groups.week)}
      ${renderGroup('Plus ancien', groups.older)}
    </aside>`;
  }

  function renderMessages(messages) {
    return messages.map((m) => `
      <div class="coach-msg coach-msg--${m.role === 'user' ? 'user' : 'bot'}">
        ${m.role === 'user' ? esc(m.text) : formatBotText(m.text)}
        <span class="coach-msg__time">${m.at ? new Date(m.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
      </div>`).join('');
  }

  function renderChat(state, locked, analysis, quota) {
    const conv = Coach().activeConversation(state);
    const msgs = conv?.messages || [];
    const suggestions = Coach().QUICK_SUGGESTIONS?.() || [];

    return `
      <div class="coach-layout ${locked ? 'saas-locked-overlay' : ''}">
        ${renderHistorySidebar(state, conv?.id)}
        <div class="coach-main">
          ${renderDashboard(analysis)}
          ${renderNotifications(analysis?.notifications || state.coach?.notifications)}
          <article class="coach-chat-panel">
            <div class="coach-chat" id="coachChat">
              ${renderMessages(msgs)}
              ${isLoading ? '<div class="coach-typing"><span></span><span></span><span></span></div>' : ''}
            </div>
            <div class="coach-suggestions">
              ${suggestions.map((s) =>
                `<button type="button" class="coach-suggestion" data-cmd="${esc(s.id)}" title="${esc(s.prompt)}">${esc(s.label)}</button>`).join('')}
            </div>
            <div class="coach-input-wrap">
              <form class="coach-input" id="coachForm">
                <input type="text" name="msg" placeholder="Ex : Je veux perdre du ventre, comment je continue demain ?" required ${locked || isLoading ? 'disabled' : ''} autocomplete="off">
                <button type="submit" class="btn btn--primary btn--glow" ${locked || isLoading ? 'disabled' : ''}>Envoyer</button>
              </form>
            </div>
            ${locked
              ? '<p class="saas-muted coach-locked-note">Limite Free atteinte (10 msg/j). <a href="../upgrade/">Passer Premium</a></p>'
              : (!quota?.unlimited && quota?.limit
                ? `<p class="saas-muted coach-quota-note">Plan Free · ${quota.remaining}/${quota.limit} messages restants aujourd'hui</p>`
                : '')}
            ${analysis?.isElite ? '<p class="coach-elite-tag">✦ Mode Elite — analyses avancées activées</p>' : ''}
          </article>
        </div>
      </div>`;
  }

  function scrollChat() {
    const chat = document.getElementById('coachChat');
    if (chat) chat.scrollTop = chat.scrollHeight;
  }

  async function submitMessage(text, el) {
    if (!text?.trim() || isLoading) return;
    if (!window.PulseFitAICoach?.sendMessage) {
      alert('Coach IA non chargé — rechargez la page (Ctrl+Shift+R).');
      return;
    }
    isLoading = true;
    const state = Store().load();
    const conv = Coach().activeConversation(state);
    conv.messages.push({ role: 'user', text: text.trim(), at: new Date().toISOString() });
    Store().save(state);
    aiCoach(el);
    try {
      await Coach().sendMessage(text.trim());
    } catch (err) {
      console.error(err);
      const st = Store().load();
      const c = Coach().activeConversation(st);
      c.messages.push({
        role: 'bot',
        text: `Désolé, une erreur s'est produite : ${err.message}`,
        at: new Date().toISOString(),
      });
      Store().save(st);
    }
    isLoading = false;
    aiCoach(el);
  }

  function bindEvents(el) {
    document.getElementById('coachForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      submitMessage(new FormData(e.target).get('msg'), el);
      e.target.reset();
    });

    el.querySelectorAll('[data-cmd]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        isLoading = true;
        aiCoach(el);
        try {
          await Coach().sendQuickCommand(btn.dataset.cmd);
        } catch (err) {
          console.error(err);
        }
        isLoading = false;
        aiCoach(el);
      });
    });

    el.querySelectorAll('[data-conv]').forEach((btn) => {
      btn.addEventListener('click', () => {
        Coach().switchConversation(btn.dataset.conv);
        aiCoach(el);
      });
    });

    document.getElementById('coachNewConv')?.addEventListener('click', () => {
      Coach().newConversation();
      aiCoach(el);
    });

    document.getElementById('saasThemeToggle')?.addEventListener('click', () => {
      const next = document.body.dataset.theme === 'light' ? 'dark' : 'light';
      document.body.dataset.theme = next;
      localStorage.setItem('pulsefit-theme', next);
    });

    scrollChat();
  }

  function aiCoach(el) {
    const state = Store().load();
    Coach().refreshNotifications(state);
    Store().save(state);
    const analysis = Coach().getDashboard(state);
    const quota = Store().getCoachQuota(state);
    const locked = !quota.unlimited && quota.remaining <= 0;
    el.innerHTML = topbar(state, analysis) + renderChat(state, locked, analysis, quota);
    bindEvents(el);
  }

  window.PulseFitPages = window.PulseFitPages || {};
  window.PulseFitPages['ai-coach'] = aiCoach;
})();
