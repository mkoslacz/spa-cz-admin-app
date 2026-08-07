// Dump absolute-positioned visual tree of a page via puppeteer-core
// usage: node dump-dom.js <fileUrl> <out.json> [viewportWidth]
// viewportWidth defaults to 1440 (desktop); pass the phone width (e.g. 430) for mobile screens.
// Chrome binary: $CHROME_PATH, else the macOS default below.
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const {
  CONVERTER_RESOURCE_BUDGET,
  ConverterPolicyError,
  assertWithinBudget,
  writeFileAtomically,
} = require('./converter-policy.js');

class DomDumpError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'DomDumpError';
    this.code = code;
  }
}

function createDependencies(overrides = {}) {
  return {
    clearTimeout: overrides.clearTimeout || clearTimeout,
    env: overrides.env || process.env,
    fs: overrides.fs || fs,
    loadPuppeteer: overrides.loadPuppeteer || (() => puppeteer),
    log: overrides.log || console.log,
    now: overrides.now || Date.now,
    random: overrides.random || Math.random,
    setTimeout: overrides.setTimeout || setTimeout,
  };
}

function domError(code, message) {
  return new DomDumpError(code, message);
}

function timeoutError(label) {
  return new ConverterPolicyError('CONVERTER_DEADLINE_EXCEEDED', 'conversion deadline exceeded while ' + label);
}

function waitFor(operation, label, timeoutMs, deps) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return Promise.reject(timeoutError(label));
  let timer;
  const timed = new Promise((_, reject) => {
    timer = deps.setTimeout(() => reject(timeoutError(label)), timeoutMs);
  });
  return Promise.race([Promise.resolve().then(operation), timed]).finally(() => deps.clearTimeout(timer));
}

function remainingDeadline(label, deadline, deps, cap = Infinity) {
  const remaining = Math.min(deadline - deps.now(), cap);
  if (remaining <= 0) throw timeoutError(label);
  return remaining;
}

async function closeQuietly(resource, label, deps) {
  if (!resource || typeof resource.close !== 'function') return;
  try {
    await waitFor(() => resource.close(), label, CONVERTER_RESOURCE_BUDGET.cleanupMs, deps);
  } catch (error) {
    deps.log('cleanup warning: ' + label + ' failed: ' + error.message);
  }
}

function normalizedViewportWidth(value) {
  const width = Number(value == null ? 1440 : value);
  if (!Number.isSafeInteger(width) || width < 1) {
    throw domError('DOM_VIEWPORT_INVALID', 'viewport width must be a positive integer');
  }
  assertWithinBudget(width, 'maxViewportWidth', 'viewport width');
  return width;
}

function browserBudgetError(error) {
  const match = error && /CONVERTER_BUDGET_EXCEEDED: (max[A-Za-z]+)/.exec(error.message);
  if (!match) return error;
  return new ConverterPolicyError('CONVERTER_BUDGET_EXCEEDED', 'browser DOM traversal exceeded ' + match[1]);
}

