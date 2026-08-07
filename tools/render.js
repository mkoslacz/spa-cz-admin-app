// Render figma frames from nodes.jsonl to standalone HTML (absolute positioning)
// usage: node render.js <dir> <frameId> [frameId...]
const fs = require('fs');
const path = require('path');
const { assertSafeIdentifier, writeFileAtomically } = require('./converter-policy.js');

function rendererDependencies(overrides = {}) {
  return {
    assertSafeIdentifier: overrides.assertSafeIdentifier || assertSafeIdentifier,
    environment: overrides.environment || process.env,
    error: overrides.error || console.error,
    fs: overrides.fs || fs,
    log: overrides.log || console.log,
    path: overrides.path || path,
    pid: overrides.pid,
    random: overrides.random,
    warn: overrides.warn || console.warn,
    writeFileAtomically: overrides.writeFileAtomically || writeFileAtomically,
  };
}

function* jsonlLines(file, filesystem) {
  const buf = filesystem.readFileSync(file);
  let start = 0;
  for (let i = 0; i <= buf.length; i++) {
    if (i === buf.length || buf[i] === 10) {
      if (i > start) yield buf.subarray(start, i).toString('utf8');
      start = i + 1;
    }
  }
}

function loadNodes(directory, state) {
  state.error('loading nodes...');
  const byId = new Map();
  const children = new Map(); // parent -> [{id,pos}]
  for (const line of jsonlLines(state.path.join(directory, 'nodes.jsonl'), state.fs)) {
    const n = JSON.parse(line);
    // drop heavy fields we never render
    delete n.pluginData;
    delete n.fillGeometry;
    delete n.strokeGeometry;
    delete n.componentPropDefs; // keep? needed for defaults — keep actually
    byId.set(n._id, n);
    if (n._parent) {
      if (!children.has(n._parent)) children.set(n._parent, []);
      children.get(n._parent).push({ id: n._id, pos: n.parentIndex ? n.parentIndex.position : '' });
    }
  }
  for (const arr of children.values()) arr.sort((a, b) => (a.pos < b.pos ? -1 : a.pos > b.pos ? 1 : 0));
  state.error('loaded', byId.size, 'nodes');
  return { byId, children };
}

const gid = g => (g ? `${g.sessionID}:${g.localID}` : null);
const okey = n => (n ? (n.overrideKey ? gid(n.overrideKey) : n._id) : null);
// Escapes a value for HTML text or for inside a double-quoted HTML attribute.
// '&' is replaced first so the entities the later replacements introduce are
// never re-escaped.
const esc = s =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Coerces an attacker-controlled node field to a finite number before it is
// interpolated into a `style="..."` attribute. Every call site below emits a
// bare number with a literal unit suffix this module appends itself ("px",
// "deg", "em", ...) — there is no legitimate non-numeric value, so validating
// that the field IS a number is the fix, not hand-quoting a string that was
// never supposed to reach here.
const cssNum = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

