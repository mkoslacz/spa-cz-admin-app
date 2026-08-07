(function () {
  'use strict';

  const STORAGE_KEY = 'spa-cz-admin-prototype';
  const STATE_KEYS = ['auth', 'access', 'connection', 'density', 'inv', 'hotel'];
  const OPTIONS = {
    auth: ['in', 'out'],
    access: ['full', 'read', 'none'],
    connection: ['manual', 'chm'],
    density: ['compact', 'dense'],
    inv: ['many', 'some', 'none'],
    hotel: ['active', 'test'],
  };
  const DEFAULTS = Object.freeze({
    auth: 'in',
    access: 'full',
    connection: 'manual',
    density: 'dense',
    inv: 'many',
    hotel: 'active',
    reservation: 'DEMO-10482',
    from: '2026-09-12',
    to: '2026-10-12',
  });
  const FIXED_TODAY = new Date(2026, 9, 12);
  let state = readState();
  let toastTimer = 0;

  function readState() {
    let stored = {};
    try {
      stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (error) {
      stored = {};
    }
    const next = Object.assign({}, DEFAULTS, stored);
    STATE_KEYS.forEach((key) => {
      try {
        const panelValue = localStorage.getItem('proto:' + key);
        if (panelValue) next[key] = panelValue;
      } catch (error) {
        // Storage is optional when a static file is opened in a restricted context.
      }
    });
    const query = new URLSearchParams(location.search);
    Object.keys(DEFAULTS).forEach((key) => {
      if (query.has(key)) next[key] = query.get(key);
    });
    STATE_KEYS.forEach((key) => {
      if (!OPTIONS[key].includes(next[key])) next[key] = DEFAULTS[key];
    });
    return next;
  }

  function persistState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      // The URL remains the authoritative shareable state.
    }
  }

  function applyState() {
    STATE_KEYS.forEach((key) => {
      if (document.body.dataset[key] !== state[key]) {
        document.body.dataset[key] = state[key];
      }
    });
    const readOnly = state.access !== 'full' || state.connection === 'chm';
    document.querySelectorAll('[data-write-action]').forEach((control) => {
      control.disabled = readOnly;
      control.setAttribute('aria-disabled', String(readOnly));
    });
    document.querySelectorAll('[data-state-output]').forEach((node) => {
      node.textContent = STATE_KEYS.map((key) => key + '=' + state[key]).join(' · ');
    });
    document.querySelectorAll('[data-result-count]').forEach((node) => {
      const countKey = state.inv === 'many' ? 'countMany' : state.inv === 'some' ? 'countSome' : 'countNone';
      if (node.dataset[countKey]) node.textContent = node.dataset[countKey];
    });
    updateDeterministicFacts();
    wireStateLinks();
    persistState();
  }

  function pricingModel() {
    const base = 3577;
    return Object.freeze({
      base,
      partyTotal: base * 2,
    });
  }

  function formatCurrency(value, language) {
    const locale = language === 'cs' ? 'cs-CZ' : 'en-GB';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'CZK',
      maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
    }).format(value);
  }

  function updateDeterministicFacts() {
    const facts = pricingModel();
    const language = document.documentElement.lang === 'cs' ? 'cs' : 'en';
    document.querySelectorAll('[data-price]').forEach((node) => {
      const key = node.dataset.price;
      if (Object.prototype.hasOwnProperty.call(facts, key)) {
        node.textContent = formatCurrency(facts[key], language);
      }
    });
    document.querySelectorAll('[data-fixed-today]').forEach((node) => {
      node.dateTime = localDate(FIXED_TODAY);
    });
  }

  function localDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  function stateQuery() {
    const query = new URLSearchParams();
    STATE_KEYS.forEach((key) => query.set(key, state[key]));
    ['reservation', 'from', 'to'].forEach((key) => query.set(key, state[key]));
    return query;
  }

  function withState(href) {
    if (!href || href.startsWith('#') || /^(mailto:|tel:|https?:)/.test(href)) return href;
    const hashIndex = href.indexOf('#');
    const hash = hashIndex >= 0 ? href.slice(hashIndex) : '';
    const withoutHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
    const queryIndex = withoutHash.indexOf('?');
    const path = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
    const query = new URLSearchParams(queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : '');
    stateQuery().forEach((value, key) => {
      if (!query.has(key)) query.set(key, value);
    });
    const serialized = query.toString();
    return path + (serialized ? '?' + serialized : '') + hash;
  }

  function wireStateLinks() {
    document.querySelectorAll('a[data-carry-state], .mobile-bottom-nav a, .langswitch a').forEach((link) => {
      const original = link.dataset.baseHref || link.getAttribute('href');
      if (!original) return;
      link.dataset.baseHref = original.split('?')[0] + (original.includes('#') ? '#' + original.split('#')[1] : '');
      link.setAttribute('href', withState(original));
    });
  }

  function initPrototypeTools() {
    if (!window.protoTools || typeof window.protoTools.init !== 'function') return;
    window.protoTools.init({
      title: 'SPA.CZ · prototype',
      raised: true,
      carry: STATE_KEYS.concat(['reservation', 'from', 'to']),
      changelog: true,
      usecases: { label: 'Use cases' },
      comments: true,
      switches: [
        {
          key: 'auth', label: 'Account', persist: true, default: DEFAULTS.auth,
          options: [['in', 'Signed in'], ['out', 'Signed out']],
        },
        {
          key: 'access', label: 'Access', persist: true, default: DEFAULTS.access,
          options: [['full', 'Full'], ['read', 'Read only'], ['none', 'No access']],
        },
        {
          key: 'connection', label: 'Connection', persist: true, default: DEFAULTS.connection,
          options: [['manual', 'Manual'], ['chm', 'Channel manager']],
        },
        {
          key: 'density', label: 'Density', persist: true, default: DEFAULTS.density, short: true,
          options: [['compact', 'Compact'], ['dense', 'Dense']],
        },
        {
          key: 'inv', label: 'Demo inventory', persist: true, default: DEFAULTS.inv,
          options: [['many', 'Many'], ['some', 'Some'], ['none', 'None']],
        },
        {
          key: 'hotel', label: 'Property', persist: true, default: DEFAULTS.hotel, short: true,
          options: [['active', 'Active'], ['test', 'Test']],
        },
      ],
    });
    const panel = document.querySelector('.proto-tools');
    if (panel && window.matchMedia('(max-width: 700px)').matches) {
      panel.classList.add('mini');
    }
  }

  function showToast(message) {
    const toast = document.querySelector('.toast');
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function openSheet(id) {
    const sheet = document.getElementById(id);
    if (!sheet) return;
    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden', 'false');
    const focusTarget = sheet.querySelector('input, select, textarea, button');
    if (focusTarget) window.setTimeout(() => focusTarget.focus(), 40);
  }

  function closeSheet(sheet) {
    if (!sheet) return;
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
  }

  function initInteractions() {
    document.addEventListener('click', (event) => {
      const toastControl = event.target.closest('[data-toast]');
      if (toastControl) {
        event.preventDefault();
        showToast(toastControl.dataset.toast);
        return;
      }

      const opener = event.target.closest('[data-open-sheet]');
      if (opener) {
        event.preventDefault();
        openSheet(opener.dataset.openSheet);
        return;
      }

      const closer = event.target.closest('[data-close-sheet]');
      if (closer) {
        event.preventDefault();
        closeSheet(closer.closest('.modal-backdrop'));
        return;
      }

      const backdrop = event.target.classList.contains('modal-backdrop') ? event.target : null;
      if (backdrop) {
        closeSheet(backdrop);
        return;
      }

      const gridShift = event.target.closest('[data-grid-shift]');
      if (gridShift) {
        const grid = document.querySelector('.matrix-wrap');
        if (grid) grid.scrollBy({ left: Number(gridShift.dataset.gridShift) * 260, behavior: 'smooth' });
        return;
      }

      const availability = event.target.closest('.availability-cell');
      if (availability && state.access === 'full' && state.connection === 'manual') {
        availability.classList.toggle('stop');
        availability.textContent = availability.classList.contains('stop') ? '×' : availability.dataset.value;
        showToast(document.documentElement.lang === 'cs' ? 'Demo dostupnost byla upravena.' : 'Demo availability updated.');
        return;
      }

      const filterChip = event.target.closest('[data-filter-chip]');
      if (filterChip) {
        filterChip.classList.toggle('active');
        filterChip.setAttribute('aria-pressed', String(filterChip.classList.contains('active')));
        return;
      }

      const approval = event.target.closest('[data-approval]');
      if (approval && state.access === 'full') {
        const card = approval.closest('.billing-card');
        const status = card && card.querySelector('.status');
        if (status) {
          status.className = 'status success';
          status.textContent = document.documentElement.lang === 'cs' ? 'Schváleno' : 'Approved';
        }
        showToast(approval.dataset.toast || (document.documentElement.lang === 'cs' ? 'Demo rozúčtování bylo schváleno.' : 'Demo settlement approved.'));
      }
    });

    document.addEventListener('submit', (event) => {
      const prototypeForm = event.target.closest('[data-prototype-form]');
      if (!prototypeForm) return;
      event.preventDefault();
      closeSheet(prototypeForm.closest('.modal-backdrop'));
      showToast(prototypeForm.dataset.success || (document.documentElement.lang === 'cs' ? 'Demo změny byly uloženy.' : 'Demo changes saved.'));
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop.open').forEach(closeSheet);
      }
    });

    document.querySelectorAll('.rate-input').forEach((input) => {
      input.addEventListener('change', () => {
        showToast(document.documentElement.lang === 'cs' ? 'Cena byla změněna v demo návrhu.' : 'Price changed in the demo scenario.');
      });
    });
  }

  function observePanelState() {
    const observer = new MutationObserver((mutations) => {
      let changed = false;
      mutations.forEach((mutation) => {
        const key = mutation.attributeName && mutation.attributeName.replace(/^data-/, '');
        const nextValue = key && document.body.dataset[key];
        if (STATE_KEYS.includes(key) && OPTIONS[key].includes(nextValue) && state[key] !== nextValue) {
          state[key] = nextValue;
          changed = true;
        }
      });
      if (changed) applyState();
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: STATE_KEYS.map((key) => 'data-' + key),
    });
  }

  function boot() {
    initPrototypeTools();
    state = readState();
    applyState();
    observePanelState();
    initInteractions();

    const hint = document.querySelector('.prototype-hint');
    if (hint && (navigator.webdriver || new URLSearchParams(location.search).has('nopanel'))) hint.hidden = true;

    // Comments intentionally initialize after protoTools has populated body.dataset.
    if (window.protoComments && typeof window.protoComments.init === 'function') {
      window.protoComments.init();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