async function dumpDom(url, output, viewportWidth, overrides = {}) {
  const deps = createDependencies(overrides);
  if (typeof url !== 'string' || !url) throw domError('DOM_URL_INVALID', 'a page URL is required');
  if (typeof output !== 'string' || !output) throw domError('DOM_OUTPUT_INVALID', 'an output path is required');
  const width = normalizedViewportWidth(viewportWidth);
  const chrome = deps.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (!deps.fs.existsSync(chrome)) {
    throw domError(
      'CHROME_UNAVAILABLE',
      'Chrome not found at ' + chrome + ' — set CHROME_PATH to your Chrome/Chromium binary.'
    );
  }

  const deadline = deps.now() + CONVERTER_RESOURCE_BUDGET.deadlineMs;
  let browser;
  let page;
  try {
    const runtime = deps.loadPuppeteer();
    browser = await waitFor(
      () =>
        runtime.launch({
          executablePath: chrome,
          headless: 'new',
          args: ['--force-device-scale-factor=1', '--hide-scrollbars'],
        }),
      'browser launch',
      remainingDeadline('browser launch', deadline, deps),
      deps
    );
    page = await waitFor(
      () => browser.newPage(),
      'browser page creation',
      remainingDeadline('browser page creation', deadline, deps),
      deps
    );
    await waitFor(
      () => page.setViewport({ width, height: 1200 }),
      'viewport setup',
      remainingDeadline('viewport setup', deadline, deps),
      deps
    );
    await waitFor(
      () =>
        page.goto(url, { waitUntil: 'networkidle0', timeout: remainingDeadline('page navigation', deadline, deps) }),
      'page navigation',
      remainingDeadline('page navigation', deadline, deps),
      deps
    );
    await waitFor(
      () => page.evaluate(() => document.fonts.ready),
      'font readiness',
      remainingDeadline('font readiness', deadline, deps, CONVERTER_RESOURCE_BUDGET.fontWaitMs),
      deps
    );
    await waitFor(
      () => new Promise(resolve => deps.setTimeout(resolve, 400)),
      'post-font settle',
      remainingDeadline('post-font settle', deadline, deps),
      deps
    );
    let captured;
    try {
      captured = await waitFor(
        () => page.evaluate(captureDom, CONVERTER_RESOURCE_BUDGET),
        'DOM evaluation',
        remainingDeadline('DOM evaluation', deadline, deps),
        deps
      );
    } catch (error) {
      throw browserBudgetError(error);
    }
    if (!captured || typeof captured.json !== 'string' || !Number.isSafeInteger(captured.nodeCount)) {
      throw domError('DOM_CAPTURE_INVALID', 'browser returned an invalid bounded DOM result');
    }
    const serialized = captured.json;
    assertWithinBudget(Buffer.byteLength(serialized), 'maxResultBytes', 'DOM dump result');
    writeFileAtomically(output, serialized, { fs: deps.fs, random: deps.random });
    deps.log('nodes:', captured.nodeCount, '->', output);
    return { nodeCount: captured.nodeCount, output };
  } finally {
    await closeQuietly(page, 'page cleanup', deps);
    await closeQuietly(browser, 'browser cleanup', deps);
  }
}

async function main(argv = process.argv.slice(2), overrides = {}) {
  return dumpDom(argv[0], argv[1], argv[2], overrides);
}

