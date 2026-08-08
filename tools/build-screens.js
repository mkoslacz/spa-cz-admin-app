#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ASSET_VERSION = '20260807g';
const SCREENS = [
  'dashboard',
  'reservations',
  'reservation-detail',
  'availability',
  'offer',
  'rate-edit',
  'billing',
  'more',
];

const AVAILABILITY_DATES = [
  { id: '2026-10-12', day: '12', weekday: { cs: 'Po', en: 'Mon' }, className: 'today' },
  { id: '2026-10-13', day: '13', weekday: { cs: 'Út', en: 'Tue' }, className: '' },
  { id: '2026-10-14', day: '14', weekday: { cs: 'St', en: 'Wed' }, className: '' },
  { id: '2026-10-15', day: '15', weekday: { cs: 'Čt', en: 'Thu' }, className: '' },
  { id: '2026-10-16', day: '16', weekday: { cs: 'Pá', en: 'Fri' }, className: '' },
  { id: '2026-10-17', day: '17', weekday: { cs: 'So', en: 'Sat' }, className: 'weekend' },
  { id: '2026-10-18', day: '18', weekday: { cs: 'Ne', en: 'Sun' }, className: 'weekend' },
  { id: '2026-10-19', day: '19', weekday: { cs: 'Po', en: 'Mon' }, className: '' },
  { id: '2026-10-20', day: '20', weekday: { cs: 'Út', en: 'Tue' }, className: '' },
  { id: '2026-10-21', day: '21', weekday: { cs: 'St', en: 'Wed' }, className: '' },
  { id: '2026-10-22', day: '22', weekday: { cs: 'Čt', en: 'Thu' }, className: '' },
  { id: '2026-10-23', day: '23', weekday: { cs: 'Pá', en: 'Fri' }, className: '' },
];

const ROOM_TYPES = [
  {
    id: 'double',
    rank: 1,
    name: { cs: 'Dvoulůžkový', en: 'Double' },
    capacity: { adults: 2, children: 0 },
    availability: [4, 4, 3, 2, 2, 4, 5, 5, 4, 3, 2, 2],
  },
  {
    id: 'deluxe-double',
    rank: 2,
    name: { cs: 'Dvoulůžkový deluxe', en: 'Deluxe double' },
    capacity: { adults: 2, children: 1 },
    availability: [2, 2, 1, 'X', 'X', 2, 3, 3, 2, 2, 1, 1],
  },
  {
    id: 'suite',
    rank: 3,
    name: { cs: 'Apartmá', en: 'Suite' },
    capacity: { adults: 2, children: 2 },
    availability: [1, 1, 1, 0, 0, 1, 1, 2, 2, 1, 0, 0],
  },
  {
    id: 'single',
    rank: 4,
    name: { cs: 'Jednolůžkový', en: 'Single' },
    capacity: { adults: 1, children: 0 },
    availability: [3, 3, 2, 2, 1, 3, 3, 3, 2, 2, 1, 1],
  },
  {
    id: 'family',
    rank: 5,
    name: { cs: 'Rodinný pokoj', en: 'Family room' },
    capacity: { adults: 4, children: 0 },
    availability: [2, 2, 2, 1, 1, 2, 2, 2, 1, 1, 'X', 'X'],
  },
];

function pricesByDate(basePrice, adjustments) {
  return Object.fromEntries(
    AVAILABILITY_DATES.slice(0, 7).map((date, index) => [
      date.id,
      basePrice == null ? null : basePrice + adjustments[index],
    ])
  );
}

function roomPrice(roomTypeId, basePrice, adjustments) {
  return { roomTypeId, eligible: true, prices: pricesByDate(basePrice, adjustments) };
}

const RESERVATIONS = [
  {
    id: 'RSV-10482',
    rank: 1,
    guest: 'Jana Nováková',
    additionalGuest: 'Pavel Novák',
    stay: '12.–14. 10. 2026',
    duration: { cs: '3 dny / 2 noci', en: '3 days / 2 nights' },
    statusKey: 'confirmed',
    status: { cs: 'Potvrzeno', en: 'Confirmed' },
    statusClass: 'success',
    price: 7154,
    queues: ['arrivals', 'departures'],
  },
  {
    id: 'RSV-10477',
    rank: 2,
    guest: 'Petr Dvořák',
    additionalGuest: 'Lucie Dvořáková',
    stay: '16.–19. 10. 2026',
    duration: { cs: '4 dny / 3 noci', en: '4 days / 3 nights' },
    statusKey: 'new',
    status: { cs: 'Nová', en: 'New' },
    statusClass: 'info',
    price: 6240,
    queues: ['arrivals'],
  },
  {
    id: 'RSV-10463',
    rank: 3,
    guest: 'Klára Veselá',
    additionalGuest: 'Tomáš Veselý',
    stay: '20.–23. 10. 2026',
    duration: { cs: '4 dny / 3 noci', en: '4 days / 3 nights' },
    statusKey: 'confirmed',
    status: { cs: 'Potvrzeno', en: 'Confirmed' },
    statusClass: 'success',
    price: 8120,
    queues: ['arrivals', 'departures'],
  },
  {
    id: 'RSV-10451',
    rank: 4,
    guest: 'Martin Černý',
    additionalGuest: '—',
    stay: '27.–29. 10. 2026',
    duration: { cs: '3 dny / 2 noci', en: '3 days / 2 nights' },
    statusKey: 'pending',
    status: { cs: 'Čeká na hotel', en: 'Awaiting hotel' },
    statusClass: 'warning',
    price: 4390,
    queues: ['arrivals'],
  },
  {
    id: 'RSV-10439',
    rank: 5,
    guest: 'Eva Horáková',
    additionalGuest: 'Jan Horák',
    stay: '2.–5. 11. 2026',
    duration: { cs: '4 dny / 3 noci', en: '4 days / 3 nights' },
    statusKey: 'cancelled',
    status: { cs: 'Stornováno', en: 'Cancelled' },
    statusClass: 'danger',
    price: 7030,
    queues: ['departures'],
  },
];

const OFFERS = [
  {
    id: 'cajkovskij-stay',
    rank: 1,
    title: { cs: 'Pobyt SPA HOTEL ČAJKOVSKIJ', en: 'SPA HOTEL ČAJKOVSKIJ stay' },
    duration: { cs: '3 dny / 2 noci', en: '3 days / 2 nights' },
    meal: { cs: 'Pobytový balíček se snídaní', en: 'Stay package with breakfast' },
    active: true,
    spa: true,
    roomPrices: [
      roomPrice('double', 3577, [0, 0, 250, 540, 540, 0, 0]),
      roomPrice('deluxe-double', 3977, [0, 0, 250, 540, 540, 0, 0]),
      roomPrice('suite', 4577, [0, 0, 250, 540, 540, 0, 0]),
    ],
  },
  {
    id: 'wellness-weekend',
    rank: 2,
    title: { cs: 'Wellness víkend', en: 'Wellness weekend' },
    duration: { cs: '3 dny / 2 noci', en: '3 days / 2 nights' },
    meal: { cs: 'Snídaně', en: 'Breakfast' },
    active: true,
    spa: true,
    roomPrices: [
      roomPrice('double', 4890, [0, 0, 300, 650, 650, 0, 0]),
      roomPrice('deluxe-double', 5290, [0, 0, 300, 650, 650, 0, 0]),
      roomPrice('suite', 5890, [0, 0, 300, 650, 650, 0, 0]),
    ],
  },
  {
    id: 'spa-week',
    rank: 3,
    title: { cs: 'Lázeňský týden', en: 'Spa week' },
    duration: { cs: '8 dní / 7 nocí', en: '8 days / 7 nights' },
    meal: { cs: 'Polopenze', en: 'Half board' },
    active: true,
    spa: false,
    roomPrices: [
      roomPrice('double', 14200, [0, 0, 500, 900, 900, 0, 0]),
      roomPrice('deluxe-double', 14900, [0, 0, 500, 900, 900, 0, 0]),
      roomPrice('suite', 16100, [0, 0, 500, 900, 900, 0, 0]),
      roomPrice('single', 13600, [0, 0, 500, 900, 900, 0, 0]),
      roomPrice('family', 17400, [0, 0, 500, 900, 900, 0, 0]),
    ],
  },
  {
    id: 'break-for-two',
    rank: 4,
    title: { cs: 'Odpočinek pro dva', en: 'Break for two' },
    duration: { cs: '4 dny / 3 noci', en: '4 days / 3 nights' },
    meal: { cs: 'Snídaně', en: 'Breakfast' },
    active: false,
    spa: false,
    roomPrices: [
      roomPrice('double', null, [0, 0, 0, 0, 0, 0, 0]),
      roomPrice('deluxe-double', null, [0, 0, 0, 0, 0, 0, 0]),
    ],
  },
];

function packageStartingPrice(offer) {
  const prices = offer.roomPrices.flatMap(row => Object.values(row.prices)).filter(Number.isFinite);
  return prices.length ? Math.min(...prices) : null;
}

function packageHasRates(offer) {
  return packageStartingPrice(offer) != null;
}

function tr(lang, cs, en) {
  return lang === 'cs' ? cs : en;
}

