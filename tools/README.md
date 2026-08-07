# Tools — the `.fig` ↔ HTML pipeline

Plain Node (**≥ 22**, for `zlib.zstd*`) plus `kiwi-schema`, `pako` and `puppeteer-core`, and the
system `zip` / `unzip`. Nothing here talks to the Figma API — no account, no plugin, no token.

**Installation belongs in the target prototype, not in this repository.** The `package.json` and
`package-lock.json` beside these scripts declare and pin what the tools need; they do not make the
skills repository a Node project and nothing is ever installed into it. Copy the tools into the
prototype you are building and run `npm ci` there. The pinned versions are the current releases as
resolved when the manifest was written — the versions the tools were first developed against could
not be recovered, because no lockfile existed.

**`sips` is macOS-only.** It is used for one thing: shrinking `thumbnail` to the 400 px preview
image inside the `.fig`. On Linux or Windows the binary is simply absent, so `generate-fig.js`
prints one warning, embeds an 8-byte stub thumbnail and carries on. The exported file is valid and
imports normally; only the preview Figma shows for it is blank.

| Script | Direction | What it does |
|---|---|---|
| `decode.js` | `.fig` → JSON | Decodes `canvas.fig` to `nodes.jsonl` + `tree.txt` (page/frame tree with node ids) |
| `inspect.js` | `.fig` → report | Fonts, colour histogram, design variables/tokens |
| `render.js` | `.fig` → HTML | Renders chosen frames to standalone HTML for reading a design in the browser |
| `dump-dom.js` | HTML → JSON | One page → absolute-positioned visual tree |
| `dump-frames.js` | HTML → JSON | Every frame in the manifest, in parallel, in export mode |
| `generate-fig.js` | JSON → `.fig` | All frames → one importable Figma file |

## Reading a `.fig` (no Figma account needed)

A `.fig` is a ZIP: `canvas.fig` (binary) + `images/` (raster assets, sha1-named) + `meta.json`.

1. `unzip file.fig -d dir/`
2. `node decode.js dir/ [depth]` — format is **fig-kiwi**: 8-byte magic, uint32 version, then
   length-prefixed chunks — chunk 0 is the kiwi schema (**deflate-raw**), chunk 1 is the message
   (**zstd**). Writes `dir/nodes.jsonl` (one node per line; image hashes as hex = filenames under
   `images/`) and `dir/tree.txt`.
3. `node inspect.js dir/` — fonts, colours, tokens. This is how a borrowed design system is read.
4. `node render.js dir/ <frameId>...` — renders frames to standalone HTML in `dir/render/`.
   Component instances are resolved properly: override matching is by **`overrideKey`-based
   guidPath**, walking the chain of instance boundaries (not the raw node tree), outermost
   overrides winning.

**Gotcha:** split `nodes.jsonl` only on raw `\n` bytes. Figma text content contains characters
that make Node's `readline` split lines in the wrong place.

## Writing a `.fig` (HTML → Figma)

```bash
cp tools/prototype.example.json prototype.json      # then edit rows/frames
unzip -o -j any-figma-export.fig canvas.fig -d tools/.schema/   # one-time schema donor
node tools/dump-frames.js prototype.json            # all frames → tools/dumps/
node tools/generate-fig.js prototype.json out.fig   # one importable file
```

- **The schema is copied verbatim** from a real Figma export (`schemaFrom`). Any file you exported
  from Figma works; the compressed bytes are passed through untouched, never re-encoded.
- **Critical:** the data chunk must be **zstd**-compressed. With deflate, Figma's importer accepts
  the file and then hangs forever at "0 of 1 files" with no error message.
- **`?nopanel=1` is appended to every dump** — export mode: the prototype settings panel is not
  built and fixed bars join the normal flow. Without it the bars are captured at the bottom edge of
  the capture window, which lands in the middle of a several-thousand-pixel-tall frame.