async function captureDom(budget) {
  const sx = () => window.scrollX,
    sy = () => window.scrollY;

  function utf8ByteLength(value) {
    let bytes = 0;
    for (let index = 0; index < value.length; index++) {
      const code = value.charCodeAt(index);
      if (code < 0x80) bytes++;
      else if (code < 0x800) bytes += 2;
      else if (code >= 0xd800 && code <= 0xdbff && index + 1 < value.length) {
        const next = value.charCodeAt(index + 1);
        if (next >= 0xdc00 && next <= 0xdfff) {
          bytes += 4;
          index++;
        } else bytes += 3;
      } else bytes += 3;
    }
    return bytes;
  }

  function worstCaseJsonBytes(value, depth = 0) {
    if (depth > 32) throw new Error('CONVERTER_BUDGET_EXCEEDED: maxGraphDepth');
    if (typeof value === 'string') return value.length * 6 + 2;
    if (typeof value === 'number') return 32;
    if (typeof value === 'boolean') return 5;
    if (value == null) return 4;
    if (Array.isArray(value)) {
      let total = 2;
      for (const item of value) total += worstCaseJsonBytes(item, depth + 1) + 1;
      return total;
    }
    if (typeof value === 'object') {
      let total = 2;
      for (const key of Object.keys(value)) {
        total += key.length * 6 + 3 + worstCaseJsonBytes(value[key], depth + 1);
      }
      return total;
    }
    return 4;
  }

  function createBoundedEmitter() {
    const parts = ['['];
    let bytes = 1;
    let count = 0;
    return {
      emit(node) {
        const separator = count ? ',' : '';
        const maximum = worstCaseJsonBytes(node);
        if (bytes + utf8ByteLength(separator) + maximum + 1 > budget.maxResultBytes) {
          throw new Error('CONVERTER_BUDGET_EXCEEDED: maxResultBytes');
        }
        const item = JSON.stringify(node);
        const itemBytes = utf8ByteLength(item);
        if (bytes + utf8ByteLength(separator) + itemBytes + 1 > budget.maxResultBytes) {
          throw new Error('CONVERTER_BUDGET_EXCEEDED: maxResultBytes');
        }
        parts.push(separator, item);
        bytes += utf8ByteLength(separator) + itemBytes;
        count++;
      },
      finish() {
        parts.push(']');
        return parts.join('');
      },
      get count() {
        return count;
      },
    };
  }

  const result = createBoundedEmitter();

  /*
   * Do not collect a second unbounded representation of the page. Each emitted
   * node reserves its worst-case JSON size before JSON.stringify can allocate it,
   * then joins a result whose byte count has already passed maxResultBytes.
   */
  function emit(node) {
    result.emit(node);
  }

  function styleOf(el) {
    return getComputedStyle(el);
  }
  function rectOf(el) {
    const r = el.getBoundingClientRect();
    return { x: r.x + sx(), y: r.y + sy(), w: r.width, h: r.height };
  }
  function parseColor(c) {
    if (!c || c === 'transparent') return null;
    const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    if (!m) return null;
    const a = m[4] === undefined ? 1 : parseFloat(m[4]);
    if (a === 0) return null;
    return { r: +m[1] / 255, g: +m[2] / 255, b: +m[3] / 255, a };
  }
  function parseShadows(s) {
    if (!s || s === 'none') return [];
    // computed format: "rgba(30, 30, 30, 0.08) 0px 1px 3px 0px, ..." (inset prefix possible)
    const parts = s.split(/,(?![^(]*\))/).map(x => x.trim());
    const res = [];
    for (const p of parts) {
      const inset = /(^|\s)inset(\s|$)/.test(p);
      const col = parseColor(p);
      const nums = (p.replace(/rgba?\([^)]*\)/, '').match(/-?[\d.]+px/g) || []).map(parseFloat);
      if (col && nums.length >= 2)
        res.push({ inset, color: col, x: nums[0], y: nums[1], blur: nums[2] || 0, spread: nums[3] || 0 });
    }
    return res;
  }
  function parseGradient(bgImage) {
    const m = bgImage.match(/linear-gradient\((?:([\d.]+)deg,\s*)?(.+)\)$/);
    if (!m) return null;
    const angle = m[1] !== undefined ? parseFloat(m[1]) : 180;
    const stopsRaw = m[2].split(/,(?![^(]*\))/).map(x => x.trim());
    const stops = [];
    for (const s of stopsRaw) {
      const col = parseColor(s);
      const pos = s.match(/([\d.]+)%/);
      if (col) stops.push({ color: col, position: pos ? +pos[1] / 100 : null });
    }
    // fill null positions evenly
    stops.forEach((s, i) => {
      if (s.position === null) s.position = stops.length === 1 ? 0 : i / (stops.length - 1);
    });
    return { angle, stops };
  }

  async function svgToPng(svg, w, h) {
    const clone = svg.cloneNode(true);
    // resolve currentColor
    const color = getComputedStyle(svg).color;
    clone.setAttribute('color', color);
    // inline <use> references
    clone.querySelectorAll('use').forEach(u => {
      const ref = u.getAttribute('href') || u.getAttribute('xlink:href');
      if (ref && ref.startsWith('#')) {
        const sym = document.querySelector(ref);
        if (sym) {
          const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          g.innerHTML = sym.innerHTML;
          if (sym.getAttribute('viewBox')) clone.setAttribute('viewBox', sym.getAttribute('viewBox'));
          u.replaceWith(g);
        }
      }
    });
    clone.setAttribute('width', w);
    clone.setAttribute('height', h);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const s = new XMLSerializer().serializeToString(clone);
    const url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(s)));
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = res;
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    const S = 3;
    canvas.width = Math.max(1, Math.round(w * S));
    canvas.height = Math.max(1, Math.round(h * S));
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    try {
      return canvas.toDataURL('image/png');
    } catch (e) {
      return null;
    }
  }

  let idc = 0;
  let traversalSteps = 0;
  function nextId(label) {
    traversalSteps++;
    if (traversalSteps > budget.maxTraversalSteps) {
      throw new Error('CONVERTER_BUDGET_EXCEEDED: maxTraversalSteps');
    }
    idc++;
    if (idc > budget.maxGraphNodes) {
      throw new Error('CONVERTER_BUDGET_EXCEEDED: maxGraphNodes');
    }
    return idc;
  }
  async function walk(el, parentId, clipShift, depth = 0) {
    if (depth > budget.maxGraphDepth) {
      throw new Error('CONVERTER_BUDGET_EXCEEDED: maxGraphDepth');
    }
    const st = styleOf(el);
    if (st.display === 'none' || st.visibility === 'hidden') return;
    const r = rectOf(el);
    if (r.w < 0.5 || r.h < 0.5) return;
    const tag = el.tagName.toLowerCase();
    const id = nextId('element');

    const node = {
      id,
      parent: parentId,
      tag,
      name: el.className && typeof el.className === 'string' ? tag + '.' + el.className.split(' ')[0] : tag,
      rect: r,
    };

    // svg → rasterize, no children
    if (tag === 'svg') {
      if (r.w <= 64 && r.h <= 64) {
        node.type = 'icon';
        node.png = await svgToPng(el, r.w, r.h);
        emit(node);
        return;
      } else {
        return;
      } // sprite defs container (w=0 skipped anyway)
    }
    if (tag === 'img') {
      node.type = 'img';
      node.src = el.currentSrc || el.src;
      node.objectFit = st.objectFit || 'fill';
      node.radius = [
        st.borderTopLeftRadius,
        st.borderTopRightRadius,
        st.borderBottomRightRadius,
        st.borderBottomLeftRadius,
      ].map(parseFloat);
      node.opacity = parseFloat(st.opacity);
      emit(node);
      return;
    }

    // container/box
    node.type = 'box';
    node.bg = parseColor(st.backgroundColor);
    node.gradient =
      st.backgroundImage && st.backgroundImage.includes('linear-gradient') ? parseGradient(st.backgroundImage) : null;
    node.bgUrl = (st.backgroundImage.match(/url\("?([^")]+)"?\)/) || [])[1] || null;
    node.bgSize = st.backgroundSize;
    node.radius = [
      st.borderTopLeftRadius,
      st.borderTopRightRadius,
      st.borderBottomRightRadius,
      st.borderBottomLeftRadius,
    ].map(parseFloat);
    node.borders = {
      t: { w: parseFloat(st.borderTopWidth), c: parseColor(st.borderTopColor) },
      r: { w: parseFloat(st.borderRightWidth), c: parseColor(st.borderRightColor) },
      b: { w: parseFloat(st.borderBottomWidth), c: parseColor(st.borderBottomColor) },
      l: { w: parseFloat(st.borderLeftWidth), c: parseColor(st.borderLeftColor) },
    };
    node.shadows = parseShadows(st.boxShadow);
    node.opacity = parseFloat(st.opacity);
    node.clips = ['hidden', 'clip', 'auto', 'scroll'].includes(st.overflow) || st.overflow.includes('hidden');
    emit(node);

    // pseudo-elements (overlays, generated content)
    for (const pseudo of ['::before', '::after']) {
      const ps = getComputedStyle(el, pseudo);
      if (!ps || ps.content === 'none' || ps.display === 'none') continue;
      const hasBg = parseColor(ps.backgroundColor) || ps.backgroundImage.includes('linear-gradient');
      const txtContent =
        ps.content && ps.content !== 'normal' && ps.content !== '""' ? ps.content.replace(/^"|"$/g, '') : '';
      if (!hasBg && !txtContent) continue;
      const pid = nextId('pseudo-element');
      emit({
        id: pid,
        parent: id,
        type: 'box',
        tag: 'pseudo',
        name: 'overlay',
        rect: { ...r },
        bg: parseColor(ps.backgroundColor),
        gradient: ps.backgroundImage.includes('linear-gradient') ? parseGradient(ps.backgroundImage) : null,
        bgUrl: null,
        bgSize: 'auto',
        radius: node.radius,
        borders: { t: { w: 0 }, r: { w: 0 }, b: { w: 0 }, l: { w: 0 } },
        shadows: [],
        opacity: 1,
        clips: false,
      });
      if (txtContent) {
        const tid = nextId('pseudo-element text');
        emit({
          id: tid,
          parent: pid,
          type: 'text',
          tag: 'text',
          rect: { x: r.x, y: r.y + r.h / 2 - 10, w: r.w, h: 20 },
          text: txtContent,
          font: {
            family: ps.fontFamily.split(',')[0].replace(/["']/g, '').trim(),
            size: parseFloat(ps.fontSize) || 14,
            weight: +ps.fontWeight || 700,
            italic: false,
          },
          color: parseColor(ps.color) || { r: 1, g: 1, b: 1, a: 1 },
          lineHeight: 20,
          letterSpacing: 0,
          align: 'center',
          transform: 'none',
          decoration: 'none',
        });
      }
    }

    // direct text content → text nodes (group consecutive text of same element)
    let textBuf = '';
    const flushText = () => {
      if (!textBuf.trim()) {
        textBuf = '';
        return;
      }
      // measure text rects via range over all child text nodes
      textBuf = '';
    };
    // collect text: if element has direct non-empty text nodes, emit ONE text node with el's text styling and content = el.innerText (only if no element children OR mixed)
    const directTextNodes = Array.from(el.childNodes).filter(n => n.nodeType === 3 && n.textContent.trim());
    const hasElemKids = el.children.length > 0;
    if (directTextNodes.length && hasElemKids) {
      // mixed content: one text node per run, exact rects
      for (const tn of directTextNodes) {
        const rg = document.createRange();
        rg.selectNodeContents(tn);
        const rr = rg.getBoundingClientRect();
        if (rr.width < 1) continue;
        const tid = nextId('mixed text');
        emit({
          id: tid,
          parent: id,
          type: 'text',
          tag: 'text',
          rect: { x: rr.x + sx(), y: rr.y + sy(), w: Math.max(2, rr.width), h: Math.max(2, rr.height) },
          text: tn.textContent.replace(/\s+/g, ' ').trim(),
          font: {
            family: st.fontFamily.split(',')[0].replace(/["']/g, '').trim(),
            size: parseFloat(st.fontSize),
            weight: +st.fontWeight || 400,
            italic: st.fontStyle === 'italic',
          },
          color: parseColor(st.color),
          lineHeight: parseFloat(st.lineHeight) || parseFloat(st.fontSize) * 1.2,
          letterSpacing: st.letterSpacing === 'normal' ? 0 : parseFloat(st.letterSpacing),
          align: 'left',
          transform: st.textTransform,
          decoration: st.textDecorationLine,
        });
      }
    }
    const directText = directTextNodes.map(n => n.textContent).join('');
    if (directText.trim() && !hasElemKids) {
      // text rect: use range
      let tr = null;
      for (const tn of Array.from(el.childNodes).filter(n => n.nodeType === 3 && n.textContent.trim())) {
        const rg = document.createRange();
        rg.selectNodeContents(tn);
        const rr = rg.getBoundingClientRect();
        if (!tr) tr = { x: rr.x, y: rr.y, right: rr.right, bottom: rr.bottom };
        else {
          tr.x = Math.min(tr.x, rr.x);
          tr.y = Math.min(tr.y, rr.y);
          tr.right = Math.max(tr.right, rr.right);
          tr.bottom = Math.max(tr.bottom, rr.bottom);
        }
      }
      tr = tr ? { x: tr.x, y: tr.y, width: tr.right - tr.x, height: tr.bottom - tr.y } : el.getBoundingClientRect();
      const tid = nextId('text');
      emit({
        id: tid,
        parent: id,
        type: 'text',
        tag: 'text',
        rect: { x: tr.x + sx(), y: tr.y + sy(), w: Math.max(2, tr.width), h: Math.max(2, tr.height) },
        text: hasElemKids ? directText.trim() : el.innerText.trim(),
        font: {
          family: st.fontFamily.split(',')[0].replace(/["']/g, '').trim(),
          size: parseFloat(st.fontSize),
          weight: +st.fontWeight || 400,
          italic: st.fontStyle === 'italic',
        },
        color: parseColor(st.color),
        lineHeight: parseFloat(st.lineHeight) || parseFloat(st.fontSize) * 1.2,
        letterSpacing: st.letterSpacing === 'normal' ? 0 : parseFloat(st.letterSpacing),
        align: st.textAlign,
        transform: st.textTransform,
        decoration: st.textDecorationLine,
      });
      if (!hasElemKids) return; // pure text leaf: done
    }
    for (const c of el.children) await walk(c, id, clipShift, depth + 1);
  }

  await walk(document.body, 0, null);
  return { json: result.finish(), nodeCount: result.count };
}

if (require.main === module) {
  main().catch(error => {
    console.error(error && error.message ? error.message : String(error));
    process.exitCode = 1;
  });
}

module.exports = {
  DomDumpError,
  captureDom,
  createDependencies,
  dumpDom,
  main,
  normalizedViewportWidth,
  waitFor,
};