// Escapes a string for use inside a single-quoted CSS string that itself sits
// inside a double-quoted HTML `style` attribute. Two escapes are required
// because two parsers see this text in sequence: the HTML tokenizer ends the
// attribute at the first literal '"' regardless of anything in front of it
// (so '"' must become the entity &quot; — decoded back to a literal quote
// only once HTML parsing has already found the attribute's boundary), and the
// CSS parser that then runs on the decoded text needs a backslash-escaped
// "'" so an embedded quote is not read as the string's own terminator.
//
// '&' is replaced FIRST, exactly like `esc` above, and for the identical
// reason: the HTML attribute-value decoder that later reads this text runs
// BEFORE the CSS parser does, and it decodes character references — not
// just the five named above but every numeric/hex/named form ('&#39;',
// '&#x27;', '&#0000039;', '&apos;', ...). Left unescaped, an input of
// '&#39;' passes every later replacement below untouched (it contains no
// '\\', "'", '"', or CR/LF) and is then decoded by the browser into a bare
// "'" that closes the CSS string the caller wraps this value in — a full
// CSS declaration injection. Escaping '&' -> '&amp;' first turns any such
// reference into a literal, inert '&amp;#39;': the decoder turns that back
// into the literal text '&#39;', which is not itself a character reference,
// so no second decoding pass ever sees it.
// Doing this first also means it never touches the '&' that the '"' rule
// below introduces (&quot;) — that entity is *meant* to survive to the
// browser's decoder, so it must not be escaped a second time here.
// Backslashes are doubled first (after '&') so a backslash already present
// in the input cannot combine with the escape this function adds into a
// different escape.
//
// The final replacement covers the CONTROL class as a class, not the newlines
// somebody happened to report. CSS input preprocessing (css-syntax-3 §3.3)
// runs before tokenization and rewrites U+000D, U+000C and the pair
// U+000D U+000A all to U+000A, so U+000C ends a string token exactly like a
// raw newline does — which is precisely how the previous `[\r\n]` rule was
// bypassed. \p{Cc} is every C0 control, DEL and every C1 control: it is the
// closed class the three preprocessed newlines belong to, so no fourth member
// of it can be discovered later. Nothing legitimate that reaches a CSS string
// here is a control character, so collapsing them all to a space is lossless
// in practice. This remains a second line of defence: both call sites below
// validate their value against an allowlist first (see FONT_FAMILY_ALLOWED
// and IMAGE_HASH_ALLOWED) and drop it outright when it does not conform.
const cssStr = value =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '&quot;')
    .replace(/\p{Cc}/gu, ' ');

// ---------- allowlists for the two values that reach a quoted CSS string ----------
//
// Three consecutive rounds extended a denylist on `cssStr`, and each one closed
// only the payload that had been reported: a bare "'", then the whole
// character-reference class ('&#39;', '&apos;', '&#x27;'), then U+000C. Every
// fix was correct and every fix was incomplete, because "which characters are
// dangerous" is an open question that a reviewer answers one counterexample at
// a time. "Which characters are legitimate" is a closed one, answerable from
// what the producers of these values actually emit — so the two call sites
// below decide membership instead of escaping, and DROP a non-conforming value
// rather than trying to render it safely. A character nobody has thought of is
// then refused by default instead of admitted by default, which is the property
// that ends the cycle.

// What a font family may be built from, and why this does not break real fonts:
// any Unicode letter, mark or digit — so "Noto Sans CJK JP", "思源黑体",
// "Ærø Grotesk" and "Eurostile LT Std 1" all pass — plus the seven ASCII
// punctuation characters that occur in real family names: space ("DM Sans"),
// hyphen ("Helvetica-Bold"), underscore, full stop (".SF NS Text"), plus sign,
// ampersand ("Stan & Sons") and the commercial at that Windows prefixes to a
// vertically-oriented face ("@Yu Mincho"). Everything able to terminate the CSS
// string, the declaration or the HTML attribute is outside it without being
// named: "'", '"', ';', ':', ',', '{', '}', '(', ')', '\\', '<', '>', '#', and
// every control including U+000C. The length bound keeps a pathological value
// out of the attribute; no real family approaches it.
const FONT_FAMILY_ALLOWED = /^[\p{L}\p{M}\p{N} ._+&@-]{1,128}$/u;

const DEFAULT_FONT_FAMILY = 'DM Sans';

// Returns a family safe to interpolate, or the default face when the value does
// not conform. Dropping rather than escaping is the point: a hostile family
// renders as the default, so no part of it survives into the attribute for a
// later parser to reinterpret.
const safeFontFamily = (value, fallback = DEFAULT_FONT_FAMILY) =>
  typeof value === 'string' && FONT_FAMILY_ALLOWED.test(value) ? value : fallback;

// Every file under images/ is named by the hex SHA-1 of its own bytes — that is
// what generate-fig.js writes (`sha1(bytes).toString('hex')`) and what decode.js
// emits into nodes.jsonl for a 20-byte hash — so the entire legitimate value
// space is hex digits. Refusing anything else also removes the path traversal
// that reached `path.join` and the emitted `url('images/...')` when a dumped
// hash carried '..' or a separator.
const IMAGE_HASH_ALLOWED = /^[0-9a-fA-F]{1,128}$/;