- **States are frames.** A frame entry is a page plus the query params that pin its demo state
  (`?auth=in`, `?density=b`, `?inv=few`), so every variant exports without a click.
- Single-line texts are exported with `textAutoResize: WIDTH_AND_HEIGHT` so nothing re-wraps.
- Rows are laid out top to bottom, frames left to right; row height comes from the tallest frame.
- **Importing:** drag the `.fig` onto the Figma home screen. The first open right after an import
  sometimes sticks on the loading bar — one reload fixes it.

## Environment

- `CHROME_PATH` — Chrome/Chromium binary for `dump-dom.js` (defaults to the macOS app path).
- `JOBS` — parallel dumps in `dump-frames.js` (default 3; each one is a headless Chrome). It must be a
  finite integer from 1 through 16. The tool resolves it from `JOBS`, then manifest `jobs`, then the
  default; an explicit invalid value stops before it creates the dumps directory or starts Chrome.
- `FRAME_TIMEOUT_MS` — per-frame bound in `dump-frames.js` (default 90000; `frameTimeoutMs` in the
  manifest does the same). It must be a finite integer from 1000 through 300000 milliseconds, resolved
  from the environment, manifest, then default. A frame costs ~2-6 s of Chrome and `dump-dom.js`
  already bounds its own navigation at 60 s, so the default only fires on a child that has hung past its
  own timeout. That child is SIGKILLed and counted as one failed frame, instead of stalling the whole
  export forever.

## Node coverage evidence

`npm run test:coverage` keeps the child Node test transcript outside the
repository before it evaluates the coverage ratchet. A passing run prints one
bounded JSON receipt whose `evidence_path`, `evidence_digest`, `evidence_bytes`,
and `tests` fields identify the retained transcript. The path is always the
actual external file used by that run, so both default and caller-selected
evidence are retrievable without replaying child output.

Illustrative shape only — the `tests` count below is not the current live count,
which moves as the suite grows; read a fresh run's own receipt for that number:

```json
{"schema":"design-prototype/node-coverage-receipt/v1","status":"passed","tests":56,"evidence_path":"/private/tmp/node-coverage.log","evidence_digest":"sha256:…","evidence_bytes":11543}
```

By default it creates a fresh, private directory under the system temporary
directory and names that file in the receipt. To retain the transcript at a
known location, pass a fresh absolute path whose existing parent is outside the
repository:

```bash
node quality/run-node-coverage.js --evidence-file /private/tmp/node-coverage.log
```

The command refuses relative, in-tree, or pre-existing evidence paths before
starting the child test process. The file contains the exact captured `stdout`
bytes followed by the exact captured `stderr` bytes. On a child or ratchet
failure, no success receipt is printed; stderr contains the digest-backed header
and only the final 2 KiB of the transcript, the complete bytes remain in the
external evidence file, and the command remains nonzero.

### Renderer executable-quality ratchet

`render.js` is owned by the design-prototype conversion boundary. Its public
`main(argv, overrides)` and `renderFrames(directory, frameIds, overrides)` paths
accept injected filesystem, path, logging and environment seams, so the
executable-quality tests exercise conversion without a browser, Firebase or a
network call.

The initial `render.js` floor was measured locally on Node 25.8.2 from the
retained coverage transcript: 64 tests, 62.98% lines, 37.31% branches and
56.76% functions — a one-time historical record of how the floor was first
derived, not the floor the gate enforces today. **The enforced floor is not
restated here.** `quality/executable-quality-baseline.json` is the single
source of truth for every one of those numbers — `node.minimum_tests` for the
suite-count floor, `node.required_files["render.js"]` for the renderer's own
lines/branches/functions floors. Copying a number out of that file and into
this prose is exactly how a maintainer ends up defending a floor the gate no
longer enforces; read the JSON directly instead. The local Node 25 reading
above is not evidence of a Node 22 CI run — keep the first Node 22 coverage
receipt as CI evidence before raising the baseline.
