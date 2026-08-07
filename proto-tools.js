/* ============================================================
   Prototype · settings — the floating demo panel
   ------------------------------------------------------------
   Demo switches never belong in the product UI. A language toggle
   a real user would never see, a "signed in / signed out" flip, a
   fake inventory dial: put them in the page and every reviewer
   reads them as a feature proposal. They live here instead.

   Three rules this file exists to enforce:
     1. Every switch is also a URL param, so any state is linkable
        and the Figma export can capture it without a click.
     2. ?nopanel=1 is export mode — the panel is never built,
        body[data-export="1"] lets fixed bars join the normal flow.
     3. A switch sets body[data-<key>="<value>"] and nothing else.
        CSS reacts. Only switches that need real logic take onChange.

   Usage (after the page's own script, before </body>):

     protoTools.init({
       title: 'Prototype · settings',
       carry: ['q', 'from', 'to'],              // query keys carried across panel links
       view:  { current: 'desktop', desktop: location.pathname, mobile: 'm-home.html' },
       switches: [
         { key: 'auth', label: 'Account', persist: true, default: 'out',
           options: [['out', 'Guest'], ['in', 'Member']] },
         { key: 'density', label: 'Card view', default: 'a',
           when: () => document.body.dataset.page === 'listing',
           options: [['a', 'Detailed'], ['b', 'Compact'], ['c', 'Summary']] },
         { key: 'inv', label: 'Demo inventory', default: 'many',
           options: [['many', 'Many'], ['some', 'Some'], ['few', 'Few']],
           onChange: v => renderResults(v) },
       ],
     });

   Language rows are discovered from `.langswitch a` in the page if you
   do not pass `lang` explicitly, so the same call works on every screen.
   ============================================================ */