function file(screen, lang) {
  return `m-${screen}${lang === 'en' ? '-en' : ''}.html`;
}

function route(screen, lang, params = {}) {
  const query = new URLSearchParams(params).toString();
  return file(screen, lang) + (query ? `?${query}` : '');
}

function localized(value, lang) {
  return value && typeof value === 'object' ? value[lang] : value;
}

function fixturePayload(fixtures, lang) {
  return JSON.stringify(
    fixtures.map(fixture => ({
      ...fixture,
      price: fixture.roomPrices ? packageStartingPrice(fixture) : fixture.price,
      hasRates: fixture.roomPrices ? packageHasRates(fixture) : fixture.hasRates,
      title: localized(fixture.title, lang),
      duration: localized(fixture.duration, lang),
      meal: localized(fixture.meal, lang),
      status: localized(fixture.status, lang),
    }))
  ).replace(/</g, '\\u003c');
}

function outcomeAttributes(outcome) {
  const kinds = ['route', 'sheet', 'terminal'].filter(kind => outcome && outcome[kind]);
  if (kinds.length !== 1) {
    throw new Error(`A visible control requires exactly one outcome; received ${kinds.length}`);
  }
  if (outcome.route) {
    return `href="${outcome.route}" data-carry-state data-outcome="route"`;
  }
  if (outcome.sheet) {
    return `type="button" data-open-sheet="${outcome.sheet}" data-outcome="sheet"`;
  }
  if (!outcome.terminal.id || !outcome.terminal.message) {
    throw new Error('A terminal outcome requires a stable id and a precise message');
  }
  return `type="button" data-terminal="${outcome.terminal.id}" data-terminal-message="${outcome.terminal.message}" data-outcome="terminal"`;
}

function icon(name, className = '') {
  const paths = {
    dashboard: '<path d="M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z"/>',
    reservations:
      '<path d="M6 3h12a2 2 0 0 1 2 2v15l-3-2-3 2-3-2-3 2-3-2-3 2V5a2 2 0 0 1 2-2h2Zm2 5h8V6H8v2Zm0 4h8v-2H8v2Zm0 4h5v-2H8v2Z"/>',
    availability:
      '<path d="M5 3h2v2h10V3h2v2h1a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h1V3Zm15 7H4v10h16V10ZM7 12h3v3H7v-3Zm5 0h3v3h-3v-3Zm5 0h2v3h-2v-3ZM7 17h3v2H7v-2Zm5 0h3v2h-3v-2Z"/>',
    offer: '<path d="m3 12 9-9h7a2 2 0 0 1 2 2v7l-9 9L3 12Zm13-4.5A1.5 1.5 0 1 0 16 4a1.5 1.5 0 0 0 0 3.5Z"/>',
    more: '<path d="M5 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm7 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm7 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z"/>',
    building:
      '<path d="M4 21V3h11v6h5v12h-7v-4h-2v4H4Zm3-14h2V5H7v2Zm4 0h2V5h-2v2ZM7 11h2V9H7v2Zm4 0h2V9h-2v2Zm-4 4h2v-2H7v2Zm8-2v2h2v-2h-2Zm0 4v2h2v-2h-2Z"/>',
    chevron: '<path d="m9 18 6-6-6-6-1.4 1.4 4.6 4.6-4.6 4.6L9 18Z"/>',
    arrowLeft: '<path d="m15 18-6-6 6-6 1.4 1.4-4.6 4.6 4.6 4.6L15 18Z"/>',
    arrowRight: '<path d="m9 18 6-6-6-6 1.4-1.4 7.4 7.4-7.4 7.4L9 18Z"/>',
    bell: '<path d="M18 16v-5a6 6 0 0 0-5-5.9V4a1 1 0 0 0-2 0v1.1A6 6 0 0 0 6 11v5l-2 2h16l-2-2Zm-8 3h4a2 2 0 0 1-4 0Z"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z"/>',
    calendar:
      '<path d="M5 3h2v2h10V3h2v2h1a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h1V3Zm15 7H4v10h16V10Z"/>',
    users:
      '<path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm6-1a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM9 13c-4 0-7 2-7 5v2h14v-2c0-3-3-5-7-5Zm7 0c-.6 0-1.2.1-1.8.2 2.3 1 3.8 2.7 3.8 4.8v2h4v-2c0-3-2.6-5-6-5Z"/>',
    bed: '<path d="M3 4h2v8h4V7h6a4 4 0 0 1 4 4v1h2v8h-2v-2H5v2H3V4Zm8 8h6v-1a2 2 0 0 0-2-2h-4v3Z"/>',
    image:
      '<path d="M4 3h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm0 16h16l-5-6-4 4-3-3-4 5Zm11-9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>',
    invoice: '<path d="M5 2h14v20l-3-2-2 2-2-2-2 2-2-2-3 2V2Zm4 5h6V5H9v2Zm-1 4h8V9H8v2Zm0 4h8v-2H8v2Z"/>',
    settings:
      '<path d="m19.4 13 .1-1-.1-1 2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L15 3.5h-4l-.4 2.6a8 8 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5-.1 1 .1 1-2 1.5 2 3.4 2.4-1a8 8 0 0 0 1.7 1l.4 2.6h4l.4-2.6a8 8 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5ZM13 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z"/>',
    help: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 17h-2v-2h2v2Zm2.1-7.8-.9.9c-.8.7-1.2 1.3-1.2 2.9h-2v-.5c0-1.1.4-2.1 1.2-2.9l1.2-1.2a2 2 0 1 0-3.4-1.4H8a4 4 0 1 1 7.1 2.2Z"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7 1.4 1.4L15 5a3 3 0 0 1 4.2 4.2l-3 3a3 3 0 0 1-4.2 0L10 13Zm4-2a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7-1.4-1.4L9 19a3 3 0 1 1-4.2-4.2l3-3a3 3 0 0 1 4.2 0L14 11Z"/>',
    edit: '<path d="M4 17.3V21h3.7L18.8 9.9l-3.7-3.7L4 17.3ZM21.7 7a1 1 0 0 0 0-1.4l-3.3-3.3a1 1 0 0 0-1.4 0l-1.8 1.8 3.7 3.7L21.7 7Z"/>',
    document: '<path d="M6 2h8l5 5v15H6V2Zm8 2.5V8h3.5L14 4.5ZM9 13h7v-2H9v2Zm0 4h7v-2H9v2Z"/>',
    upload: '<path d="M11 16h2V8l3.5 3.5 1.4-1.4L12 4.2l-5.9 5.9 1.4 1.4L11 8v8Zm-7 4h16v-5h2v7H2v-7h2v5Z"/>',
    clock: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 11h5v-2h-4V6h-2v7h1Z"/>',
  };
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">${paths[name] || paths.more}</svg>`;
}

function navItem(screen, active, lang, iconName, cs, en, badge) {
  const badgeHtml = badge ? `<span class="nav-badge" data-kind="${badge.kind}">${badge.value}</span>` : '';
  return `<a href="${file(screen, lang)}" data-carry-state class="${active ? 'active' : ''}" ${active ? 'aria-current="page"' : ''}>
    ${icon(iconName, 'nav-icon')}${badgeHtml}<span>${tr(lang, cs, en)}</span>
  </a>`;
}

function bottomNav(page, lang) {
  const active =
    page === 'reservation-detail'
      ? 'reservations'
      : page === 'rate-edit'
        ? 'offer'
        : page === 'billing'
          ? 'more'
          : page;
  return `<nav class="mobile-bottom-nav" aria-label="${tr(lang, 'Hlavní navigace', 'Primary navigation')}">
    ${navItem('dashboard', active === 'dashboard', lang, 'dashboard', 'Přehled', 'Overview')}
    ${navItem('reservations', active === 'reservations', lang, 'reservations', 'Rezervace', 'Reservations', { kind: 'reservation', value: '5' })}
    ${navItem('availability', active === 'availability', lang, 'availability', 'Dostupnost', 'Availability')}
    ${navItem('offer', active === 'offer', lang, 'offer', 'Nabídka', 'Offer')}
    ${navItem('more', active === 'more', lang, 'more', 'Více', 'More', { kind: 'changes', value: '2' })}
  </nav>`;
}

function languageSwitch(page, lang) {
  return `<nav class="langswitch" aria-label="Language">
    <a href="${file(page, 'cs')}" data-carry-state data-lang="cs" class="${lang === 'cs' ? 'on' : ''}">CZ</a>
    <a href="${file(page, 'en')}" data-carry-state data-lang="en" class="${lang === 'en' ? 'on' : ''}">EN</a>
  </nav>`;
}

function header(lang) {
  return `<header class="mobile-header">
    <button class="mobile-brand" type="button" data-open-sheet="property-sheet" aria-label="${tr(lang, 'Vybrat ubytovací zařízení', 'Select property')}">
      <img src="assets/logo.svg" alt="SPA.CZ">
      <span class="hotel-summary">
        <strong>SPA HOTEL ČAJKOVSKIJ</strong>
        <small><span class="connection-pill"><span class="connection-manual">${tr(lang, 'Ruční správa', 'Manual')}</span><span class="connection-chm">Channel Manager</span></span></small>
      </span>
    </button>
    <button class="header-button" type="button" data-open-sheet="notification-sheet" data-outcome="sheet" aria-label="${tr(lang, 'Oznámení', 'Notifications')}">${icon('bell')}</button>
  </header>`;
}

