#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ASSET_VERSION = '20260807c';
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

function tr(lang, cs, en) {
  return lang === 'cs' ? cs : en;
}

function file(screen, lang) {
  return `m-${screen}${lang === 'en' ? '-en' : ''}.html`;
}

function icon(name, className = '') {
  const paths = {
    dashboard: '<path d="M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z"/>',
    reservations: '<path d="M6 3h12a2 2 0 0 1 2 2v15l-3-2-3 2-3-2-3 2-3-2-3 2V5a2 2 0 0 1 2-2h2Zm2 5h8V6H8v2Zm0 4h8v-2H8v2Zm0 4h5v-2H8v2Z"/>',
    availability: '<path d="M5 3h2v2h10V3h2v2h1a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h1V3Zm15 7H4v10h16V10ZM7 12h3v3H7v-3Zm5 0h3v3h-3v-3Zm5 0h2v3h-2v-3ZM7 17h3v2H7v-2Zm5 0h3v2h-3v-2Z"/>',
    offer: '<path d="m3 12 9-9h7a2 2 0 0 1 2 2v7l-9 9L3 12Zm13-4.5A1.5 1.5 0 1 0 16 4a1.5 1.5 0 0 0 0 3.5Z"/>',
    more: '<path d="M5 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm7 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm7 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z"/>',
    building: '<path d="M4 21V3h11v6h5v12h-7v-4h-2v4H4Zm3-14h2V5H7v2Zm4 0h2V5h-2v2ZM7 11h2V9H7v2Zm4 0h2V9h-2v2Zm-4 4h2v-2H7v2Zm8-2v2h2v-2h-2Zm0 4v2h2v-2h-2Z"/>',
    chevron: '<path d="m9 18 6-6-6-6-1.4 1.4 4.6 4.6-4.6 4.6L9 18Z"/>',
    arrowLeft: '<path d="m15 18-6-6 6-6 1.4 1.4-4.6 4.6 4.6 4.6L15 18Z"/>',
    arrowRight: '<path d="m9 18 6-6-6-6 1.4-1.4 7.4 7.4-7.4 7.4L9 18Z"/>',
    bell: '<path d="M18 16v-5a6 6 0 0 0-5-5.9V4a1 1 0 0 0-2 0v1.1A6 6 0 0 0 6 11v5l-2 2h16l-2-2Zm-8 3h4a2 2 0 0 1-4 0Z"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z"/>',
    calendar: '<path d="M5 3h2v2h10V3h2v2h1a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h1V3Zm15 7H4v10h16V10Z"/>',
    users: '<path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm6-1a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM9 13c-4 0-7 2-7 5v2h14v-2c0-3-3-5-7-5Zm7 0c-.6 0-1.2.1-1.8.2 2.3 1 3.8 2.7 3.8 4.8v2h4v-2c0-3-2.6-5-6-5Z"/>',
    bed: '<path d="M3 4h2v8h4V7h6a4 4 0 0 1 4 4v1h2v8h-2v-2H5v2H3V4Zm8 8h6v-1a2 2 0 0 0-2-2h-4v3Z"/>',
    image: '<path d="M4 3h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm0 16h16l-5-6-4 4-3-3-4 5Zm11-9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>',
    invoice: '<path d="M5 2h14v20l-3-2-2 2-2-2-2 2-2-2-3 2V2Zm4 5h6V5H9v2Zm-1 4h8V9H8v2Zm0 4h8v-2H8v2Z"/>',
    settings: '<path d="m19.4 13 .1-1-.1-1 2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L15 3.5h-4l-.4 2.6a8 8 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5-.1 1 .1 1-2 1.5 2 3.4 2.4-1a8 8 0 0 0 1.7 1l.4 2.6h4l.4-2.6a8 8 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5ZM13 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z"/>',
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
  const active = page === 'reservation-detail' ? 'reservations' : page === 'rate-edit' ? 'offer' : page === 'billing' ? 'more' : page;
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
    <button class="header-button" type="button" data-toast="${tr(lang, 'V prototypu: centrum oznámení.', 'In prototype: notification centre.')}" aria-label="${tr(lang, 'Oznámení', 'Notifications')}">${icon('bell')}</button>
  </header>`;
}

function stateAlerts(lang, includeChm = false) {
  return `<div class="alert warning readonly-alert"><strong>${tr(lang, 'Pouze pro čtení.', 'Read-only access.')}</strong>&nbsp;${tr(lang, 'Úpravy jsou pro tuto roli vypnuté.', 'Editing is disabled for this role.')}</div>
  ${includeChm ? `<div class="alert warning chm-alert"><strong>Channel Manager.</strong>&nbsp;${tr(lang, 'Dostupnost a ceny se upravují v připojeném systému.', 'Availability and rates are managed in the connected system.')}</div>` : ''}
  <div class="alert info test-alert"><strong>${tr(lang, 'Testovací zařízení.', 'Test property.')}</strong>&nbsp;${tr(lang, 'Změny nejsou publikovány na SPA.CZ.', 'Changes are not published on SPA.CZ.')}</div>`;
}

function pageHead(lang, title, subtitle, label = true, action = '') {
  return `<div class="page-head">
    <div><h1>${title}</h1><p>${subtitle}</p>${label ? `<span class="demo-label">${tr(lang, 'Ukázková data', 'Demo data')}</span>` : ''}</div>
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
      <article class="card metric-card"><span class="metric-icon">${icon('availability')}</span><div class="metric-copy"><small>${tr(lang, 'Dnešní příjezdy · demo', 'Today’s arrivals · demo')}</small><strong class="metric-value">4</strong></div></article>
      <article class="card metric-card"><span class="metric-icon">${icon('clock')}</span><div class="metric-copy"><small>${tr(lang, 'Dnešní odjezdy · demo', 'Today’s departures · demo')}</small><strong class="metric-value">3</strong></div></article>
      <article class="card metric-card"><span class="metric-icon">${icon('bed')}</span><div class="metric-copy"><small>${tr(lang, 'Volné pokoje · demo', 'Rooms available · demo')}</small><strong class="metric-value">22</strong></div></article>
      <article class="card metric-card"><span class="metric-icon">${icon('invoice')}</span><div class="metric-copy"><small>${tr(lang, 'Ke schválení · demo', 'Awaiting approval · demo')}</small><strong class="metric-value">3</strong></div></article>
    </div>
    ${emptyState(lang, 'Žádná ukázková aktivita', 'No demo activity', 'Přepínač inventáře je nastaven na „žádný“.', 'Demo inventory is set to none.')}

    <div class="section-head"><h2>${tr(lang, 'Vyžaduje pozornost', 'Needs attention')}</h2><span class="demo-label">${tr(lang, 'Ukázka', 'Demo')}</span></div>
    <section class="card flush inventory-content">
      <ul class="task-list">
        <li class="task-item" data-inventory-rank="1"><span class="task-count">3</span><span><strong>${tr(lang, 'Rezervace k rozúčtování', 'Reservations to settle')}</strong><small>${tr(lang, 'Zkontrolujte cenu a provizi', 'Review price and commission')}</small></span><a href="${file('billing', lang)}" data-carry-state aria-label="${tr(lang, 'Otevřít rozúčtování', 'Open billing')}">${icon('chevron')}</a></li>
        <li class="task-item" data-inventory-rank="2"><span class="task-count">2</span><span><strong>${tr(lang, 'Změny čekají na schválení', 'Changes await approval')}</strong><small>${tr(lang, 'Proces čtyř očí · demo', 'Four-eyes process · demo')}</small></span><a href="${file('more', lang)}#changes" data-carry-state aria-label="${tr(lang, 'Otevřít změny', 'Open changes')}">${icon('chevron')}</a></li>
        <li class="task-item" data-inventory-rank="3"><span class="task-count">7</span><span><strong>${tr(lang, 'Nízká dostupnost', 'Low availability')}</strong><small>${tr(lang, 'Sedm nocí v ukázkovém kalendáři', 'Seven nights in the demo calendar')}</small></span><a href="${file('availability', lang)}" data-carry-state aria-label="${tr(lang, 'Otevřít dostupnost', 'Open availability')}">${icon('chevron')}</a></li>
      </ul>
    </section>

    <div class="section-head"><h2>${tr(lang, 'Aktuální rezervace', 'Recent reservations')}</h2><a href="${file('reservations', lang)}" data-carry-state>${tr(lang, 'Zobrazit vše', 'View all')}</a></div>
    <div class="reservation-list inventory-content">
      ${reservationCard(lang, 1, 'DEMO-10482', 'Jana Nováková', '12.–14. 10. 2026', tr(lang, 'Potvrzeno', 'Confirmed'), 'success', '7 154 Kč')}
      ${reservationCard(lang, 2, 'DEMO-10477', 'Petr Dvořák', '16.–19. 10. 2026', tr(lang, 'Nová', 'New'), 'info', '6 240 Kč')}
    </div>

    <div class="section-head"><h2>${tr(lang, 'Veřejná nabídka', 'Public offer fact')}</h2></div>
    <article class="offer-card">
      <div class="offer-visual"><div><small>SPA HOTEL ČAJKOVSKIJ</small><strong>${tr(lang, '3 dny / 2 noci', '3 days / 2 nights')}</strong></div></div>
      <div class="offer-copy"><h2>${tr(lang, 'Pobyt na SPA.CZ', 'Stay on SPA.CZ')}</h2><p>${tr(lang, 'Veřejně ověřené parametry použité jako cenový základ prototypu.', 'Publicly verified facts used as the prototype pricing baseline.')}</p></div>
      <div class="offer-price"><div><small>${tr(lang, 'od', 'from')}</small><strong data-price="base">3 577 Kč</strong></div><a class="button primary" href="${file('offer', lang)}" data-carry-state>${tr(lang, 'Nabídka', 'Offer')}</a></div>
    </article>`;
}

function reservationCard(lang, rank, id, guest, term, status, statusClass, price) {
  return `<a class="reservation-card" data-inventory-rank="${rank}" href="${file('reservation-detail', lang)}?reservation=${encodeURIComponent(id)}" data-carry-state>
    <div class="card-line"><strong class="truncate">${guest}</strong><span class="status ${statusClass}">${status}</span></div>
    <div class="card-line secondary"><span>${id} · ${tr(lang, 'ukázka', 'demo')}</span><span>${tr(lang, 'Vytvořeno', 'Created')} 8. 10.</span></div>
    <div class="card-line financial"><span>${term}</span><strong>${price}</strong></div>
  </a>`;
}

function reservations(lang) {
  const cards = [
    reservationCard(lang, 1, 'DEMO-10482', 'Jana Nováková', '12.–14. 10. 2026', tr(lang, 'Potvrzeno', 'Confirmed'), 'success', '7 154 Kč'),
    reservationCard(lang, 2, 'DEMO-10477', 'Petr Dvořák', '16.–19. 10. 2026', tr(lang, 'Nová', 'New'), 'info', '6 240 Kč'),
    reservationCard(lang, 3, 'DEMO-10463', 'Klára Veselá', '20.–23. 10. 2026', tr(lang, 'Potvrzeno', 'Confirmed'), 'success', '8 120 Kč'),
    reservationCard(lang, 4, 'DEMO-10451', 'Martin Černý', '27.–29. 10. 2026', tr(lang, 'Čeká na hotel', 'Awaiting hotel'), 'warning', '4 390 Kč'),
    reservationCard(lang, 5, 'DEMO-10439', 'Eva Horáková', '2.–5. 11. 2026', tr(lang, 'Stornováno', 'Cancelled'), 'danger', '7 030 Kč'),
  ].join('\n');
  return `${pageHead(lang, tr(lang, 'Rezervace', 'Reservations'), tr(lang, 'Hustý seznam pro rychlou kontrolu hosta, termínu, stavu a ceny.', 'A dense list for checking guest, stay, status and price at a glance.'), true, `<button class="page-action-icon" type="button" data-open-sheet="filter-sheet" aria-label="${tr(lang, 'Filtrovat', 'Filter')}">${icon('filter')}</button>`)}
    ${stateAlerts(lang)}
    <div class="filter-bar">
      <button class="date-control" type="button" data-open-sheet="filter-sheet">${icon('calendar')}<span>${tr(lang, 'Příjezd', 'Arrival')}: 12. 9.–12. 10. 2026</span></button>
      <button class="page-action-icon" type="button" data-toast="${tr(lang, 'Ukázkový export CSV je připraven.', 'Demo CSV export is ready.')}" aria-label="${tr(lang, 'Export CSV', 'Export CSV')}">${icon('upload')}</button>
    </div>
    <div class="filter-scroll" aria-label="${tr(lang, 'Aktivní filtry', 'Active filters')}">
      <button class="chip active" type="button" data-filter-chip aria-pressed="true">${tr(lang, 'Příjezd', 'Arrival')}</button>
      <button class="chip" type="button" data-filter-chip aria-pressed="false">${tr(lang, 'Potvrzené', 'Confirmed')}</button>
      <button class="chip" type="button" data-filter-chip aria-pressed="false">${tr(lang, 'Čekající', 'Pending')}</button>
      <button class="chip" type="button" data-filter-chip aria-pressed="false">${tr(lang, 'Stornované', 'Cancelled')}</button>
    </div>
    <div class="section-head"><h2 data-result-count data-count-many="${tr(lang, '5 ukázkových rezervací', '5 demo reservations')}" data-count-some="${tr(lang, '3 ukázkové rezervace', '3 demo reservations')}" data-count-none="${tr(lang, '0 ukázkových rezervací', '0 demo reservations')}">${tr(lang, '5 ukázkových rezervací', '5 demo reservations')}</h2><span class="meta">20 / ${tr(lang, 'strana', 'page')}</span></div>
    <div class="reservation-list inventory-content">${cards}</div>
    ${emptyState(lang, 'Žádné rezervace', 'No reservations', 'Pro tento ukázkový stav nejsou žádné výsledky.', 'There are no results for this demo state.')}`;
}

function reservationDetail(lang) {
  return `<a class="back-link" href="${file('reservations', lang)}" data-carry-state>${icon('arrowLeft')} ${tr(lang, 'Rezervace', 'Reservations')}</a>
    ${pageHead(lang, tr(lang, 'Rezervace DEMO-10482', 'Reservation DEMO-10482'), tr(lang, 'Soukromé údaje níže jsou výhradně ukázkové.', 'All private data below is explicitly demo data.'))}
    ${stateAlerts(lang)}
    <div class="summary-band">
      <div class="summary-cell"><small>${tr(lang, 'Stav', 'Status')}</small><strong><span class="status success">${tr(lang, 'Potvrzeno', 'Confirmed')}</span></strong></div>
      <div class="summary-cell"><small>${tr(lang, 'Vytvořeno · demo', 'Created · demo')}</small><strong>8. 10. 2026</strong></div>
      <div class="summary-cell wide"><small>${tr(lang, 'Pobyt · demo', 'Stay · demo')}</small><strong>12.–14. 10. 2026 · ${tr(lang, '3 dny / 2 noci', '3 days / 2 nights')}</strong></div>
      <div class="summary-cell"><small>Check-in</small><strong>14:00</strong></div>
      <div class="summary-cell"><small>Check-out</small><strong>10:00</strong></div>
    </div>

    <section class="card">
      <div class="section-head"><h2>${tr(lang, 'Pobyt', 'Stay')}</h2><span class="status info">${tr(lang, 'Veřejný základ', 'Public baseline')}</span></div>
      <div class="definition-grid">
        <dl><dt>${tr(lang, 'Zařízení', 'Property')}</dt><dd>SPA HOTEL ČAJKOVSKIJ</dd></dl>
        <dl><dt>${tr(lang, 'Balíček', 'Package')}</dt><dd>${tr(lang, '3 dny / 2 noci', '3 days / 2 nights')}</dd></dl>
        <dl><dt>${tr(lang, 'Pokoj · demo', 'Room · demo')}</dt><dd>${tr(lang, 'Dvoulůžkový pokoj', 'Double room')}</dd></dl>
        <dl><dt>${tr(lang, 'Hosté · demo', 'Guests · demo')}</dt><dd>2 ${tr(lang, 'dospělí', 'adults')}</dd></dl>
      </div>
    </section>

    <section class="card">
      <div class="section-head"><h2>${tr(lang, 'Host a kontakt', 'Guest and contact')}</h2><span class="demo-label">${tr(lang, 'Ukázka', 'Demo')}</span></div>
      <div class="definition-grid">
        <dl><dt>${tr(lang, 'Kontaktní osoba', 'Contact person')}</dt><dd>Jana Nováková</dd></dl>
        <dl><dt>${tr(lang, 'Telefon', 'Phone')}</dt><dd>+420 000 000 000</dd></dl>
        <dl><dt>E-mail</dt><dd>demo@example.invalid</dd></dl>
        <dl><dt>${tr(lang, 'Další host', 'Additional guest')}</dt><dd>Pavel Novák</dd></dl>
      </div>
    </section>

    <section class="card">
      <div class="section-head"><h2>${tr(lang, 'Cena a provize', 'Price and commission')}</h2><span class="demo-label">${tr(lang, 'Výpočet demo', 'Demo calculation')}</span></div>
      <div class="finance-summary">
        <dl><dt>${tr(lang, 'Veřejná cena od / osoba', 'Public price from / person')}</dt><dd data-price="base">3 577 Kč</dd></dl>
        <dl class="total"><dt>${tr(lang, '2 dospělí × veřejný základ · odvozeno', '2 adults × public baseline · derived')}</dt><dd data-price="partyTotal">7 154 Kč</dd></dl>
        <dl><dt>${tr(lang, 'Provize vč. DPH', 'Commission incl. VAT')}</dt><dd>${tr(lang, 'Dle partnerské smlouvy', 'Per partner contract')}</dd></dl>
      </div>
    </section>

    <section class="card">
      <div class="section-head"><h2>${tr(lang, 'Storno a dokumenty', 'Cancellation and documents')}</h2></div>
      <ul class="detail-list">
        <li class="detail-row"><span><strong>${tr(lang, 'Storno podmínky', 'Cancellation policy')}</strong><br><small class="subtle">${tr(lang, 'Ukázková podmínka rezervace; bez produkční hodnoty.', 'Demo reservation condition; no production value.')}</small></span><span class="status warning">${tr(lang, 'Ukázka', 'Demo')}</span></li>
        <li class="detail-row"><span><strong>Voucher PDF</strong><br><small class="subtle">${tr(lang, 'Dostupný pro podporovaný stav rezervace', 'Available for a supported reservation status')}</small></span><button class="page-action-icon" type="button" data-toast="${tr(lang, 'V prototypu: otevření voucheru PDF.', 'In prototype: open voucher PDF.')}" aria-label="Voucher PDF">${icon('document')}</button></li>
      </ul>
    </section>
    <div class="sticky-action-bar"><span><small>${tr(lang, 'Další krok', 'Next step')}</small><strong>${tr(lang, 'Rozúčtování rezervace', 'Reservation settlement')}</strong></span><a class="button primary" href="${file('billing', lang)}" data-carry-state>${tr(lang, 'Otevřít', 'Open')}</a></div>`;
}

function availabilityMatrix(lang) {
  const days = [
    ['12', tr(lang, 'Po', 'Mon'), 'today'], ['13', tr(lang, 'Út', 'Tue'), ''], ['14', tr(lang, 'St', 'Wed'), ''],
    ['15', tr(lang, 'Čt', 'Thu'), ''], ['16', tr(lang, 'Pá', 'Fri'), ''], ['17', tr(lang, 'So', 'Sat'), 'weekend'],
    ['18', tr(lang, 'Ne', 'Sun'), 'weekend'], ['19', tr(lang, 'Po', 'Mon'), ''], ['20', tr(lang, 'Út', 'Tue'), ''],
    ['21', tr(lang, 'St', 'Wed'), ''], ['22', tr(lang, 'Čt', 'Thu'), ''], ['23', tr(lang, 'Pá', 'Fri'), ''],
  ];
  const rows = [
    [1, tr(lang, 'Dvoulůžkový', 'Double'), '2+0', [4, 4, 3, 2, 2, 4, 5, 5, 4, 3, 2, 2]],
    [2, tr(lang, 'Dvoulůžkový deluxe', 'Deluxe double'), '2+1', [2, 2, 1, 'X', 'X', 2, 3, 3, 2, 2, 1, 1]],
    [3, tr(lang, 'Apartmá', 'Suite'), '2+2', [1, 1, 1, 0, 0, 1, 1, 2, 2, 1, 0, 0]],
    [4, tr(lang, 'Jednolůžkový', 'Single'), '1+0', [3, 3, 2, 2, 1, 3, 3, 3, 2, 2, 1, 1]],
    [5, tr(lang, 'Rodinný pokoj', 'Family room'), '4+0', [2, 2, 2, 1, 1, 2, 2, 2, 1, 1, 'X', 'X']],
  ];
  const headers = days.map(([day, weekday, cls]) => `<th class="${cls}">${weekday}<br><strong>${day}</strong></th>`).join('');
  const body = rows.map(([rank, name, beds, values]) => `<tr data-inventory-rank="${rank}"><td class="sticky-col"><strong>${name}</strong><small>${beds} · ${tr(lang, 'demo', 'demo')}</small></td>${values.map((value, index) => {
    const stopped = value === 'X';
    const low = value === 0 || value === 1;
    return `<td class="availability-cell ${days[index][2]} ${stopped ? 'stop' : ''} ${low ? 'low' : ''}" data-value="${stopped ? 0 : value}">${stopped ? '×' : value}</td>`;
  }).join('')}</tr>`).join('');
  return `<div class="matrix-wrap inventory-content" aria-label="${tr(lang, 'Ukázková dostupnost pokojů', 'Demo room availability')}"><table class="matrix"><thead><tr><th class="sticky-col">${tr(lang, 'Pokoj / říjen 2026', 'Room / October 2026')}</th>${headers}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function availability(lang) {
  return `${pageHead(lang, tr(lang, 'Dostupnost', 'Availability'), tr(lang, 'Kapacita pokojů po dnech; první sloupec a datum zůstávají při posunu viditelné.', 'Daily room capacity with sticky room labels and dates.'))}
    ${stateAlerts(lang, true)}
    <div class="alert info"><strong>${tr(lang, 'Ukázková kapacita.', 'Demo capacity.')}</strong>&nbsp;${tr(lang, 'Číslo znamená volné jednotky, × znamená stop prodej.', 'A number is available units; × means stop sell.')}</div>
    <div class="matrix-toolbar"><button class="page-action-icon" type="button" data-grid-shift="-1" aria-label="${tr(lang, 'Předchozí dny', 'Previous days')}">${icon('arrowLeft')}</button><strong>${tr(lang, '12.–23. října 2026', '12–23 October 2026')}</strong><button class="page-action-icon" type="button" data-grid-shift="1" aria-label="${tr(lang, 'Další dny', 'Next days')}">${icon('arrowRight')}</button></div>
    ${availabilityMatrix(lang)}
    ${emptyState(lang, 'Žádné pokoje', 'No rooms', 'V tomto ukázkovém stavu není co zobrazit.', 'There is nothing to show in this demo state.')}
    <div class="section-head"><h2>${tr(lang, 'Hromadná změna', 'Bulk action')}</h2></div>
    <section class="card"><p class="subtle">${tr(lang, 'Nastavte stop prodej pro vybraný termín bez úpravy každé buňky.', 'Set stop sell for a date range without editing each cell.')}</p><button class="button full" type="button" data-open-sheet="availability-sheet" data-write-action data-chm-write>${tr(lang, 'Uzavřít termín', 'Close a date range')}</button></section>`;
}

function offerCard(lang, rank, isPublic, title, nights, meal, price) {
  return `<article class="offer-card ${isPublic ? 'featured' : 'compact'}" data-inventory-rank="${rank}">
    <div class="offer-visual"><div><small>${isPublic ? 'SPA HOTEL ČAJKOVSKIJ' : tr(lang, 'UKÁZKOVÁ NABÍDKA', 'DEMO OFFER')}</small><strong>${nights}</strong></div></div>
    <div class="offer-copy"><div class="card-line"><h2>${title}</h2><span class="${isPublic ? 'status info' : 'demo-label'}">${isPublic ? tr(lang, 'Veřejný fakt', 'Public fact') : tr(lang, 'Ukázka', 'Demo')}</span></div><p>${meal}</p><div class="offer-meta"><span class="status success">${tr(lang, 'Aktivní', 'Active')}</span><span class="status info">SPA.CZ</span></div></div>
    <div class="offer-price"><div><small>${tr(lang, 'od', 'from')}</small><strong${isPublic ? ' data-price="base"' : ''}>${price}</strong></div><a class="button primary" href="${file('rate-edit', lang)}" data-carry-state>${tr(lang, 'Ceny', 'Rates')}</a></div>
  </article>`;
}

function offer(lang) {
  return `${pageHead(lang, tr(lang, 'Nabídka', 'Offer'), tr(lang, 'Pobytové balíčky, jejich publikace a cenová připravenost.', 'Stay packages, publication status and pricing readiness.'), false, `<button class="page-action-icon" type="button" data-toast="${tr(lang, 'V prototypu: nový balíček.', 'In prototype: create package.')}" aria-label="${tr(lang, 'Nový balíček', 'New package')}">${icon('edit')}</button>`)}
    ${stateAlerts(lang)}
    <div class="alert info"><strong>${tr(lang, 'Ověřený cenový základ.', 'Verified pricing baseline.')}</strong>&nbsp;SPA HOTEL ČAJKOVSKIJ · ${tr(lang, '3 dny / 2 noci', '3 days / 2 nights')} · ${tr(lang, 'od 3 577 Kč', 'from CZK 3,577')}.</div>
    <div class="filter-scroll"><button class="chip active" type="button" data-filter-chip>${tr(lang, 'Všechny', 'All')}</button><button class="chip" type="button" data-filter-chip>${tr(lang, 'Aktivní', 'Active')}</button><button class="chip" type="button" data-filter-chip>SPA.CZ</button><button class="chip" type="button" data-filter-chip>${tr(lang, 'Bez cen', 'Missing rates')}</button></div>
    <div class="offer-list inventory-content">
      ${offerCard(lang, 1, true, tr(lang, 'Pobyt SPA HOTEL ČAJKOVSKIJ', 'SPA HOTEL ČAJKOVSKIJ stay'), tr(lang, '3 dny / 2 noci', '3 days / 2 nights'), tr(lang, 'Veřejně ověřené parametry nabídky', 'Publicly verified offer facts'), '3 577 Kč')}
      ${offerCard(lang, 2, false, tr(lang, 'Wellness víkend · demo', 'Wellness weekend · demo'), tr(lang, '3 dny / 2 noci', '3 days / 2 nights'), tr(lang, 'Snídaně · ukázková hodnota', 'Breakfast · demo value'), '4 890 Kč')}
      ${offerCard(lang, 3, false, tr(lang, 'Lázeňský týden · demo', 'Spa week · demo'), tr(lang, '8 dní / 7 nocí', '8 days / 7 nights'), tr(lang, 'Polopenze · ukázková hodnota', 'Half board · demo value'), '14 200 Kč')}
      ${offerCard(lang, 4, false, tr(lang, 'Odpočinek pro dva · demo', 'Break for two · demo'), tr(lang, '4 dny / 3 noci', '4 days / 3 nights'), tr(lang, 'Snídaně · ukázková hodnota', 'Breakfast · demo value'), '7 460 Kč')}
    </div>
    ${emptyState(lang, 'Žádné balíčky', 'No packages', 'V tomto ukázkovém stavu nejsou žádné nabídky.', 'There are no offers in this demo state.')}`;
}

function rateMatrix(lang) {
  const dates = ['12. 10.', '13. 10.', '14. 10.', '15. 10.', '16. 10.', '17. 10.', '18. 10.'];
  const rows = [
    [tr(lang, 'Dvoulůžkový', 'Double'), '2 os.', [3577, 3577, 3827, 4117, 4117, 3577, 3577]],
    [tr(lang, 'Dvoulůžkový deluxe', 'Deluxe double'), '2 os.', [3977, 3977, 4227, 4517, 4517, 3977, 3977]],
    [tr(lang, 'Apartmá', 'Suite'), '2 os.', [4577, 4577, 4827, 5117, 5117, 4577, 4577]],
  ];
  return `<div class="matrix-wrap"><table class="matrix rate-matrix"><thead><tr><th class="sticky-col">${tr(lang, 'Pokoj / příjezd', 'Room / arrival')}</th>${dates.map((date, i) => `<th class="${i === 0 ? 'today' : i === 5 || i === 6 ? 'weekend' : ''}">${date}</th>`).join('')}</tr></thead><tbody>${rows.map(([name, occupancy, values]) => `<tr><td class="sticky-col"><strong>${name}</strong><small>${occupancy} · demo</small></td>${values.map((value) => `<td><input class="rate-input" type="number" value="${value}" inputmode="numeric" aria-label="${name} ${value} CZK" data-write-action data-chm-write></td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function rateEdit(lang) {
  return `<a class="back-link" href="${file('offer', lang)}" data-carry-state>${icon('arrowLeft')} ${tr(lang, 'Nabídka', 'Offer')}</a>
    ${pageHead(lang, tr(lang, 'Ceny balíčku', 'Package rates'), tr(lang, 'SPA HOTEL ČAJKOVSKIJ · 3 dny / 2 noci', 'SPA HOTEL ČAJKOVSKIJ · 3 days / 2 nights'), false)}
    ${stateAlerts(lang, true)}
    <div class="alert info"><strong>${tr(lang, 'Ukázkový cenový scénář.', 'Demo pricing scenario.')}</strong>&nbsp;${tr(lang, 'Pouze základ 3 577 Kč je veřejně ověřený; ostatní hodnoty jsou odvozené demo.', 'Only the CZK 3,577 baseline is public; all other values are derived demo data.')}</div>
    <div class="tabs"><button class="active" type="button">${tr(lang, 'Termíny a ceny', 'Dates & rates')}</button><button type="button" data-toast="${tr(lang, 'V prototypu: základní údaje.', 'In prototype: basic details.')}">${tr(lang, 'Základní údaje', 'Basics')}</button><button type="button" data-toast="${tr(lang, 'V prototypu: nastavení.', 'In prototype: settings.')}">${tr(lang, 'Nastavení', 'Settings')}</button></div>
    <section class="card">
      <div class="form-two-col"><label class="field"><span class="meta">${tr(lang, 'Cenový model', 'Pricing model')}</span><select><option>${tr(lang, 'Osoba / pobyt', 'Person / stay')}</option><option>${tr(lang, 'Pokoj / pobyt', 'Room / stay')}</option></select></label><label class="field"><span class="meta">${tr(lang, 'Měna hotelu', 'Hotel currency')}</span><input value="CZK" readonly></label></div>
    </section>
    <div class="section-head"><h2>${tr(lang, 'Cena podle příjezdu', 'Rate by arrival')}</h2><span class="demo-label">${tr(lang, 'Ukázka', 'Demo')}</span></div>
    <div class="matrix-toolbar"><button class="page-action-icon" type="button" data-grid-shift="-1" aria-label="${tr(lang, 'Předchozí dny', 'Previous days')}">${icon('arrowLeft')}</button><strong>${tr(lang, '12.–18. října 2026', '12–18 October 2026')}</strong><button class="page-action-icon" type="button" data-grid-shift="1" aria-label="${tr(lang, 'Další dny', 'Next days')}">${icon('arrowRight')}</button></div>
    ${rateMatrix(lang)}
    <div class="sticky-action-bar"><span><small>${tr(lang, 'Veřejný základ', 'Public baseline')}</small><strong data-price="base">3 577 Kč</strong></span><button class="button primary" type="button" data-toast="${tr(lang, 'Ukázkové ceny byly odeslány ke schválení.', 'Demo rates were sent for approval.')}" data-write-action data-chm-write>${tr(lang, 'Uložit', 'Save')}</button></div>`;
}

function billingCard(lang, rank, id, term, status, statusClass, price) {
  return `<article class="billing-card" data-inventory-rank="${rank}">
    <div class="card-line"><strong>${id}</strong><span class="status ${statusClass}">${status}</span></div>
    <div class="card-line secondary"><span>${term}</span><span>${tr(lang, 'Ukázková rezervace', 'Demo reservation')}</span></div>
    <div class="card-line financial"><span><small>${tr(lang, 'Cena · demo', 'Price · demo')}</small><br><strong>${price}</strong></span><span><small>${tr(lang, 'Provize vč. DPH', 'Commission incl. VAT')}</small><br><b>${tr(lang, 'Dle smlouvy', 'Per contract')}</b></span></div>
    <div class="inline-actions"><button class="button" type="button" data-open-sheet="dispute-sheet" data-write-action>${tr(lang, 'Rozporovat', 'Dispute')}</button><button class="button primary" type="button" data-approval data-toast="${tr(lang, 'Ukázkové rozúčtování bylo schváleno.', 'Demo settlement approved.')}" data-write-action>${tr(lang, 'Schválit', 'Approve')}</button></div>
  </article>`;
}

function billing(lang) {
  return `${pageHead(lang, tr(lang, 'Rozúčtování', 'Billing'), tr(lang, 'Cena, procento provize, provize včetně DPH a dokumenty v jednom pracovním seznamu.', 'Price, commission rate, commission incl. VAT and documents in one working list.'))}
    ${stateAlerts(lang)}
    <div class="alert warning"><strong>${tr(lang, 'Ukázková finanční data.', 'Demo financial data.')}</strong>&nbsp;${tr(lang, 'Částky a stavy níže nepocházejí z reálného účtu.', 'The amounts and statuses below do not come from a live account.')}</div>
    <div class="filter-scroll"><button class="chip active" type="button" data-filter-chip>${tr(lang, 'Ke schválení', 'For approval')} 3</button><button class="chip" type="button" data-filter-chip>${tr(lang, 'Schválené', 'Approved')}</button><button class="chip" type="button" data-filter-chip>${tr(lang, 'Rozporované', 'Disputed')}</button></div>
    <div class="billing-list inventory-content">
      ${billingCard(lang, 1, 'DEMO-10482', '12.–14. 10. 2026', tr(lang, 'Ke schválení', 'For approval'), 'warning', '7 154 Kč')}
      ${billingCard(lang, 2, 'DEMO-10477', '16.–19. 10. 2026', tr(lang, 'Ke schválení', 'For approval'), 'warning', '6 240 Kč')}
      ${billingCard(lang, 3, 'DEMO-10463', '20.–23. 10. 2026', tr(lang, 'Ke schválení', 'For approval'), 'warning', '8 120 Kč')}
      ${billingCard(lang, 4, 'DEMO-10411', '27.–29. 10. 2026', tr(lang, 'Schváleno', 'Approved'), 'success', '4 800 Kč')}
      ${billingCard(lang, 5, 'DEMO-10398', '2.–5. 11. 2026', tr(lang, 'Rozporováno', 'Disputed'), 'danger', '5 100 Kč')}
    </div>
    ${emptyState(lang, 'Nic k rozúčtování', 'Nothing to settle', 'Pro tento ukázkový stav nejsou žádné položky.', 'There are no items for this demo state.')}`;
}

function moreTile(lang, iconName, titleCs, titleEn, textCs, textEn, attrs = '') {
  return `<a class="more-tile" href="#" ${attrs} data-toast="${tr(lang, `V prototypu: ${titleCs}.`, `In prototype: ${titleEn}.`)}"><span class="tile-icon">${icon(iconName)}</span><span><h2>${tr(lang, titleCs, titleEn)}</h2><p>${tr(lang, textCs, textEn)}</p></span></a>`;
}

function more(lang) {
  return `${pageHead(lang, tr(lang, 'Více', 'More'), tr(lang, 'Sekundární moduly jsou seskupené podle pracovního úkolu a filtrované rolí.', 'Secondary modules are grouped by job and filtered by role.'))}
    ${stateAlerts(lang)}
    <section class="more-group"><div class="section-head"><h2>${tr(lang, 'Zařízení a nabídka', 'Property and offer')}</h2></div><div class="more-grid">
      ${moreTile(lang, 'bed', 'Pokoje', 'Rooms', 'Kapacita, lůžka a vybavení', 'Capacity, beds and equipment')}
      ${moreTile(lang, 'image', 'Fotogalerie', 'Photo gallery', 'Galerie a profilové snímky', 'Galleries and profile images')}
      ${moreTile(lang, 'building', 'Profil hotelu', 'Hotel profile', 'Adresa, kontakty a klasifikace', 'Address, contacts and classification')}
      ${moreTile(lang, 'upload', 'Nahrát ceník', 'Upload price list', 'PDF / JSON a mapování cen', 'PDF / JSON and rate mapping')}
    </div></section>
    <section class="more-group"><div class="section-head"><h2>${tr(lang, 'Finance', 'Finance')}</h2></div><div class="more-grid">
      <a class="more-tile" href="${file('billing', lang)}" data-carry-state><span class="tile-icon">${icon('invoice')}</span><span><h2>${tr(lang, 'Rozúčtování', 'Billing')}</h2><p>${tr(lang, '3 ukázkové položky ke schválení', '3 demo items for approval')}</p></span></a>
      ${moreTile(lang, 'document', 'Faktury', 'Invoices', 'Detail, stav a PDF', 'Detail, status and PDF')}
      ${moreTile(lang, 'document', 'Platební doklady', 'Payment documents', 'Přijaté dokumenty a PDF', 'Received documents and PDF')}
      ${moreTile(lang, 'document', 'Smlouva', 'Contract', 'Elektronická smlouva', 'Electronic contract')}
    </div></section>
    <section class="more-group"><div class="section-head"><h2>${tr(lang, 'Tým a systém', 'Team and system')}</h2></div><div class="more-grid">
      ${moreTile(lang, 'users', 'Uživatelé', 'Users', 'Pozvánky, role a stav', 'Invites, roles and status', 'class="full-access-only"')}
      ${moreTile(lang, 'settings', 'Oprávnění', 'Permissions', 'Čtení nebo plný přístup', 'Read only or full access', 'class="full-access-only"')}
      ${moreTile(lang, 'link', 'Channel Manager', 'Channel manager', 'ID pokojů a plánů, CSV', 'Room and plan IDs, CSV')}
      ${moreTile(lang, 'settings', 'Nastavení', 'Settings', 'Hotel a oznámení', 'Property and notifications')}
    </div></section>
    <section class="more-group" id="changes"><div class="section-head"><h2>${tr(lang, 'Schvalování a pomoc', 'Approvals and help')}</h2></div><div class="more-grid">
      ${moreTile(lang, 'edit', 'Změny (2)', 'Changes (2)', 'Proces čtyř očí · demo', 'Four-eyes process · demo')}
      ${moreTile(lang, 'help', 'Centrum nápovědy', 'Help centre', 'Manuál, FAQ a obchodní zástupce', 'Manual, FAQ and account manager')}
    </div></section>`;
}

function sheetShell(id, lang, title, body, actions = '') {
  return `<div class="modal-backdrop" id="${id}" aria-hidden="true"><section class="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="${id}-title"><div class="sheet-grabber"></div><header class="sheet-head"><h2 id="${id}-title">${title}</h2><button class="header-button" type="button" data-close-sheet aria-label="${tr(lang, 'Zavřít', 'Close')}">×</button></header><div class="sheet-body">${body}</div>${actions}</section></div>`;
}

function sheets(page, lang) {
  const property = sheetShell('property-sheet', lang, tr(lang, 'Vybrat zařízení', 'Select property'), `<button class="button full primary" type="button" data-close-sheet>SPA HOTEL ČAJKOVSKIJ <span class="test-label">TEST</span></button><p class="subtle">${tr(lang, 'Jediné veřejné zařízení použité v prototypu.', 'The only public property used in the prototype.')}</p>`);
  let contextual = '';
  if (page === 'reservations') {
    contextual = sheetShell('filter-sheet', lang, tr(lang, 'Filtry rezervací', 'Reservation filters'), `<form data-prototype-form data-success="${tr(lang, 'Ukázkové filtry byly použity.', 'Demo filters applied.')}" id="filter-form"><label class="field"><span>${tr(lang, 'Typ data', 'Date type')}</span><select><option>${tr(lang, 'Příjezd', 'Arrival')}</option><option>${tr(lang, 'Odjezd', 'Departure')}</option><option>${tr(lang, 'Vytvořeno', 'Created')}</option></select></label><div class="form-two-col"><label class="field"><span>${tr(lang, 'Od', 'From')}</span><input type="date" value="2026-09-12"></label><label class="field"><span>${tr(lang, 'Do', 'To')}</span><input type="date" value="2026-10-12"></label></div><label class="field"><span>${tr(lang, 'ID nebo host', 'ID or guest')}</span><input value="" placeholder="DEMO-10482"></label></form>`, `<div class="sheet-actions"><button class="button" type="button" data-close-sheet>${tr(lang, 'Zrušit', 'Cancel')}</button><button class="button primary" type="submit" form="filter-form">${tr(lang, 'Použít', 'Apply')}</button></div>`);
  }
  if (page === 'availability') {
    contextual = sheetShell('availability-sheet', lang, tr(lang, 'Uzavřít termín', 'Close a date range'), `<form data-prototype-form data-success="${tr(lang, 'Ukázkový stop prodej byl nastaven.', 'Demo stop sell set.')}" id="availability-form"><div class="form-two-col"><label class="field"><span>${tr(lang, 'Od', 'From')}</span><input type="date" value="2026-10-16"></label><label class="field"><span>${tr(lang, 'Do', 'To')}</span><input type="date" value="2026-10-17"></label></div><label class="field"><span>${tr(lang, 'Pokoj', 'Room')}</span><select><option>${tr(lang, 'Všechny pokoje', 'All rooms')}</option><option>${tr(lang, 'Dvoulůžkový', 'Double')}</option></select></label></form>`, `<div class="sheet-actions"><button class="button" type="button" data-close-sheet>${tr(lang, 'Zrušit', 'Cancel')}</button><button class="button primary" type="submit" form="availability-form">${tr(lang, 'Nastavit', 'Set')}</button></div>`);
  }
  if (page === 'billing') {
    contextual = sheetShell('dispute-sheet', lang, tr(lang, 'Rozporovat rozúčtování', 'Dispute settlement'), `<form data-prototype-form data-success="${tr(lang, 'Ukázkový rozpor byl odeslán.', 'Demo dispute submitted.')}" id="dispute-form"><div class="alert warning">${tr(lang, 'Všechna pole jsou ukázková.', 'All fields contain demo data.')}</div><label class="field"><span>${tr(lang, 'Důvod', 'Reason')}</span><textarea required>${tr(lang, 'Ukázkový důvod rozporu', 'Demo dispute reason')}</textarea></label><label class="field"><span>${tr(lang, 'Navržená cena', 'Suggested price')}</span><input type="number" min="1" value="3400" required></label></form>`, `<div class="sheet-actions"><button class="button" type="button" data-close-sheet>${tr(lang, 'Zrušit', 'Cancel')}</button><button class="button primary" type="submit" form="dispute-form">${tr(lang, 'Odeslat', 'Submit')}</button></div>`);
  }
  return property + contextual;
}

function walls(lang) {
  return `<section class="signed-out-wall"><div class="wall-card">${icon('users')}<h1>${tr(lang, 'Odhlášený ukázkový účet', 'Signed-out demo account')}</h1><p>${tr(lang, 'V plovoucím panelu přepněte účet zpět na „Přihlášen“. Nejsou použity žádné skutečné přihlašovací údaje.', 'Use the floating settings panel to switch back to “Signed in”. No real credentials are used.')}</p><button class="button primary" type="button" data-toast="${tr(lang, 'Přihlášení se mění v panelu prototypu.', 'Use the prototype settings panel to sign in.')}">${tr(lang, 'Otevřít ukázkový účet', 'Open demo account')}</button></div></section>
  <section class="access-wall"><div class="wall-card">${icon('settings')}<h1>${tr(lang, 'Bez přístupu v tomto stavu', 'No access in this demo state')}</h1><p>${tr(lang, 'V plovoucím panelu zvolte přístup „Pouze pro čtení“ nebo „Plný“.', 'Use the floating settings panel to select Read only or Full access.')}</p></div></section>`;
}

function contentFor(page, lang) {
  const renderers = { dashboard, reservations, 'reservation-detail': reservationDetail, availability, offer, 'rate-edit': rateEdit, billing, more };
  return renderers[page](lang);
}

function titleFor(page, lang) {
  const titles = {
    dashboard: ['Přehled', 'Overview'], reservations: ['Rezervace', 'Reservations'],
    'reservation-detail': ['Detail rezervace', 'Reservation detail'], availability: ['Dostupnost', 'Availability'],
    offer: ['Nabídka', 'Offer'], 'rate-edit': ['Ceny balíčku', 'Package rates'],
    billing: ['Rozúčtování', 'Billing'], more: ['Více', 'More'],
  };
  return tr(lang, titles[page][0], titles[page][1]);
}

function renderPage(page, lang) {
  const languageSibling = lang === 'cs' ? file(page, 'en') : file(page, 'cs');
  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=390, initial-scale=1, maximum-scale=1">
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
  <div class="prototype-hint">Interactive prototype · public package facts + clearly labelled demo account data</div>
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

const written = [];
for (const page of SCREENS) {
  for (const lang of ['cs', 'en']) {
    const output = file(page, lang);
    fs.writeFileSync(path.join(ROOT, output), renderPage(page, lang), 'utf8');
    written.push(output);
  }
}

process.stdout.write(`Generated ${written.length} mobile screens:\n${written.join('\n')}\n`);