function cssColor(c, opacity) {
  const a = (c.a != null ? c.a : 1) * (opacity != null ? opacity : 1);
  const f = x => Math.round(x * 255);
  return a >= 1 ? `rgb(${f(c.r)},${f(c.g)},${f(c.b)})` : `rgba(${f(c.r)},${f(c.g)},${f(c.b)},${a.toFixed(3)})`;
}

function imageFile(hashHex, state) {
  // Refused before it reaches path.join or the url('...') below; the caller
  // then falls through to the thumbnail and finally to the grey placeholder,
  // which is the existing "this paint has no usable bitmap" path.
  if (!IMAGE_HASH_ALLOWED.test(String(hashHex))) return null;
  const file = state.path.join(state.directory, 'images', hashHex);
  return state.fs.existsSync(file) ? `images/${hashHex}` : null;
}

function paintCss(p, state) {
  // returns {image, color} pieces for background stack
  if (p.visible === false) return null;
  if (p.type === 'SOLID') return { color: cssColor(p.color, p.opacity) };
  if (p.type === 'IMAGE') {
    let f = p.image && imageFile(p.image.hash, state);
    if (!f && p.imageThumbnail) f = imageFile(p.imageThumbnail.hash, state);
    if (!f) return { color: 'rgba(200,200,200,0.5)' };
    const size =
      p.imageScaleMode === 'FIT'
        ? 'contain'
        : p.imageScaleMode === 'STRETCH'
          ? '100% 100%'
          : p.imageScaleMode === 'TILE'
            ? 'auto'
            : 'cover';
    const repeat = p.imageScaleMode === 'TILE' ? 'repeat' : 'no-repeat';
    return { image: `url('${cssStr(f)}')`, size, repeat, position: 'center', opacity: p.opacity };
  }
  if (
    p.type === 'GRADIENT_LINEAR' ||
    p.type === 'GRADIENT_RADIAL' ||
    p.type === 'GRADIENT_ANGULAR' ||
    p.type === 'GRADIENT_DIAMOND'
  ) {
    const stops = (p.stops || [])
      .map(s => `${cssColor(s.color, p.opacity)} ${Math.round((s.position || 0) * 100)}%`)
      .join(', ');
    if (!stops) return null;
    if (p.type === 'GRADIENT_LINEAR') {
      let deg = 180;
      if (p.transform) deg = 90 + (Math.atan2(p.transform.m10 || 0, p.transform.m00 || 1) * 180) / Math.PI;
      return {
        image: `linear-gradient(${Math.round(deg)}deg, ${stops})`,
        size: 'auto',
        repeat: 'no-repeat',
        position: '0 0',
      };
    }
    return { image: `radial-gradient(circle at center, ${stops})`, size: 'auto', repeat: 'no-repeat', position: '0 0' };
  }
  return null;
}

function backgroundCss(paints, state) {
  if (!paints || !paints.length) return '';
  const layers = [];
  let solid = null;
  for (const p of paints) {
    const r = paintCss(p, state);
    if (!r) continue;
    if (r.color !== undefined && !r.image)
      solid = r.color; // last solid wins as base
    else if (r.image) layers.push(r);
  }
  let css = '';
  if (layers.length) {
    // css background layers: first = topmost; figma paints: last = topmost → reverse
    const rev = layers.slice().reverse();
    css += `background-image:${rev.map(l => l.image).join(',')};`;
    css += `background-size:${rev.map(l => l.size || 'cover').join(',')};`;
    css += `background-repeat:${rev.map(l => l.repeat || 'no-repeat').join(',')};`;
    css += `background-position:${rev.map(l => l.position || 'center').join(',')};`;
  }
  if (solid !== null) css += `background-color:${solid};`;
  return css;
}

function radiusCss(n) {
  if (n.type === 'ELLIPSE') return 'border-radius:50%;';
  const tl = n.rectangleTopLeftCornerRadius,
    tr = n.rectangleTopRightCornerRadius,
    br = n.rectangleBottomRightCornerRadius,
    bl = n.rectangleBottomLeftCornerRadius;
  if (tl != null || tr != null || br != null || bl != null)
    return `border-radius:${cssNum(tl)}px ${cssNum(tr)}px ${cssNum(br)}px ${cssNum(bl)}px;`;
  if (n.cornerRadius) return `border-radius:${cssNum(n.cornerRadius)}px;`;
  return '';
}