function stateAlerts(lang, includeChm = false) {
  return `<div class="alert warning readonly-alert"><strong>${tr(lang, 'Pouze pro čtení.', 'Read-only access.')}</strong>&nbsp;${tr(lang, 'Úpravy jsou pro tuto roli vypnuté.', 'Editing is disabled for this role.')}</div>
  ${includeChm ? `<div class="alert warning chm-alert"><strong>Channel Manager.</strong>&nbsp;${tr(lang, 'Dostupnost a ceny se upravují v připojeném systému.', 'Availability and rates are managed in the connected system.')}</div>` : ''}
  <div class="alert info test-alert"><strong>${tr(lang, 'Testovací zařízení.', 'Test property.')}</strong>&nbsp;${tr(lang, 'Změny nejsou publikovány na SPA.CZ.', 'Changes are not published on SPA.CZ.')}</div>`;
}

function pageHead(lang, title, subtitle, label = true, action = '') {
  return `<div class="page-head">
    <div><h1>${title}</h1><p>${subtitle}</p></div>
    ${action}
  </div>`;
}

function emptyState(lang, titleCs, titleEn, textCs, textEn) {
  return `<div class="empty-state"><div class="empty-inner">
    ${icon('offer')}
    <h2>${tr(lang, titleCs, titleEn)}</h2>
    <p>${tr(lang, textCs, textEn)}</p>
  </div></div>`;
}

function dashboard(lang) {
  return `${pageHead(lang, tr(lang, 'Přehled', 'Overview'), tr(lang, 'Dnešní provoz a úkoly partnera na jednom místě.', 'Today’s operation and partner tasks in one place.'))}
    ${stateAlerts(lang)}
    <div class="metrics-grid inventory-content">
      <a class="card metric-card dashboard-action" data-dashboard-action="kpi-arrivals" ${outcomeAttributes({ route: route('reservations', lang, { queue: 'arrivals' }) })}><span class="metric-icon">${icon('availability')}</span><span class="metric-copy"><small>${tr(lang, 'Dnešní příjezdy', 'Today’s arrivals')}</small><strong class="metric-value">4</strong></span></a>
      <a class="card metric-card dashboard-action" data-dashboard-action="kpi-departures" ${outcomeAttributes({ route: route('reservations', lang, { queue: 'departures' }) })}><span class="metric-icon">${icon('clock')}</span><span class="metric-copy"><small>${tr(lang, 'Dnešní odjezdy', 'Today’s departures')}</small><strong class="metric-value">3</strong></span></a>
      <a class="card metric-card dashboard-action" data-dashboard-action="kpi-rooms" ${outcomeAttributes({ route: route('availability', lang) })}><span class="metric-icon">${icon('bed')}</span><span class="metric-copy"><small>${tr(lang, 'Volné pokoje', 'Rooms available')}</small><strong class="metric-value">22</strong></span></a>
      <a class="card metric-card dashboard-action" data-dashboard-action="kpi-approvals" ${outcomeAttributes({ route: route('billing', lang, { billingFilter: 'pending' }) })}><span class="metric-icon">${icon('invoice')}</span><span class="metric-copy"><small>${tr(lang, 'Ke schválení', 'Awaiting approval')}</small><strong class="metric-value">3</strong></span></a>
    </div>
    ${emptyState(lang, 'Žádná aktivita', 'No activity', 'Přepínač záznamů je nastaven na „žádné“.', 'Record volume is set to none.')}

    <div class="section-head"><h2>${tr(lang, 'Vyžaduje pozornost', 'Needs attention')}</h2></div>
    <section class="card flush inventory-content">
      <ul class="task-list">
        <li class="task-item" data-inventory-rank="1"><a class="task-link dashboard-action" data-dashboard-action="task-billing" ${outcomeAttributes({ route: route('billing', lang, { billingFilter: 'pending' }) })}><span class="task-count">3</span><span><strong>${tr(lang, 'Rezervace k rozúčtování', 'Reservations to settle')}</strong><small>${tr(lang, 'Zkontrolujte cenu a provizi', 'Review price and commission')}</small></span>${icon('chevron')}</a></li>
        <li class="task-item" data-inventory-rank="2"><a class="task-link dashboard-action" data-dashboard-action="task-changes" ${outcomeAttributes({ route: route('more', lang, { section: 'changes' }) })}><span class="task-count">2</span><span><strong>${tr(lang, 'Změny čekají na schválení', 'Changes await approval')}</strong><small>${tr(lang, 'Proces čtyř očí', 'Four-eyes process')}</small></span>${icon('chevron')}</a></li>
        <li class="task-item" data-inventory-rank="3"><a class="task-link dashboard-action" data-dashboard-action="task-availability" ${outcomeAttributes({ route: route('availability', lang) })}><span class="task-count">7</span><span><strong>${tr(lang, 'Nízká dostupnost', 'Low availability')}</strong><small>${tr(lang, 'Sedm nocí v kalendáři', 'Seven nights in the calendar')}</small></span>${icon('chevron')}</a></li>
      </ul>
    </section>

    <div class="section-head"><h2>${tr(lang, 'Aktuální rezervace', 'Recent reservations')}</h2><a href="${file('reservations', lang)}" data-carry-state>${tr(lang, 'Zobrazit vše', 'View all')}</a></div>
    <div class="reservation-list inventory-content">
      ${RESERVATIONS.slice(0, 2)
        .map(reservation => reservationCard(lang, reservation))
        .join('')}
    </div>

    <div class="section-head"><h2>${tr(lang, 'Nabídka', 'Offer')}</h2></div>
    <article class="offer-card">
      <div class="offer-visual"><div><small>SPA HOTEL ČAJKOVSKIJ</small><strong>${tr(lang, '3 dny / 2 noci', '3 days / 2 nights')}</strong></div></div>
      <div class="offer-copy"><h2>${tr(lang, 'Pobyt na SPA.CZ', 'Stay on SPA.CZ')}</h2><p>${tr(lang, 'Pobytový balíček se snídaní.', 'Stay package with breakfast.')}</p></div>
      <div class="offer-price"><div><small>${tr(lang, 'cena od', 'price from')}</small><strong>3 577 Kč</strong></div><a class="button primary dashboard-action" data-dashboard-action="offer-package" ${outcomeAttributes({ route: route('rate-edit', lang, { offer: 'cajkovskij-stay' }) })}>${tr(lang, 'Ceny', 'Rates')}</a></div>
    </article>`;
}

function reservationCard(lang, reservation) {
  return `<a class="reservation-card" data-inventory-rank="${reservation.rank}" data-reservation-status="${reservation.statusKey}" data-reservation-queues="${reservation.queues.join(' ')}" href="${route('reservation-detail', lang, { reservation: reservation.id })}" data-carry-state>
    <div class="card-line"><strong class="truncate">${reservation.guest}</strong><span class="status ${reservation.statusClass}">${localized(reservation.status, lang)}</span></div>
    <div class="card-line secondary"><span>${reservation.id}</span><span>${tr(lang, 'Vytvořeno', 'Created')} 8. 10.</span></div>
    <div class="card-line financial"><span>${reservation.stay}</span><strong>${formatPrice(reservation.price)}</strong></div>
  </a>`;
}

function formatPrice(value) {
  return value == null ? '—' : `${new Intl.NumberFormat('cs-CZ').format(value)} Kč`;
}

function reservations(lang) {
  const cards = RESERVATIONS.map(reservation => reservationCard(lang, reservation)).join('\n');
  return `${pageHead(lang, tr(lang, 'Rezervace', 'Reservations'), tr(lang, 'Hustý seznam pro rychlou kontrolu hosta, termínu, stavu a ceny.', 'A dense list for checking guest, stay, status and price at a glance.'), true, `<button class="page-action-icon" type="button" data-open-sheet="filter-sheet" aria-label="${tr(lang, 'Filtrovat', 'Filter')}">${icon('filter')}</button>`)}
    ${stateAlerts(lang)}
    <div class="filter-bar">
      <button class="date-control" type="button" data-open-sheet="filter-sheet">${icon('calendar')}<span>${tr(lang, 'Příjezd', 'Arrival')}: 12. 9.–12. 10. 2026</span></button>
      <button class="page-action-icon" type="button" data-terminal="reservation-csv" data-terminal-message="${tr(lang, 'CSV export: 5 rezervací, období 12. 9.–12. 10. 2026.', 'CSV export: 5 reservations, 12 September–12 October 2026.')}" aria-label="${tr(lang, 'Export CSV', 'Export CSV')}">${icon('upload')}</button>
    </div>
    <div class="filter-scroll" aria-label="${tr(lang, 'Aktivní filtry', 'Active filters')}">
      <button class="chip" type="button" data-reservation-filter="all" aria-pressed="false">${tr(lang, 'Všechny', 'All')}</button>
      <button class="chip" type="button" data-reservation-filter="confirmed" aria-pressed="false">${tr(lang, 'Potvrzené', 'Confirmed')}</button>
      <button class="chip" type="button" data-reservation-filter="pending" aria-pressed="false">${tr(lang, 'Čekající', 'Pending')}</button>
      <button class="chip" type="button" data-reservation-filter="cancelled" aria-pressed="false">${tr(lang, 'Stornované', 'Cancelled')}</button>
    </div>
    <div class="section-head"><h2><span data-reservation-count>5</span> ${tr(lang, 'rezervací', 'reservations')}</h2><span class="meta">20 / ${tr(lang, 'strana', 'page')}</span></div>
    <div class="reservation-list inventory-content">${cards}</div>
    <div class="filter-empty" data-reservation-empty hidden>${emptyState(lang, 'Žádné rezervace', 'No reservations', 'Tomuto filtru neodpovídá žádná rezervace.', 'No reservation matches this filter.')}</div>
    ${emptyState(lang, 'Žádné rezervace', 'No reservations', 'Pro tento stav nejsou žádné výsledky.', 'There are no results for this state.')}`;
}