(function (global) {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const qp = new URLSearchParams(location.search);
  const EXPORT = qp.has('nopanel');

  /* keys carried from page to page so switching language or view keeps the demo state */
  function carryQS(keys) {
    const out = new URLSearchParams();
    (keys || []).forEach(k => { const v = qp.get(k); if (v != null) out.set(k, v); });
    const s = out.toString();
    return s ? '?' + s : '';
  }

  /* a switch's value: URL wins (export/deep-link), then localStorage, then default.
     In export mode localStorage is skipped entirely — an export must be a pure
     function of the URL, or a click made an hour ago leaks into the Figma frames. */
  function initialValue(sw) {
    if (qp.get(sw.key)) return qp.get(sw.key);
    if (sw.persist && !EXPORT) {
      try { const v = localStorage.getItem('proto:' + sw.key); if (v) return v; } catch (e) { }
    }
    return sw.default != null ? sw.default : (sw.options[0] && sw.options[0][0]);
  }

  function apply(sw, value, fire) {
    document.body.dataset[sw.key] = value;
    if (sw.persist) { try { localStorage.setItem('proto:' + sw.key, value); } catch (e) { } }
    if (fire && sw.onChange) sw.onChange(value);
  }

  function langFromPage() {
    const ls = $('.langswitch');
    if (!ls) return null;
    const options = $$('a', ls).map(a => ({
      code: (a.dataset.lang || a.textContent.trim()).toLowerCase(),
      label: a.textContent.trim(),
      href: a.getAttribute('href'),
      on: a.classList.contains('on'),
    }));
    return options.length > 1 ? { options } : null;
  }

  /* Keep an entry's own URL parameters (a use case's state, for example) and
     add only carried panel parameters it did not already specify. */
  function withCarryQS(href, carried) {
    const raw = String(href || '');
    if (!carried) return raw;
    const hashAt = raw.indexOf('#');
    const beforeHash = hashAt === -1 ? raw : raw.slice(0, hashAt);
    const hash = hashAt === -1 ? '' : raw.slice(hashAt);
    const queryAt = beforeHash.indexOf('?');
    const path = queryAt === -1 ? beforeHash : beforeHash.slice(0, queryAt);
    const query = new URLSearchParams(queryAt === -1 ? '' : beforeHash.slice(queryAt + 1));
    new URLSearchParams(String(carried).replace(/^\?/, '')).forEach((value, key) => {
      if (!query.has(key)) query.set(key, value);
    });
    const serialized = query.toString();
    return path + (serialized ? '?' + serialized : '') + hash;
  }

  /* Generated deep links must open the interactive page even if an old file
     accidentally contained the export-only flag. */
  function withoutQueryParam(href, key) {
    const raw = String(href || '');
    const hashAt = raw.indexOf('#');
    const beforeHash = hashAt === -1 ? raw : raw.slice(0, hashAt);
    const hash = hashAt === -1 ? '' : raw.slice(hashAt);
    const queryAt = beforeHash.indexOf('?');
    if (queryAt === -1) return raw;
    const path = beforeHash.slice(0, queryAt);
    const query = new URLSearchParams(beforeHash.slice(queryAt + 1));
    query.delete(key);
    const serialized = query.toString();
    return path + (serialized ? '?' + serialized : '') + hash;
  }

  /* The panel used to fetch changelog/use-case JSON and re-render it inside a
     lazily-toggled sheet — a second, cramped rendering of content that already
     has a dedicated page with its own affordances (discussion, thumbnails,
     grouping). `pageLinkConfig` normalises a switch's config the same three
     ways `sheetConfig` used to (`true` | string href | object override), but
     the result is a link to that page instead of a fetch target. */
  function pageLinkConfig(value, defaults) {
    if (typeof value === 'string') return Object.assign({}, defaults, { href: value });
    if (value === true) return Object.assign({}, defaults);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.assign({}, defaults, value, { href: value.href || defaults.href });
    }
    return null;
  }

  function init(cfg) {
    cfg = cfg || {};
    const switches = (cfg.switches || []).filter(s => !s.when || s.when());
    const changelog = pageLinkConfig(cfg.changelog, {
      href: 'changelog.html',
      label: cfg.labels && cfg.labels.changelog || 'Changelog',
    });
    const usecases = pageLinkConfig(cfg.usecases, {
      href: 'usecases.html',
      label: cfg.labels && cfg.labels.usecases || 'Use cases',
    });
    const comments = pageLinkConfig(cfg.comments, {
      href: 'comments.html',
      label: cfg.labels && cfg.labels.comments || 'Comments',
    });

    /* every switch is settable from the URL, panel or no panel */
    switches.forEach(sw => apply(sw, initialValue(sw), false));

    /* ---- export mode: no panel, defaults applied, fixed bars join the flow ---- */
    if (qp.get('nopanel')) {
      document.body.dataset.export = '1';
      switches.forEach(sw => { if (sw.onChange) sw.onChange(document.body.dataset[sw.key]); });
      return;
    }

    switches.forEach(sw => { if (sw.onChange) sw.onChange(document.body.dataset[sw.key]); });

    const qs = carryQS(cfg.carry);
    const box = document.createElement('div');
    box.className = 'proto-tools' + (cfg.raised ? ' up' : '');
    const seg = (cls, items, attrs) => '<div class="pt-seg ' + cls + '" ' + (attrs || '') + '>' + items + '</div>';
    const btn = (attrs, label, on) => '<span class="pt-b' + (on ? ' on' : '') + '" ' + attrs + '>' + label + '</span>';
    const lnk = (href, label, on) => '<a class="pt-b' + (on ? ' on' : '') + '" href="' + href + qs + '">' + label + '</a>';
    const row = (label, inner) => '<div class="pt-row"><span class="pt-lbl">' + label + '</span>' + inner + '</div>';

    let html = '<div class="pt-h">' + (cfg.title || 'Prototype · settings') + '</div>';

    /* ---- language: explicit config, else discovered from the page's own switcher ---- */
    const lang = cfg.lang || langFromPage();
    if (lang && lang.options.length > 1) {
      const cur = lang.current || (lang.options.find(o => o.on) || {}).code;
      html += row(cfg.labels && cfg.labels.language || 'Language',
        seg('pt-lang', lang.options.map(o => lnk(o.href, o.label, o.code === cur || o.on)).join('')));
    }

    /* ---- desktop ↔ mobile: on a wide screen there is no other way to reach the
           phone screens, and the reviewer must be able to get back ---- */
    if (cfg.view && cfg.view.desktop && cfg.view.mobile) {
      const onDesktop = (cfg.view.current || 'desktop') === 'desktop';
      html += row(cfg.labels && cfg.labels.view || 'View', seg('pt-view',
        (onDesktop ? btn('data-view="desktop"', 'Desktop', true) : lnk(cfg.view.desktop, 'Desktop', false)) +
        (onDesktop ? lnk(cfg.view.mobile, cfg.labels && cfg.labels.mobile || 'Mobile', false)
                   : btn('data-view="mobile"', cfg.labels && cfg.labels.mobile || 'Mobile', true))));
    }

    /* ---- the rest: one segmented control per switch ---- */
    switches.forEach((sw, i) => {
      html += row(sw.label, seg('pt-sw',
        sw.options.map(([v, label]) => btn('data-v="' + v + '" title="' + label + '"',
          sw.short ? String(v).toUpperCase() : label, document.body.dataset[sw.key] === String(v))).join(''),
        'data-sw="' + i + '"'));
    });

    /* ---- review pages: the panel sends the reviewer to the page built for
           each, instead of re-rendering its content in-panel. withCarryQS
           carries the demo state set in the panel across the hop; the target
           is run through withoutQueryParam first so a caller-supplied href
           that already carries the export flag does not travel with it. ---- */
    const reviewPages = [changelog, usecases, comments].filter(Boolean);
    if (reviewPages.length) {
      html += row(cfg.labels && cfg.labels.reviewPages || 'Review pages', seg('pt-pages',
        reviewPages.map(p => '<a class="pt-b" href="' +
          withCarryQS(withoutQueryParam(p.href, 'nopanel'), qs) + '">' + p.label + '</a>').join('')));
    }

    html += '<span class="pt-min" role="button" aria-label="Collapse">–</span>';
    box.innerHTML = html;
    document.body.appendChild(box);

    $$('.pt-sw', box).forEach(segEl => {
      const sw = switches[+segEl.dataset.sw];
      $$('.pt-b', segEl).forEach(b => b.onclick = () => {
        apply(sw, b.dataset.v, true);
        $$('.pt-b', segEl).forEach(x => x.classList.toggle('on', x === b));
      });
    });
    $('.pt-min', box).onclick = () => box.classList.toggle('mini');
  }

  global.protoTools = { init: init, carryQS: carryQS };
})(window);