function effectsCss(n) {
  const shadows = [];
  let filter = '';
  for (const e of n.effects || []) {
    if (e.visible === false) continue;
    if (e.type === 'DROP_SHADOW')
      shadows.push(
        `${cssNum(e.offset && e.offset.x)}px ${cssNum(e.offset && e.offset.y)}px ${cssNum(e.radius)}px ${cssNum(e.spread)}px ${cssColor(e.color || { r: 0, g: 0, b: 0, a: 0.25 })}`
      );
    if (e.type === 'INNER_SHADOW')
      shadows.push(
        `inset ${cssNum(e.offset && e.offset.x)}px ${cssNum(e.offset && e.offset.y)}px ${cssNum(e.radius)}px ${cssNum(e.spread)}px ${cssColor(e.color || { r: 0, g: 0, b: 0, a: 0.25 })}`
      );
    if (e.type === 'FOREGROUND_BLUR') filter += `filter:blur(${(e.radius || 0) / 2}px);`;
    if (e.type === 'BACKGROUND_BLUR') filter += `backdrop-filter:blur(${(e.radius || 0) / 2}px);`;
  }
  return (shadows.length ? `box-shadow:${shadows.join(',')};` : '') + filter;
}

function strokeCss(n) {
  const paints = (n.strokePaints || []).filter(p => p.visible !== false && p.type === 'SOLID');
  if (!paints.length) return '';
  const color = cssColor(paints[0].color, paints[0].opacity);
  const w = n.strokeWeight != null ? n.strokeWeight : 1;
  // per-side?
  const t = n.borderTopWeight,
    r = n.borderRightWeight,
    b = n.borderBottomWeight,
    l = n.borderLeftWeight;
  if (t != null || r != null || b != null || l != null) {
    let css = '';
    if (t) css += `border-top:${cssNum(t)}px solid ${color};`;
    if (r) css += `border-right:${cssNum(r)}px solid ${color};`;
    if (b) css += `border-bottom:${cssNum(b)}px solid ${color};`;
    if (l) css += `border-left:${cssNum(l)}px solid ${color};`;
    return css; // box-sizing:border-box keeps size; children offset slightly — acceptable
  }
  if (n.strokeAlign === 'OUTSIDE') return `outline:${cssNum(w, 1)}px solid ${color};outline-offset:0px;`;
  return `box-shadow:inset 0 0 0 ${cssNum(w, 1)}px ${color};`;
}

function fontCss(n) {
  const fam = safeFontFamily(n.fontName && n.fontName.family);
  const style = (n.fontName ? n.fontName.style : '') || '';
  let weight = 400;
  const s = style.toLowerCase().replace(/\s/g, '');
  if (s.includes('thin')) weight = 100;
  else if (s.includes('extralight')) weight = 200;
  else if (s.includes('light')) weight = 300;
  else if (s.includes('semibold')) weight = 600;
  else if (s.includes('extrabold')) weight = 800;
  else if (s.includes('bold')) weight = 700;
  else if (s.includes('black')) weight = 900;
  else if (s.includes('medium')) weight = 500;
  const italic = s.includes('italic') ? 'font-style:italic;' : '';
  return `font-family:'${cssStr(fam)}',sans-serif;font-weight:${weight};${italic}`;
}