function reservationDetail(lang) {
  return `<a class="back-link" href="${file('reservations', lang)}" data-carry-state>${icon('arrowLeft')} ${tr(lang, 'Rezervace', 'Reservations')}</a>
    <div class="identity-found">
    ${pageHead(lang, `${tr(lang, 'Rezervace', 'Reservation')} <span data-reservation-field="id">RSV-10482</span>`, tr(lang, 'Údaje hosta a pobytu pro vybranou rezervaci.', 'Guest and stay details for the selected reservation.'))}
    ${stateAlerts(lang)}
    <div class="summary-band">
      <div class="summary-cell"><small>${tr(lang, 'Stav', 'Status')}</small><strong><span class="status success" data-reservation-field="status">${tr(lang, 'Potvrzeno', 'Confirmed')}</span></strong></div>
      <div class="summary-cell"><small>${tr(lang, 'Vytvořeno', 'Created')}</small><strong>8. 10. 2026</strong></div>
      <div class="summary-cell wide"><small>${tr(lang, 'Pobyt', 'Stay')}</small><strong><span data-reservation-field="stay">12.–14. 10. 2026</span> · <span data-reservation-field="duration">${tr(lang, '3 dny / 2 noci', '3 days / 2 nights')}</span></strong></div>
      <div class="summary-cell"><small>Check-in</small><strong>14:00</strong></div>
      <div class="summary-cell"><small>Check-out</small><strong>10:00</strong></div>
    </div>

    <section class="card">
      <div class="section-head"><h2>${tr(lang, 'Pobyt', 'Stay')}</h2></div>
      <div class="definition-grid">
        <dl><dt>${tr(lang, 'Zařízení', 'Property')}</dt><dd>SPA HOTEL ČAJKOVSKIJ</dd></dl>
        <dl><dt>${tr(lang, 'Balíček', 'Package')}</dt><dd data-reservation-field="duration">${tr(lang, '3 dny / 2 noci', '3 days / 2 nights')}</dd></dl>
        <dl><dt>${tr(lang, 'Pokoj', 'Room')}</dt><dd>${tr(lang, 'Dvoulůžkový pokoj', 'Double room')}</dd></dl>
        <dl><dt>${tr(lang, 'Hosté', 'Guests')}</dt><dd>2 ${tr(lang, 'dospělí', 'adults')}</dd></dl>
      </div>
    </section>

    <section class="card">
      <div class="section-head"><h2>${tr(lang, 'Host a kontakt', 'Guest and contact')}</h2></div>
      <div class="definition-grid">
        <dl><dt>${tr(lang, 'Kontaktní osoba', 'Contact person')}</dt><dd data-reservation-field="guest">Jana Nováková</dd></dl>
        <dl><dt>${tr(lang, 'Telefon', 'Phone')}</dt><dd>+420 000 000 000</dd></dl>
        <dl><dt>E-mail</dt><dd>guest@example.invalid</dd></dl>
        <dl><dt>${tr(lang, 'Další host', 'Additional guest')}</dt><dd data-reservation-field="additionalGuest">Pavel Novák</dd></dl>
      </div>
    </section>

    <section class="card">
      <div class="section-head"><h2>${tr(lang, 'Cena a provize', 'Price and commission')}</h2></div>
      <div class="finance-summary">
        <dl><dt>${tr(lang, 'Cena rezervace', 'Reservation price')}</dt><dd data-reservation-field="price">7 154 Kč</dd></dl>
        <dl class="total"><dt>${tr(lang, 'Celkem', 'Total')}</dt><dd data-reservation-field="price">7 154 Kč</dd></dl>
        <dl><dt>${tr(lang, 'Provize vč. DPH', 'Commission incl. VAT')}</dt><dd>${tr(lang, 'Dle partnerské smlouvy', 'Per partner contract')}</dd></dl>
      </div>
    </section>

    <section class="card">
      <div class="section-head"><h2>${tr(lang, 'Storno a dokumenty', 'Cancellation and documents')}</h2></div>
      <ul class="detail-list">
        <li class="detail-row"><span><strong>${tr(lang, 'Storno podmínky', 'Cancellation policy')}</strong><br><small class="subtle">${tr(lang, 'Podmínky přiřazené k rezervaci.', 'Terms assigned to the reservation.')}</small></span><span class="status warning">${tr(lang, 'Individuální', 'Individual')}</span></li>
        <li class="detail-row"><span><strong>Voucher PDF</strong><br><small class="subtle">${tr(lang, 'Dokument pro tuto rezervaci', 'Document for this reservation')}</small></span><button class="page-action-icon" type="button" data-open-sheet="voucher-sheet" aria-label="Voucher PDF">${icon('document')}</button></li>
      </ul>
    </section>
    <div class="sticky-action-bar"><span><small>${tr(lang, 'Další krok', 'Next step')}</small><strong>${tr(lang, 'Rozúčtování rezervace', 'Reservation settlement')}</strong></span><a class="button primary" href="${route('billing', lang, { billingFilter: 'pending' })}" data-carry-state>${tr(lang, 'Otevřít', 'Open')}</a></div>
    </div>
    <section class="identity-missing card" hidden><h1>${tr(lang, 'Rezervace nebyla nalezena', 'Reservation not found')}</h1><p>${tr(lang, 'Požadované ID rezervace není dostupné.', 'The requested reservation ID is unavailable.')}</p><a class="button primary" href="${file('reservations', lang)}" data-carry-state>${tr(lang, 'Zpět na rezervace', 'Back to reservations')}</a></section>
    <script id="reservation-fixtures" type="application/json">${fixturePayload(RESERVATIONS, lang)}</script>`;
}

function availabilityMatrix(lang) {
  const headers = AVAILABILITY_DATES.map(
    date =>
      `<th class="${date.className}" data-date-id="${date.id}">${localized(date.weekday, lang)}<br><strong>${date.day}</strong></th>`
  ).join('');
  const body = ROOM_TYPES.map(
    roomType =>
      `<tr data-inventory-rank="${roomType.rank}" data-room-type-id="${roomType.id}"><td class="sticky-col"><strong>${localized(roomType.name, lang)}</strong><small>${roomType.capacity.adults}+${roomType.capacity.children}</small></td>${roomType.availability
        .map((value, index) => {
          const stopped = value === 'X';
          const low = value === 0 || value === 1;
          const date = AVAILABILITY_DATES[index];
          return `<td class="availability-cell ${date.className} ${stopped ? 'stop' : ''} ${low ? 'low' : ''}" data-room-type-id="${roomType.id}" data-date-id="${date.id}" data-availability-id="${roomType.id}:${date.id}" data-value="${stopped ? 0 : value}">${stopped ? '×' : value}</td>`;
        })
        .join('')}</tr>`
  ).join('');
  return `<div class="matrix-wrap inventory-content" aria-label="${tr(lang, 'Dostupnost typů pokojů', 'Room type availability')}"><table class="matrix"><thead><tr><th class="sticky-col">${tr(lang, 'Typ pokoje / říjen 2026', 'Room type / October 2026')}</th>${headers}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function availability(lang) {
  return `${pageHead(lang, tr(lang, 'Dostupnost', 'Availability'), tr(lang, 'Kapacita pokojů po dnech; první sloupec a datum zůstávají při posunu viditelné.', 'Daily room capacity with sticky room labels and dates.'))}
    ${stateAlerts(lang, true)}
    <div class="alert info"><strong>${tr(lang, 'Kapacita typů pokojů.', 'Room type capacity.')}</strong>&nbsp;${tr(lang, 'Číslo znamená volné jednotky, × znamená stop prodej.', 'A number is available units; × means stop sell.')}</div>
    <div class="matrix-toolbar"><button class="page-action-icon" type="button" data-grid-shift="-1" aria-label="${tr(lang, 'Předchozí dny', 'Previous days')}">${icon('arrowLeft')}</button><strong>${tr(lang, '12.–23. října 2026', '12–23 October 2026')}</strong><button class="page-action-icon" type="button" data-grid-shift="1" aria-label="${tr(lang, 'Další dny', 'Next days')}">${icon('arrowRight')}</button></div>
    ${availabilityMatrix(lang)}
    ${emptyState(lang, 'Žádné pokoje', 'No rooms', 'V tomto stavu není co zobrazit.', 'There is nothing to show in this state.')}
    <div class="section-head"><h2>${tr(lang, 'Hromadná změna', 'Bulk action')}</h2></div>
    <section class="card"><p class="subtle">${tr(lang, 'Nastavte stop prodej pro vybraný termín bez úpravy každé buňky.', 'Set stop sell for a date range without editing each cell.')}</p><button class="button full" type="button" data-open-sheet="availability-sheet" data-write-action data-chm-write>${tr(lang, 'Uzavřít termín', 'Close a date range')}</button></section>`;
}

function offerCard(lang, offer) {
  const startingPrice = packageStartingPrice(offer);
  const hasRates = packageHasRates(offer);
  return `<article class="offer-card ${offer.rank === 1 ? 'featured' : 'compact'}" data-inventory-rank="${offer.rank}" data-offer-id="${offer.id}" data-offer-active="${offer.active}" data-offer-spa="${offer.spa}" data-offer-has-rates="${hasRates}">
    <div class="offer-visual"><div><small>${offer.rank === 1 ? 'SPA HOTEL ČAJKOVSKIJ' : tr(lang, 'POBYTOVÁ NABÍDKA', 'STAY OFFER')}</small><strong>${localized(offer.duration, lang)}</strong></div></div>
    <div class="offer-copy"><div class="card-line"><h2>${localized(offer.title, lang)}</h2></div><p>${localized(offer.meal, lang)}</p><div class="offer-meta"><span class="status ${offer.active ? 'success' : 'warning'}">${offer.active ? tr(lang, 'Aktivní', 'Active') : tr(lang, 'Koncept', 'Draft')}</span>${offer.spa ? '<span class="status info">SPA.CZ</span>' : ''}</div></div>
    <div class="offer-price"><div><small>${hasRates ? tr(lang, 'cena od', 'price from') : tr(lang, 'bez cen', 'missing rates')}</small><strong>${formatPrice(startingPrice)}</strong></div><a class="button primary" href="${route('rate-edit', lang, { offer: offer.id })}" data-carry-state>${tr(lang, 'Ceny', 'Rates')}</a></div>
  </article>`;
}

function offer(lang) {
  return `${pageHead(lang, tr(lang, 'Nabídka', 'Offer'), tr(lang, 'Pobytové balíčky, jejich publikace a cenová připravenost.', 'Stay packages, publication status and pricing readiness.'), false, `<button class="page-action-icon" type="button" data-open-sheet="new-package-sheet" aria-label="${tr(lang, 'Nový balíček', 'New package')}">${icon('edit')}</button>`)}
    ${stateAlerts(lang)}
    <div class="filter-scroll"><button class="chip" type="button" data-offer-filter="all" aria-pressed="false">${tr(lang, 'Všechny', 'All')} <span data-offer-filter-count="all">4</span></button><button class="chip" type="button" data-offer-filter="active" aria-pressed="false">${tr(lang, 'Aktivní', 'Active')} <span data-offer-filter-count="active">3</span></button><button class="chip" type="button" data-offer-filter="spa" aria-pressed="false">SPA.CZ <span data-offer-filter-count="spa">2</span></button><button class="chip" type="button" data-offer-filter="missing" aria-pressed="false">${tr(lang, 'Bez cen', 'Missing rates')} <span data-offer-filter-count="missing">1</span></button></div>
    <div class="section-head"><h2><span data-offer-count>4</span> ${tr(lang, 'balíčky', 'packages')}</h2></div>
    <div class="offer-list inventory-content">
      ${OFFERS.map(offer => offerCard(lang, offer)).join('')}
    </div>
    <div class="filter-empty" data-offer-empty hidden>${emptyState(lang, 'Žádné balíčky', 'No packages', 'Tomuto filtru neodpovídá žádný balíček.', 'No package matches this filter.')}</div>
    ${emptyState(lang, 'Žádné balíčky', 'No packages', 'V tomto stavu nejsou žádné nabídky.', 'There are no offers in this state.')}`;
}

function rateMatrix(lang, offer) {
  const rateDates = AVAILABILITY_DATES.slice(0, 7);
  const relationByRoomType = new Map(offer.roomPrices.map(row => [row.roomTypeId, row]));
  const headers = rateDates
    .map(date => `<th class="${date.className}" data-date-id="${date.id}">${date.day}. 10.</th>`)
    .join('');
  const rows = ROOM_TYPES.map(roomType => {
    const relation = relationByRoomType.get(roomType.id);
    const eligible = Boolean(relation && relation.eligible);
    const inputs = rateDates
      .map(date => {
        const value = eligible ? relation.prices[date.id] : null;
        return `<td><input class="rate-input" type="number" value="${value ?? ''}" inputmode="numeric" aria-label="${localized(roomType.name, lang)} CZK" data-room-type-id="${roomType.id}" data-rate-date-id="${date.id}" data-write-action data-chm-write></td>`;
      })
      .join('');
    return `<tr data-room-type-id="${roomType.id}"${eligible ? '' : ' hidden'}><td class="sticky-col"><strong>${localized(roomType.name, lang)}</strong><small>${roomType.capacity.adults}+${roomType.capacity.children}</small></td>${inputs}</tr>`;
  }).join('');
  return `<div class="matrix-wrap"><table class="matrix rate-matrix"><thead><tr><th class="sticky-col">${tr(lang, 'Typ pokoje / příjezd', 'Room type / arrival')}</th>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function rateEdit(lang) {
  return `<a class="back-link" href="${file('offer', lang)}" data-carry-state>${icon('arrowLeft')} ${tr(lang, 'Nabídka', 'Offer')}</a>
    <div class="identity-found">
    ${pageHead(lang, `<span data-offer-field="title">${localized(OFFERS[0].title, lang)}</span>`, `SPA HOTEL ČAJKOVSKIJ · <span data-offer-field="duration">${localized(OFFERS[0].duration, lang)}</span>`, false)}
    ${stateAlerts(lang, true)}
    <div class="alert info" data-package-inventory-note><strong>${tr(lang, 'Dostupnost a obsah balíčku jsou oddělené.', 'Inventory and package content are separate.')}</strong>&nbsp;${tr(lang, 'Obsah balíčku nemění dostupnost pokojů. Dostupnost každého typu pokoje omezuje prodej propojených balíčků.', 'Package content does not change room inventory. Inventory for each room type limits sales of linked packages.')}</div>
    <div class="tabs"><span class="active" aria-current="page">${tr(lang, 'Termíny a ceny', 'Dates & rates')}</span><button type="button" data-open-sheet="package-basics-sheet">${tr(lang, 'Základní údaje', 'Basics')}</button><button type="button" data-open-sheet="package-settings-sheet">${tr(lang, 'Nastavení', 'Settings')}</button></div>
    <section class="card">
      <div class="form-two-col"><label class="field"><span class="meta">${tr(lang, 'Cenový model', 'Pricing model')}</span><select><option>${tr(lang, 'Osoba / pobyt', 'Person / stay')}</option><option>${tr(lang, 'Pokoj / pobyt', 'Room / stay')}</option></select></label><label class="field"><span class="meta">${tr(lang, 'Měna hotelu', 'Hotel currency')}</span><input value="CZK" readonly></label></div>
    </section>
    <div class="section-head"><h2>${tr(lang, 'Ceny balíčku podle typu pokoje', 'Package prices by room type')}</h2></div>
    <div class="matrix-toolbar"><button class="page-action-icon" type="button" data-grid-shift="-1" aria-label="${tr(lang, 'Předchozí dny', 'Previous days')}">${icon('arrowLeft')}</button><strong>${tr(lang, '12.–18. října 2026', '12–18 October 2026')}</strong><button class="page-action-icon" type="button" data-grid-shift="1" aria-label="${tr(lang, 'Další dny', 'Next days')}">${icon('arrowRight')}</button></div>
    ${rateMatrix(lang, OFFERS[0])}
    <div class="sticky-action-bar"><span><small>${tr(lang, 'Cena od', 'Price from')}</small><strong data-offer-field="price">3 577 Kč</strong></span><button class="button primary" type="button" data-save-rates data-success="${tr(lang, 'Ceny balíčku byly uloženy.', 'Package prices were saved.')}" data-write-action data-chm-write>${tr(lang, 'Uložit', 'Save')}</button></div>
    </div>
    <section class="identity-missing card" hidden><h1>${tr(lang, 'Balíček nebyl nalezen', 'Package not found')}</h1><p>${tr(lang, 'Požadované ID balíčku není dostupné.', 'The requested package ID is unavailable.')}</p><a class="button primary" href="${file('offer', lang)}" data-carry-state>${tr(lang, 'Zpět na nabídku', 'Back to offer')}</a></section>
    <script id="offer-fixtures" type="application/json">${fixturePayload(OFFERS, lang)}</script>`;
}

function billingCard(lang, rank, id, term, statusKey, status, statusClass, price) {
  return `<article class="billing-card" data-inventory-rank="${rank}" data-billing-status="${statusKey}">
    <div class="card-line"><strong>${id}</strong><span class="status ${statusClass}">${status}</span></div>
    <div class="card-line secondary"><span>${term}</span><span>${tr(lang, 'Rezervace', 'Reservation')}</span></div>
    <div class="card-line financial"><span><small>${tr(lang, 'Cena', 'Price')}</small><br><strong>${price}</strong></span><span><small>${tr(lang, 'Provize vč. DPH', 'Commission incl. VAT')}</small><br><b>${tr(lang, 'Dle smlouvy', 'Per contract')}</b></span></div>
    <div class="inline-actions"><button class="button" type="button" data-open-sheet="dispute-sheet" data-write-action>${tr(lang, 'Rozporovat', 'Dispute')}</button><button class="button primary" type="button" data-approval data-success="${tr(lang, `Rozúčtování ${id} bylo schváleno.`, `Settlement ${id} was approved.`)}" data-write-action>${tr(lang, 'Schválit', 'Approve')}</button></div>
  </article>`;
}

function billing(lang) {
  return `${pageHead(lang, tr(lang, 'Rozúčtování', 'Billing'), tr(lang, 'Cena, procento provize, provize včetně DPH a dokumenty v jednom pracovním seznamu.', 'Price, commission rate, commission incl. VAT and documents in one working list.'))}
    ${stateAlerts(lang)}
    <div class="alert warning"><strong>${tr(lang, 'Finanční pracovní seznam.', 'Financial work list.')}</strong>&nbsp;${tr(lang, 'Před schválením zkontrolujte cenu a provizi.', 'Review the price and commission before approval.')}</div>
    <div class="filter-scroll"><button class="chip" type="button" data-billing-filter="pending" aria-pressed="false">${tr(lang, 'Ke schválení', 'For approval')} 3</button><button class="chip" type="button" data-billing-filter="approved" aria-pressed="false">${tr(lang, 'Schválené', 'Approved')} 1</button><button class="chip" type="button" data-billing-filter="disputed" aria-pressed="false">${tr(lang, 'Rozporované', 'Disputed')} 1</button></div>
    <div class="section-head"><h2><span data-billing-count>3</span> ${tr(lang, 'položky', 'items')}</h2></div>
    <div class="billing-list inventory-content">
      ${billingCard(lang, 1, 'RSV-10482', '12.–14. 10. 2026', 'pending', tr(lang, 'Ke schválení', 'For approval'), 'warning', '7 154 Kč')}
      ${billingCard(lang, 2, 'RSV-10477', '16.–19. 10. 2026', 'pending', tr(lang, 'Ke schválení', 'For approval'), 'warning', '6 240 Kč')}
      ${billingCard(lang, 3, 'RSV-10463', '20.–23. 10. 2026', 'pending', tr(lang, 'Ke schválení', 'For approval'), 'warning', '8 120 Kč')}
      ${billingCard(lang, 4, 'RSV-10411', '27.–29. 10. 2026', 'approved', tr(lang, 'Schváleno', 'Approved'), 'success', '4 800 Kč')}
      ${billingCard(lang, 5, 'RSV-10398', '2.–5. 11. 2026', 'disputed', tr(lang, 'Rozporováno', 'Disputed'), 'danger', '5 100 Kč')}
    </div>
    <div class="filter-empty" data-billing-empty hidden>${emptyState(lang, 'Nic k rozúčtování', 'Nothing to settle', 'Tomuto filtru neodpovídá žádná položka.', 'No item matches this filter.')}</div>
    ${emptyState(lang, 'Nic k rozúčtování', 'Nothing to settle', 'Pro tento stav nejsou žádné položky.', 'There are no items for this state.')}`;
}

function moreTile(lang, id, iconName, titleCs, titleEn, textCs, textEn, outcome, access = '') {
  const tag = outcome.route ? 'a' : 'button';
  const accessAttr = access ? ` data-access-min="${access}"` : '';
  return `<${tag} class="more-tile" data-more-id="${id}"${accessAttr} ${outcomeAttributes(outcome)}><span class="tile-icon">${icon(iconName)}</span><span><h2>${tr(lang, titleCs, titleEn)}</h2><p>${tr(lang, textCs, textEn)}</p></span></${tag}>`;
}

function more(lang) {
  return `${pageHead(lang, tr(lang, 'Více', 'More'), tr(lang, 'Sekundární moduly jsou seskupené podle pracovního úkolu a filtrované rolí.', 'Secondary modules are grouped by job and filtered by role.'))}
    ${stateAlerts(lang)}
    <section class="more-group"><div class="section-head"><h2>${tr(lang, 'Zařízení a nabídka', 'Property and offer')}</h2></div><div class="more-grid">
      ${moreTile(lang, 'rooms', 'bed', 'Pokoje', 'Rooms', 'Kapacita, lůžka a vybavení', 'Capacity, beds and equipment', { route: route('availability', lang) })}
      ${moreTile(lang, 'gallery', 'image', 'Fotogalerie', 'Photo gallery', 'Galerie a profilové snímky', 'Galleries and profile images', { sheet: 'gallery-sheet' })}
      ${moreTile(lang, 'profile', 'building', 'Profil hotelu', 'Hotel profile', 'Adresa, kontakty a klasifikace', 'Address, contacts and classification', { sheet: 'profile-sheet' })}
      ${moreTile(lang, 'price-list', 'upload', 'Nahrát ceník', 'Upload price list', 'PDF / JSON a mapování cen', 'PDF / JSON and rate mapping', { sheet: 'price-list-sheet' })}
    </div></section>
    <section class="more-group"><div class="section-head"><h2>${tr(lang, 'Finance', 'Finance')}</h2></div><div class="more-grid">
      ${moreTile(lang, 'billing', 'invoice', 'Rozúčtování', 'Billing', '3 položky ke schválení', '3 items for approval', { route: route('billing', lang, { billingFilter: 'pending' }) })}
      ${moreTile(lang, 'invoices', 'document', 'Faktury', 'Invoices', 'Detail, stav a PDF', 'Detail, status and PDF', { sheet: 'invoices-sheet' })}
      ${moreTile(lang, 'payment-documents', 'document', 'Platební doklady', 'Payment documents', 'Přijaté dokumenty a PDF', 'Received documents and PDF', { sheet: 'payment-documents-sheet' })}
      ${moreTile(lang, 'contract', 'document', 'Smlouva', 'Contract', 'Elektronická smlouva', 'Electronic contract', { sheet: 'contract-sheet' })}
    </div></section>
    <section class="more-group"><div class="section-head"><h2>${tr(lang, 'Tým a systém', 'Team and system')}</h2></div><div class="more-grid">
      ${moreTile(lang, 'users', 'users', 'Uživatelé', 'Users', 'Pozvánky, role a stav', 'Invites, roles and status', { sheet: 'users-sheet' }, 'full')}
      ${moreTile(lang, 'permissions', 'settings', 'Oprávnění', 'Permissions', 'Čtení nebo plný přístup', 'Read only or full access', { sheet: 'permissions-sheet' }, 'full')}
      ${moreTile(lang, 'channel-manager', 'link', 'Channel Manager', 'Channel manager', 'ID pokojů a plánů, CSV', 'Room and plan IDs, CSV', { route: route('availability', lang, { connection: 'chm' }) })}
      ${moreTile(lang, 'settings', 'settings', 'Nastavení', 'Settings', 'Hotel a oznámení', 'Property and notifications', { sheet: 'settings-sheet' })}
    </div></section>
    <section class="more-group" id="changes"><div class="section-head"><h2>${tr(lang, 'Schvalování a pomoc', 'Approvals and help')}</h2></div><div class="more-grid">
      ${moreTile(lang, 'changes', 'edit', 'Změny (2)', 'Changes (2)', 'Proces čtyř očí', 'Four-eyes process', { sheet: 'changes-sheet' })}
      ${moreTile(lang, 'help', 'help', 'Centrum nápovědy', 'Help centre', 'Manuál, FAQ a obchodní zástupce', 'Manual, FAQ and account manager', { sheet: 'help-sheet' })}
    </div></section>`;
}

function sheetShell(id, lang, title, body, actions = '') {
  return `<div class="modal-backdrop" id="${id}" aria-hidden="true"><section class="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="${id}-title" tabindex="-1"><div class="sheet-grabber"></div><header class="sheet-head"><h2 id="${id}-title">${title}</h2><button class="header-button" type="button" data-close-sheet aria-label="${tr(lang, 'Zavřít', 'Close')}">×</button></header><div class="sheet-body">${body}</div>${actions}</section></div>`;
}

function formSheet(id, lang, title, body, success, submitCs = 'Uložit', submitEn = 'Save') {
  const formId = `${id}-form`;
  return sheetShell(
    id,
    lang,
    title,
    `<form data-prototype-form data-success="${success}" id="${formId}">${body}</form>`,
    `<div class="sheet-actions"><button class="button" type="button" data-close-sheet>${tr(lang, 'Zrušit', 'Cancel')}</button><button class="button primary" type="submit" form="${formId}" data-write-action>${tr(lang, submitCs, submitEn)}</button></div>`
  );
}

function moreSheets(lang) {
  return [
    sheetShell(
      'gallery-sheet',
      lang,
      tr(lang, 'Fotogalerie', 'Photo gallery'),
      `<p class="subtle">${tr(lang, '12 snímků · profilový snímek je nastaven.', '12 images · profile image is selected.')}</p><button class="button full" type="button" data-terminal="gallery-export" data-terminal-message="${tr(lang, 'Fotogalerie: seznam 12 snímků byl připraven.', 'Photo gallery: the list of 12 images is ready.')}">${tr(lang, 'Zobrazit seznam snímků', 'View image list')}</button>`
    ),
    formSheet(
      'profile-sheet',
      lang,
      tr(lang, 'Profil hotelu', 'Hotel profile'),
      `<label class="field"><span>${tr(lang, 'Název', 'Name')}</span><input value="SPA HOTEL ČAJKOVSKIJ" required></label><label class="field"><span>${tr(lang, 'Adresa', 'Address')}</span><input value="Sadová 44, Karlovy Vary" required></label>`,
      tr(lang, 'Profil hotelu byl uložen.', 'Hotel profile was saved.')
    ),
    formSheet(
      'price-list-sheet',
      lang,
      tr(lang, 'Nahrát ceník', 'Upload price list'),
      `<label class="field"><span>${tr(lang, 'Formát', 'Format')}</span><select><option>PDF</option><option>JSON</option></select></label><label class="field"><span>${tr(lang, 'Název souboru', 'File name')}</span><input value="cenik-2026.pdf" required></label>`,
      tr(
        lang,
        'Ceník cenik-2026.pdf byl zařazen ke zpracování.',
        'Price list cenik-2026.pdf was queued for processing.'
      ),
      'Nahrát',
      'Upload'
    ),
    sheetShell(
      'invoices-sheet',
      lang,
      tr(lang, 'Faktury', 'Invoices'),
      `<ul class="sheet-list"><li><span><strong>2026-09</strong><small>${tr(lang, 'Uhrazena', 'Paid')}</small></span><button class="button" type="button" data-terminal="invoice-2026-09" data-terminal-message="${tr(lang, 'Faktura 2026-09: PDF dokument je připraven.', 'Invoice 2026-09: PDF document is ready.')}">PDF</button></li><li><span><strong>2026-08</strong><small>${tr(lang, 'Uhrazena', 'Paid')}</small></span><button class="button" type="button" data-terminal="invoice-2026-08" data-terminal-message="${tr(lang, 'Faktura 2026-08: PDF dokument je připraven.', 'Invoice 2026-08: PDF document is ready.')}">PDF</button></li></ul>`
    ),
    sheetShell(
      'payment-documents-sheet',
      lang,
      tr(lang, 'Platební doklady', 'Payment documents'),
      `<p class="subtle">${tr(lang, 'Poslední doklad: PD-2026-0912.', 'Latest document: PD-2026-0912.')}</p><button class="button full" type="button" data-terminal="payment-document" data-terminal-message="${tr(lang, 'Platební doklad PD-2026-0912: PDF dokument je připraven.', 'Payment document PD-2026-0912: PDF document is ready.')}">${tr(lang, 'Otevřít PDF', 'Open PDF')}</button>`
    ),
    sheetShell(
      'contract-sheet',
      lang,
      tr(lang, 'Smlouva', 'Contract'),
      `<p><strong>${tr(lang, 'Partnerská smlouva', 'Partner contract')}</strong><br><span class="subtle">${tr(lang, 'Stav: podepsána · verze 3', 'Status: signed · version 3')}</span></p><button class="button full" type="button" data-terminal="contract-pdf" data-terminal-message="${tr(lang, 'Partnerská smlouva verze 3: PDF dokument je připraven.', 'Partner contract version 3: PDF document is ready.')}">${tr(lang, 'Otevřít dokument', 'Open document')}</button>`
    ),
    formSheet(
      'users-sheet',
      lang,
      tr(lang, 'Uživatelé', 'Users'),
      `<p class="subtle">mateusz@example.invalid · ${tr(lang, 'Plný přístup', 'Full access')}</p><label class="field"><span>${tr(lang, 'Pozvat e-mailem', 'Invite by email')}</span><input type="email" value="novy@example.invalid" required></label>`,
      tr(lang, 'Pozvánka pro novy@example.invalid byla vytvořena.', 'Invite for novy@example.invalid was created.'),
      'Pozvat',
      'Invite'
    ),
    formSheet(
      'permissions-sheet',
      lang,
      tr(lang, 'Oprávnění', 'Permissions'),
      `<label class="field"><span>novy@example.invalid</span><select><option>${tr(lang, 'Pouze pro čtení', 'Read only')}</option><option>${tr(lang, 'Plný přístup', 'Full access')}</option></select></label>`,
      tr(
        lang,
        'Oprávnění uživatele novy@example.invalid byla uložena.',
        'Permissions for novy@example.invalid were saved.'
      )
    ),
    formSheet(
      'settings-sheet',
      lang,
      tr(lang, 'Nastavení', 'Settings'),
      `<label class="field"><span>${tr(lang, 'E-mail pro oznámení', 'Notification email')}</span><input type="email" value="partner@example.invalid" required></label><label class="field"><span>${tr(lang, 'Časové pásmo', 'Time zone')}</span><select><option>Europe/Prague</option></select></label>`,
      tr(lang, 'Nastavení hotelu a oznámení byla uložena.', 'Property and notification settings were saved.')
    ),
    sheetShell(
      'changes-sheet',
      lang,
      tr(lang, 'Změny čekající na schválení', 'Changes awaiting approval'),
      `<ul class="sheet-list"><li><span><strong>${tr(lang, 'Profil hotelu', 'Hotel profile')}</strong><small>${tr(lang, 'Adresa', 'Address')}</small></span><button class="button" type="button" data-terminal="change-profile" data-terminal-message="${tr(lang, 'Změna profilu hotelu byla schválena.', 'Hotel profile change was approved.')}">${tr(lang, 'Schválit', 'Approve')}</button></li><li><span><strong>${tr(lang, 'Wellness víkend', 'Wellness weekend')}</strong><small>${tr(lang, 'Popis', 'Description')}</small></span><button class="button" type="button" data-terminal="change-package" data-terminal-message="${tr(lang, 'Změna balíčku Wellness víkend byla schválena.', 'Wellness weekend package change was approved.')}">${tr(lang, 'Schválit', 'Approve')}</button></li></ul>`
    ),
    sheetShell(
      'help-sheet',
      lang,
      tr(lang, 'Centrum nápovědy', 'Help centre'),
      `<button class="button full" type="button" data-terminal="help-manual" data-terminal-message="${tr(lang, 'Manuál partnera: dokument je připraven.', 'Partner manual: document is ready.')}">${tr(lang, 'Manuál partnera', 'Partner manual')}</button><button class="button full" type="button" data-terminal="help-contact" data-terminal-message="${tr(lang, 'Kontakt na obchodního zástupce: partner@example.invalid.', 'Account manager contact: partner@example.invalid.')}">${tr(lang, 'Kontakt na obchodního zástupce', 'Account manager contact')}</button>`
    ),
  ].join('');
}

function sheets(page, lang) {
  const property = sheetShell(
    'property-sheet',
    lang,
    tr(lang, 'Vybrat zařízení', 'Select property'),
    `<p class="subtle">SPA HOTEL ČAJKOVSKIJ</p><div class="state-choices"><button class="button full" type="button" data-state-key="hotel" data-state-value="active">${tr(lang, 'Aktivní zařízení', 'Active property')}</button><button class="button full" type="button" data-state-key="hotel" data-state-value="test">${tr(lang, 'Testovací zařízení', 'Test property')}</button></div>`
  );
  const notifications = sheetShell(
    'notification-sheet',
    lang,
    tr(lang, 'Oznámení', 'Notifications'),
    `<nav class="notification-list"><a href="${route('billing', lang, { billingFilter: 'pending' })}" data-carry-state><strong>${tr(lang, '3 rozúčtování ke schválení', '3 settlements for approval')}</strong><small>${tr(lang, 'Otevřít pracovní seznam', 'Open working list')}</small></a><a href="${route('more', lang, { section: 'changes' })}" data-carry-state><strong>${tr(lang, '2 změny čekají na kontrolu', '2 changes await review')}</strong><small>${tr(lang, 'Otevřít změny', 'Open changes')}</small></a><a href="${route('availability', lang)}" data-carry-state><strong>${tr(lang, 'Nízká dostupnost v 7 nocích', 'Low availability on 7 nights')}</strong><small>${tr(lang, 'Otevřít kalendář', 'Open calendar')}</small></a></nav>`
  );
  let contextual = '';
  if (page === 'reservations') {
    contextual = sheetShell(
      'filter-sheet',
      lang,
      tr(lang, 'Filtry rezervací', 'Reservation filters'),
      `<form data-prototype-form data-success="${tr(lang, 'Filtry byly použity.', 'Filters applied.')}" id="filter-form"><label class="field"><span>${tr(lang, 'Typ data', 'Date type')}</span><select><option>${tr(lang, 'Příjezd', 'Arrival')}</option><option>${tr(lang, 'Odjezd', 'Departure')}</option><option>${tr(lang, 'Vytvořeno', 'Created')}</option></select></label><div class="form-two-col"><label class="field"><span>${tr(lang, 'Od', 'From')}</span><input type="date" value="2026-09-12"></label><label class="field"><span>${tr(lang, 'Do', 'To')}</span><input type="date" value="2026-10-12"></label></div><label class="field"><span>${tr(lang, 'ID nebo host', 'ID or guest')}</span><input value="" placeholder="RSV-10482"></label></form>`,
      `<div class="sheet-actions"><button class="button" type="button" data-close-sheet>${tr(lang, 'Zrušit', 'Cancel')}</button><button class="button primary" type="submit" form="filter-form">${tr(lang, 'Použít', 'Apply')}</button></div>`
    );
  }
  if (page === 'availability') {
    contextual = sheetShell(
      'availability-sheet',
      lang,
      tr(lang, 'Uzavřít termín', 'Close a date range'),
      `<form data-prototype-form data-success="${tr(lang, 'Stop prodej byl nastaven.', 'Stop sell set.')}" id="availability-form"><div class="form-two-col"><label class="field"><span>${tr(lang, 'Od', 'From')}</span><input type="date" value="2026-10-16"></label><label class="field"><span>${tr(lang, 'Do', 'To')}</span><input type="date" value="2026-10-17"></label></div><label class="field"><span>${tr(lang, 'Typ pokoje', 'Room type')}</span><select><option>${tr(lang, 'Všechny typy pokojů', 'All room types')}</option>${ROOM_TYPES.map(roomType => `<option value="${roomType.id}">${localized(roomType.name, lang)}</option>`).join('')}</select></label></form>`,
      `<div class="sheet-actions"><button class="button" type="button" data-close-sheet>${tr(lang, 'Zrušit', 'Cancel')}</button><button class="button primary" type="submit" form="availability-form">${tr(lang, 'Nastavit', 'Set')}</button></div>`
    );
  }
  if (page === 'reservation-detail') {
    contextual = sheetShell(
      'voucher-sheet',
      lang,
      'Voucher PDF',
      `<p class="subtle"><span data-reservation-sheet-id>RSV-10482</span> · ${tr(lang, 'dokument rezervace', 'reservation document')}</p><button class="button full" type="button" data-terminal="voucher-pdf" data-terminal-message="${tr(lang, 'Voucher PDF pro vybranou rezervaci je připraven.', 'Voucher PDF for the selected reservation is ready.')}">${tr(lang, 'Otevřít PDF', 'Open PDF')}</button>`
    );
  }
  if (page === 'offer') {
    contextual = formSheet(
      'new-package-sheet',
      lang,
      tr(lang, 'Nový balíček', 'New package'),
      `<label class="field"><span>${tr(lang, 'Název', 'Name')}</span><input value="${tr(lang, 'Nový balíček', 'New package')}" required></label><label class="field"><span>${tr(lang, 'Počet nocí', 'Number of nights')}</span><input type="number" min="1" value="2" required></label>`,
      tr(lang, 'Nový balíček byl vytvořen jako koncept.', 'A new package was created as a draft.'),
      'Vytvořit',
      'Create'
    );
  }
  if (page === 'rate-edit') {
    contextual =
      formSheet(
        'package-basics-sheet',
        lang,
        tr(lang, 'Základní údaje balíčku', 'Package basics'),
        `<label class="field"><span>${tr(lang, 'Název', 'Name')}</span><input data-offer-input="title" value="${localized(OFFERS[0].title, lang)}" required></label><label class="field"><span>${tr(lang, 'Délka pobytu', 'Stay length')}</span><input data-offer-input="duration" value="${localized(OFFERS[0].duration, lang)}" required></label>`,
        tr(lang, 'Základní údaje balíčku byly uloženy.', 'Package basics were saved.')
      ) +
      formSheet(
        'package-settings-sheet',
        lang,
        tr(lang, 'Nastavení balíčku', 'Package settings'),
        `<label class="field"><span>${tr(lang, 'Stav publikace', 'Publication status')}</span><select><option>${tr(lang, 'Aktivní', 'Active')}</option><option>${tr(lang, 'Koncept', 'Draft')}</option></select></label>`,
        tr(lang, 'Nastavení balíčku bylo uloženo.', 'Package settings were saved.')
      );
  }
  if (page === 'billing') {
    contextual = sheetShell(
      'dispute-sheet',
      lang,
      tr(lang, 'Rozporovat rozúčtování', 'Dispute settlement'),
      `<form data-prototype-form data-success="${tr(lang, 'Rozpor byl odeslán.', 'Dispute submitted.')}" id="dispute-form"><label class="field"><span>${tr(lang, 'Důvod', 'Reason')}</span><textarea required>${tr(lang, 'Nesprávná cena pobytu', 'Incorrect stay price')}</textarea></label><label class="field"><span>${tr(lang, 'Navržená cena', 'Suggested price')}</span><input type="number" min="1" value="3400" required></label></form>`,
      `<div class="sheet-actions"><button class="button" type="button" data-close-sheet>${tr(lang, 'Zrušit', 'Cancel')}</button><button class="button primary" type="submit" form="dispute-form">${tr(lang, 'Odeslat', 'Submit')}</button></div>`
    );
  }
  return property + notifications + contextual + (page === 'more' ? moreSheets(lang) : '');
}

function walls(lang) {
  return `<section class="signed-out-wall"><div class="wall-card">${icon('users')}<h1>${tr(lang, 'Účet je odhlášený', 'Account signed out')}</h1><p>${tr(lang, 'Přihlaste se pro otevření partnerského účtu.', 'Sign in to open the partner account.')}</p><button class="button primary" type="button" data-state-key="auth" data-state-value="in">${tr(lang, 'Otevřít účet', 'Open account')}</button></div></section>
  <section class="access-wall"><div class="wall-card">${icon('settings')}<h1>${tr(lang, 'Bez přístupu v tomto stavu', 'No access in this state')}</h1><p>${tr(lang, 'V plovoucím panelu zvolte přístup „Pouze pro čtení“ nebo „Plný“.', 'Use the floating settings panel to select Read only or Full access.')}</p></div></section>`;
}

function contentFor(page, lang) {
  const renderers = {
    dashboard,
    reservations,
    'reservation-detail': reservationDetail,
    availability,
    offer,
    'rate-edit': rateEdit,
    billing,
    more,
  };
  return renderers[page](lang);
}

function titleFor(page, lang) {
  const titles = {
    dashboard: ['Přehled', 'Overview'],
    reservations: ['Rezervace', 'Reservations'],
    'reservation-detail': ['Detail rezervace', 'Reservation detail'],
    availability: ['Dostupnost', 'Availability'],
    offer: ['Nabídka', 'Offer'],
    'rate-edit': ['Ceny balíčku', 'Package rates'],
    billing: ['Rozúčtování', 'Billing'],
    more: ['Více', 'More'],
  };
  return tr(lang, titles[page][0], titles[page][1]);
}

function renderPage(page, lang) {
  const languageSibling = lang === 'cs' ? file(page, 'en') : file(page, 'cs');
  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="color-scheme" content="light">
  <title>${titleFor(page, lang)} · SPA.CZ partner app prototype</title>
  <link rel="stylesheet" href="tokens-m.css?v=${ASSET_VERSION}">
  <link rel="stylesheet" href="app-m.css?v=${ASSET_VERSION}">
  <link rel="stylesheet" href="proto-tools.css?v=${ASSET_VERSION}">
  <link rel="stylesheet" href="proto-comments.css?v=${ASSET_VERSION}">
  <link rel="stylesheet" href="proto-m.css?v=${ASSET_VERSION}">
</head>
<body data-page="${page}" data-viewport="mobile" data-auth="in" data-access="full" data-connection="manual" data-density="dense" data-inv="many" data-hotel="active">
  <a class="skip-link" href="#main">${tr(lang, 'Přejít na obsah', 'Skip to content')}</a>
  ${languageSwitch(page, lang)}
  <div class="product-surface">
    <div class="mobile-app">
      ${header(lang)}
      <main class="mobile-main" id="main">
        ${contentFor(page, lang)}
      </main>
      ${bottomNav(page, lang)}
    </div>
  </div>
  ${walls(lang)}
  ${sheets(page, lang)}
  <div class="toast" role="status" aria-live="polite"></div>
  <div class="state-debug" data-state-output></div>
  <a class="screen-reader-only" href="${languageSibling}" data-carry-state>${lang === 'cs' ? 'English' : 'Čeština'}</a>
  <script src="proto-tools.js?v=${ASSET_VERSION}" defer></script>
  <script src="proto-comments.js?v=${ASSET_VERSION}" defer></script>
  <script src="proto-m.js?v=${ASSET_VERSION}" defer></script>
</body>
</html>
`;
}

function generateScreens() {
  const written = [];
  for (const page of SCREENS) {
    for (const lang of ['cs', 'en']) {
      const output = file(page, lang);
      fs.writeFileSync(path.join(ROOT, output), renderPage(page, lang), 'utf8');
      written.push(output);
    }
  }
  process.stdout.write(`Generated ${written.length} mobile screens:\n${written.join('\n')}\n`);
}

module.exports = { AVAILABILITY_DATES, OFFERS, RESERVATIONS, ROOM_TYPES, outcomeAttributes, renderPage };

if (require.main === module) generateScreens();