function textCss(n) {
  let css = fontCss(n);
  css += `font-size:${cssNum(n.fontSize || 14, 14)}px;`;
  const fill = (n.fillPaints || []).find(p => p.visible !== false && p.type === 'SOLID');
  css += `color:${fill ? cssColor(fill.color, fill.opacity) : '#000'};`;
  if (n.lineHeight) {
    if (n.lineHeight.units === 'PIXELS') css += `line-height:${cssNum(n.lineHeight.value)}px;`;
    else if (n.lineHeight.units === 'PERCENT' && n.lineHeight.value) css += `line-height:${n.lineHeight.value / 100};`;
    else css += 'line-height:1.2;';
  } else css += 'line-height:1.2;';
  if (n.letterSpacing && n.letterSpacing.value) {
    css +=
      n.letterSpacing.units === 'PIXELS'
        ? `letter-spacing:${cssNum(n.letterSpacing.value)}px;`
        : `letter-spacing:${n.letterSpacing.value / 100}em;`;
  }
  const ah = n.textAlignHorizontal;
  if (ah === 'CENTER') css += 'text-align:center;';
  else if (ah === 'RIGHT') css += 'text-align:right;';
  else if (ah === 'JUSTIFIED') css += 'text-align:justify;';
  const av = n.textAlignVertical;
  css += 'display:flex;flex-direction:column;';
  if (av === 'CENTER') css += 'justify-content:center;';
  else if (av === 'BOTTOM') css += 'justify-content:flex-end;';
  if (n.textCase === 'UPPER') css += 'text-transform:uppercase;';
  else if (n.textCase === 'LOWER') css += 'text-transform:lowercase;';
  else if (n.textCase === 'TITLE') css += 'text-transform:capitalize;';
  if (n.textDecoration === 'UNDERLINE') css += 'text-decoration:underline;';
  else if (n.textDecoration === 'STRIKETHROUGH') css += 'text-decoration:line-through;';
  return css;
}

// ---------- instance override machinery ----------
// stack of {baseDepth, map: Map<pathKey, overrideObj>, assigns: Map<defId, value>}
function buildOverrideMap(symbolData) {
  const m = new Map();
  for (const o of symbolData.symbolOverrides || []) {
    if (!o.guidPath || !o.guidPath.guids) continue;
    const key = o.guidPath.guids.map(gid).join('/');
    if (!m.has(key)) m.set(key, {});
    Object.assign(m.get(key), o);
  }
  return m;
}
function buildDerivedMap(derived) {
  const m = new Map();
  for (const o of derived || []) {
    if (!o.guidPath || !o.guidPath.guids) continue;
    const key = o.guidPath.guids.map(gid).join('/');
    if (!m.has(key)) m.set(key, {});
    Object.assign(m.get(key), o);
  }
  return m;
}
function buildAssigns(inst) {
  const m = new Map();
  for (const a of inst.componentPropAssignments || []) {
    if (a.defID) m.set(gid(a.defID), a.value);
  }
  return m;
}

const MAX_NODES = 250000;

function renderNodeClean(id, ctx, out, depth, state) {
  if (state.emitted > MAX_NODES || depth > 100) return;
  const orig = state.byId.get(id);
  if (!orig) return;
  let n = orig;
  let override = null,
    derived = null,
    overrideChars,
    swapSym = null;
  if (ctx.stack.length) {
    const ok = okey(orig);
    // innermost first, outermost LAST so outermost wins
    for (let li = ctx.stack.length - 1; li >= 0; li--) {
      const layer = ctx.stack[li];
      const rel = ctx.chain.slice(layer.baseLen).concat([ok]).join('/');
      const o = layer.map.get(rel);
      if (o) {
        override = Object.assign(override || {}, o);
        if (o.textData && o.textData.characters != null) overrideChars = o.textData.characters;
        if (o.overriddenSymbolID) swapSym = gid(o.overriddenSymbolID);
      }
      const d = layer.derived.get(rel);
      if (d) derived = Object.assign(derived || {}, d);
    }
  }
  if (override || derived) {
    n = Object.assign({}, orig, override || {}, derived || {});
    if (overrideChars != null) n.characters = overrideChars;
    if (swapSym) n._swapSymbol = swapSym;
  }
  if (orig.componentPropRefs) {
    for (const ref of orig.componentPropRefs) {
      const key = ref.defID ? gid(ref.defID) : null;
      if (!key) continue;
      for (let i = 0; i < ctx.stack.length; i++) {
        const layer = ctx.stack[i];
        if (layer.assigns.has(key)) {
          const v = layer.assigns.get(key);
          if (ref.componentPropNodeField === 'VISIBLE' && v && v.boolValue != null)
            n = Object.assign({}, n, { visible: v.boolValue });
          if (ref.componentPropNodeField === 'TEXT_DATA' && v && v.textValue != null) {
            const tv = v.textValue;
            n = Object.assign({}, n, { characters: tv && typeof tv === 'object' ? tv.characters || '' : tv });
          }
          if (ref.componentPropNodeField === 'OVERRIDDEN_SYMBOL_ID' && v && v.guidValue)
            n = Object.assign({}, n, { _swapSymbol: gid(v.guidValue) });
          break;
        }
      }
    }
  }
  if (n.visible === false) return;

  const t = n.transform || { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 };
  const w = n.size ? n.size.x : 0,
    h = n.size ? n.size.y : 0;
  const isRoot = depth === 0;
  let style = isRoot
    ? `position:relative;width:${cssNum(w)}px;height:${cssNum(h)}px;`
    : `position:absolute;left:0;top:0;width:${cssNum(w)}px;height:${cssNum(h)}px;`;
  if (!isRoot) {
    const simple =
      Math.abs(t.m00 - 1) < 1e-6 && Math.abs(t.m11 - 1) < 1e-6 && Math.abs(t.m01) < 1e-6 && Math.abs(t.m10) < 1e-6;
    if (simple) style += `transform:translate(${cssNum(t.m02)}px,${cssNum(t.m12)}px);`;
    else
      style += `transform:matrix(${cssNum(t.m00, 1)},${cssNum(t.m10)},${cssNum(t.m01)},${cssNum(t.m11, 1)},${cssNum(t.m02)},${cssNum(t.m12)});transform-origin:0 0;`;
  }
  if (n.opacity != null && n.opacity < 1) style += `opacity:${cssNum(n.opacity, 1)};`;

  const type = n.type;
  const kids = state.children.get(id) || [];
  const title = esc((n.name || '') + ' ' + id);

  if (type === 'TEXT') {
    const chars = n.characters != null ? n.characters : (n.textData && n.textData.characters) || '';
    if (state.environment.DBG) {
      const rels = ctx.stack.map(l =>
        ctx.chain
          .slice(l.baseLen)
          .concat([okey(orig)])
          .join('/')
      );
      state.error(
        'TEXT',
        id,
        'ok=' + okey(orig),
        JSON.stringify(String(chars).slice(0, 20)),
        'chain=' + ctx.chain.join('>'),
        'rels=' + JSON.stringify(rels),
        'ovr=' + !!override
      );
    }
    style += 'box-sizing:border-box;' + textCss(n);
    out.push(
      `<div style="${style}" title="${title}"><span>${esc(chars).replace(/[\u2028\u2029]/g, '<br>')}</span></div>`
    );
    state.emitted++;
    return;
  }

  style += 'box-sizing:border-box;';
  style += backgroundCss(n.fillPaints, state);
  style += radiusCss(n);
  style += strokeCss(n);
  style += effectsCss(n);
  if (type === 'FRAME' || type === 'SYMBOL' || type === 'INSTANCE') {
    if (!n.frameMaskDisabled) style += 'overflow:hidden;';
  }
  if (type === 'LINE') {
    const sp = (n.strokePaints || []).find(p => p.visible !== false && p.type === 'SOLID');
    if (sp) style += `background-color:${cssColor(sp.color, sp.opacity)};height:${Math.max(1, n.strokeWeight || 1)}px;`;
  }
  if (
    (type === 'VECTOR' ||
      type === 'BOOLEAN_OPERATION' ||
      type === 'ELLIPSE' ||
      type === 'STAR' ||
      type === 'REGULAR_POLYGON') &&
    !kids.length
  ) {
    if (!/background/.test(style)) {
      const sp = (n.strokePaints || []).find(p => p.visible !== false && p.type === 'SOLID');
      if (sp)
        style += `box-shadow:inset 0 0 0 ${Math.max(1, n.strokeWeight || 1)}px ${cssColor(sp.color, sp.opacity)};`;
    }
  }

  out.push(`<div style="${style}" title="${title}">`);
  state.emitted++;

  const symId = n._swapSymbol || (type === 'INSTANCE' && n.symbolData ? gid(n.symbolData.symbolID) : null);
  if (symId) {
    const sym = state.byId.get(symId);
    if (sym) {
      const usf = (n.symbolData && n.symbolData.uniformScaleFactor) || 1;
      if (usf !== 1)
        out.push(
          `<div style="position:absolute;left:0;top:0;transform:scale(${cssNum(usf, 1)});transform-origin:0 0;">`
        );
      const newChain = ctx.chain.concat([okey(orig)]);
      const layer = {
        baseLen: newChain.length,
        map: buildOverrideMap(n.symbolData || {}),
        derived: buildDerivedMap(n.derivedSymbolData),
        assigns: buildAssigns(n),
      };
      const newStack = ctx.stack.concat([layer]);
      for (const c of state.children.get(symId) || []) {
        renderNodeClean(c.id, { chain: newChain, stack: newStack }, out, depth + 1, state);
      }
      if (usf !== 1) out.push('</div>');
    }
  } else {
    for (const c of kids) {
      renderNodeClean(c.id, ctx, out, depth + 1, state);
    }
  }
  out.push('</div>');
}

function createRenderer(directory, overrides = {}) {
  const state = {
    ...rendererDependencies(overrides),
    directory,
    emitted: 0,
  };
  ({ byId: state.byId, children: state.children } = loadNodes(directory, state));

  function renderFrame(frameId) {
    state.emitted = 0;
    const node = state.byId.get(frameId);
    if (!node) return null;
    const out = [];
    renderNodeClean(frameId, { chain: [], stack: [] }, out, 0, state);
    const html = `<!doctype html><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,100..1000&family=Outfit:wght@100..900&family=Work+Sans:wght@100..900&family=Plus+Jakarta+Sans:wght@200..800&family=Inter:wght@100..900&family=Roboto:wght@100..900&display=swap" rel="stylesheet">
<style>body{margin:0;background:#888;}*{box-sizing:border-box;}div{pointer-events:auto;}span{white-space:pre-wrap;}</style>
<body>${out.join('\n')}</body>`;
    return { emitted: state.emitted, frameId, html, name: node.name };
  }

  return { renderFrame };
}

function ensureImageLink(directory, outputDirectory, state) {
  const imageLink = state.path.join(outputDirectory, 'images');
  if (state.fs.existsSync(imageLink)) return;
  try {
    state.fs.symlinkSync(state.path.resolve(directory, 'images'), imageLink);
  } catch (error) {
    // Non-fatal: the HTML still renders, but every raster asset will be a broken image.
    state.warn(
      'could not link ' +
        imageLink +
        ' → ' +
        state.path.resolve(directory, 'images') +
        ' — ' +
        error.message +
        '; rendered pages will show broken images'
    );
  }
}

function renderFrames(directory, frameIds, overrides = {}) {
  if (typeof directory !== 'string' || !directory) throw new TypeError('render directory must be a non-empty path');
  if (!Array.isArray(frameIds)) throw new TypeError('render frame ids must be an array');
  const state = rendererDependencies(overrides);
  // Frame IDs name output files, so refuse them before loading any input or creating output state.
  const safeFrameIds = frameIds.map(frameId => state.assertSafeIdentifier(frameId, 'render frame id'));
  const renderer = createRenderer(directory, state);
  const outputDirectory = state.path.join(directory, 'render');
  state.fs.mkdirSync(outputDirectory, { recursive: true });
  ensureImageLink(directory, outputDirectory, state);
  const renderedFrames = [];

  for (const frameId of safeFrameIds) {
    const rendered = renderer.renderFrame(frameId);
    if (!rendered) {
      state.error('frame not found:', frameId);
      continue;
    }
    const fileName = `${frameId.replace(':', '_')}.html`;
    const output = state.path.join(outputDirectory, fileName);
    state.writeFileAtomically(output, rendered.html, {
      fs: state.fs,
      pid: state.pid,
      random: state.random,
    });
    state.log(
      `rendered ${frameId} "${rendered.name}" -> render/${fileName} (${rendered.emitted} nodes, ${Math.round(rendered.html.length / 1024)}KB)`
    );
    renderedFrames.push({ frameId, output });
  }
  return { frames: renderedFrames, outputDirectory };
}

function main(argv = process.argv.slice(2), overrides = {}) {
  if (!Array.isArray(argv)) throw new TypeError('render arguments must be an array');
  return renderFrames(argv[0], argv.slice(1), overrides);
}

if (require.main === module) main();

module.exports = {
  main,
  renderFrames,
  esc,
  cssNum,
  cssStr,
  safeFontFamily,
};
