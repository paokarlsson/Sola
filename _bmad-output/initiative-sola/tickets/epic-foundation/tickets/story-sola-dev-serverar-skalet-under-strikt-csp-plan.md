---
title: 'sola dev serverar skalet under strikt CSP'
type: 'feature'
ticket: '1'
created: '2026-10-26'
status: 'built'
baseline_revision: '0eb0d7d6d9dddf9cd06d01766f7c18917958b17b'
route: 'full'
route_source: 'auto'
risk: 'high'
review: 'quick'
review_source: 'pinned'
lenses_ran: [quick]
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/initiative-sola/tickets/epic-foundation/epic-foundation.md'
warnings: [oversized]
deferred: []
---

<intent-contract>

## Intent

**Problem:** The repo has no code. Every later story needs `package.json`, the empty `sola/sola.js`, the app shell in `example/web/` and a `sola dev` that serves it under strict CSP (AD-20) with deep links answered by `index.html` (AD-5).

**Approach:** Add the zero-dependency `package.json`, the empty runtime, a three-file shell whose import map maps `#sola` to `/sola/sola.js`, and `sola dev` in `tools/sola.mjs`: an exported `startDev` built on `node:http` plus a thin CLI around it, with `node --test` tests beside the code.

## Boundaries & Constraints

**Always:**
- Zero dependencies (no `dependencies`, no `devDependencies`), no build step, only `node:` built-ins (AD-2).
- `tools/` never imports from `example/` and knows no app routes; `sola dev` is generic (AD-1, AD-5).
- `example/web/index.html` uses root-relative URLs only (`/app.js`, `/style.css`, `/sola/sola.js`); the import map is its only inline script; no inline styles, no inline event attributes, no HTML sinks anywhere (AD-15, AD-20).
- English identifiers, kebab-case file names (AD-11). Tests are `*.test.js` next to the code and run with plain `node --test`.
- CSP header on every HTML response, exactly: `default-src 'self'; script-src 'self' 'sha256-<base64>'; object-src 'none'; base-uri 'none'`, hash = SHA-256 (base64) of the exact text between `<script type="importmap">` and `</script>` in the body actually served. With no import map block, `script-src 'self'` alone.

**Never:**
- No `--api`/proxy (story 2), no reload client, file watching or `/__sola/` (story 3), no `example/server/`, no `api.js`, no exports in `sola.js`, no views or data (epic boundaries).
- No hardcoded hash and no hardcoded `index.html` content in `tools/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Root file | `GET /app.js` | 200, file bytes, `text/javascript; charset=utf-8` | — |
| Root index | `GET /` | 200, `<root>/index.html`, `text/html; charset=utf-8`, CSP with hash | — |
| Mount | `--mount /sola/=sola/`, `GET /sola/sola.js` | 200, `sola/sola.js` | Longest matching prefix wins |
| Deep link | `GET /providers/42`, `Accept: text/html,...` | 200, `<root>/index.html` with CSP | — |
| Missing asset | `GET /missing.js`, `Accept: */*` | 404 `text/plain` | — |
| Traversal | `GET /../package.json`, `/%2e%2e/x`, `/sola/..%2fpackage.json` | never a file outside root/mount dir; 404 (or `index.html` fallback when Accept has `text/html`) | Malformed percent-encoding → 400 |
| Directory | `GET /sub/` where `<root>/sub/index.html` exists | serves that `index.html` | Dir without `index.html` → treated as no file |
| Method | `POST /` | 405 with `Allow: GET, HEAD` | — |
| HEAD | `HEAD /app.js` | headers as GET, no body | — |
| Port | `startDev({ port: 0 })` | listens on a free port, returns it | `--port` invalid → CLI exits non-zero with usage |

</intent-contract>

## Code Map

Greenfield: only `README.md`, `docs/`, `_bmad*` exist. Nothing to reuse; do not touch `docs/` or `_bmad*`.

- `package.json` -- new. `"name": "sola"`, `"private": true`, `"type": "module"`, `"imports": { "#sola": "./sola/sola.js" }`, `"engines": { "node": ">=24.12" }`. No dependency fields, no scripts needed.
- `sola/sola.js` -- new, empty module (a one-line comment is fine). No exports.
- `sola/sola.test.js` -- new. `await import('#sola')` resolves in Node via `package.json` `imports`.
- `example/web/index.html` -- new shell: doctype, `lang="sv"`, charset, viewport, `<title>`, `<script type="importmap">{ "imports": { "#sola": "/sola/sola.js" } }</script>`, `<link rel="stylesheet" href="/style.css">`, `<script type="module" src="/app.js"></script>`, a static `<main>` with a short Swedish heading so the shell is visible.
- `example/web/app.js` -- new, `import '#sola';` only.
- `example/web/style.css` -- new, a few base rules (font, margin).
- `tools/sola.mjs` -- new. Exports `startDev({ root, mounts = [], port = 3000 })` → `Promise<{ port, url, close() }>`; `mounts` is `[{ prefix: '/sola/', dir: 'sola/' }]`. CLI part runs only under `if (import.meta.main)` and parses `dev <root> [--mount <prefix>=<dir>]... [--port <n>]` with `node:util` `parseArgs` (strict; unknown flags or missing root → usage on stderr, exit 1), then prints the URL.
- `tools/sola.test.js` -- new. Builds fixture dirs with `fs.mkdtemp` under `os.tmpdir()`, starts `startDev` on port 0, uses global `fetch`, closes in `after`.

## Tasks & Acceptance

**Execution:**
- [x] `package.json` -- create as in Code Map -- `#sola` resolution in Node, ESM, zero deps.
- [x] `sola/sola.js`, `sola/sola.test.js` -- create empty runtime and its import test -- R6.
- [x] `example/web/index.html`, `example/web/app.js`, `example/web/style.css` -- create the shell -- R6, the shell Pao opens.
- [x] `tools/sola.mjs` -- implement `startDev` and the CLI per the I/O matrix: resolve root/mount dirs to absolute paths; decode the pathname, map it under the longest matching mount prefix else the root, reject any resolved path not inside its base dir; serve files with a small extension → content-type table (html, js, mjs, css, json, svg, png, jpg, ico, webp, woff2, txt; else `application/octet-stream`) and `Cache-Control: no-store`; fall back to `<root>/index.html` for GET/HEAD with `text/html` in `Accept` when no file matches; add the CSP header to every `text/html` response, hash computed from that response body -- R2, R5.
- [x] `tools/sola.test.js` -- cover every row of the I/O matrix plus: CSP header equals the exact AD-20 string with the hash recomputed in the test from the served body; HTML without import map gets no hash -- R7.

**Acceptance Criteria:**
- Given a fresh clone with no `node_modules`, when `node --test` runs at the repo root, then all tests pass and nothing was installed.
- Given `node tools/sola.mjs dev example/web --mount /sola/=sola/`, when a browser opens `http://localhost:3000/` and `http://localhost:3000/providers/1`, then both show the shell heading, `/sola/sola.js` is requested and loads through the import map, and the console shows no errors and no `securitypolicyviolation` fires (implementer checks with the pre-installed Playwright Chromium from a scratch script outside the repo; Pao repeats it by hand).
- Given `node tools/sola.mjs dev example/web --port 3100`, when `curl -i http://localhost:3100/` runs, then the response is the shell with the AD-20 CSP header.
- Given the CLI, when it runs as `node tools/sola.mjs dev` with no root, or with an unknown flag such as `--api x`, then usage is printed on stderr and the exit code is 1.

## Implementation Notes

- Import-map hash: computed per `<script type="importmap">…</script>` block of the served body after CRLF/CR → LF, because the HTML parser normalises newlines before the browser hashes the script text. Whitespace is otherwise untouched. Several import maps would each add a hash; with one block the header is exactly the AD-20 string.
- Path mapping uses the raw request path (no WHATWG normalisation), `decodeURIComponent` (URIError → 400), `path.join` under the longest mount prefix, then a containment check against the base dir. Files are resolved with `realpath` and checked again, so a symlink inside root pointing outside is treated as no file. NUL in the decoded path → no file.
- Mount prefixes are normalised to start and end with `/`. `close()` also closes keep-alive connections so tests do not hang.
- Verified with Node 22.22 (the only runtime in the build container; `import.meta.main` is available there). `engines` still says `>=24.12` as planned.
- Browser check: headless Chromium (Playwright from /opt/node-tools) on `/` and `/providers/1` — heading shown, `/sola/sola.js` 200, no console errors, no `securitypolicyviolation`. A deliberately wrong hash was confirmed to trigger a violation, so the check is not vacuous.

## Plan Change Log

## Review Triage Log

### 2026-10-26 — Review pass
- verdicts: 3 findings — high 0, medium 1, low 2, false 0, maybe-false 0
- findings:
  - `[medium]` `[patch]` `tools/sola.mjs` IMPORT_MAP only matched lowercase `<script type="importmap">` with double quotes and no other attributes, so other valid forms got no hash and the browser blocked the import map silently; the test reused the same regex — fixed: regex is case-insensitive and tolerant of quote style, extra attributes and whitespace in both tags; six new tests compute the expected hash from literal inner text (verified failing against the old regex).
  - `[low]` `[reject]` `--mount /=dir/` is silently shadowed by the root base — real, but mounting on `/` is not an everyday use of `sola dev` and the fix adds a validation branch.
  - `[low]` `[reject]` absolute-form request targets (`GET http://host/path`) get 400 — real per RFC 9112, but browsers talking directly to the dev server never send it and the fix adds URL-parsing branches.

## Design Notes

- Import maps take bare specifiers as keys, so `"#sola"` is valid there, and Node resolves the same specifier through `package.json` `imports` — one specifier in both runtimes (AD-3).
- The hash must be over the bytes the browser sees between the tags, whitespace included; compute it from the served string, not a normalised one.
- Listen without a host argument (dual-stack), so `localhost` works over IPv4 and IPv6.
- Story 2 adds `--api` and story 3 the reload client to the same request handler: keep routing in one function where an early `/api/` and `/__sola/` branch can be added later, but do not add them now.

## Verification

**Commands:**
- `node --test` -- expected: all tests pass.
- `node tools/sola.mjs dev example/web --mount /sola/=sola/ --port 3100 &` then `curl -si http://localhost:3100/providers/1 -H 'Accept: text/html'` and `curl -si http://localhost:3100/sola/sola.js` -- expected: 200 shell with CSP header; 200 JS.
- `grep -rnE 'innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(' sola example` -- expected: no matches.

**Manual checks (if no CLI):**
- Pao opens the shell and a deep link in the browser and sees no CSP errors in the console.

## Auto Run Result

**Summary:** Added the zero-dependency `package.json`, the empty `sola/sola.js`, the three-file shell in `example/web/` and `sola dev` in `tools/sola.mjs`. `sola dev` serves the root and its mounts, answers deep links that accept HTML with `index.html`, sends the AD-20 CSP header hashed from the served import map, and listens on `--port` (default 3000). `startDev({ port: 0 })` is exported for tests and for stories 2 and 3.

**Files changed:**
- `package.json` -- ESM, `#sola` via `imports`, `engines` node >=24.12, no dependencies.
- `sola/sola.js` -- empty runtime module.
- `sola/sola.test.js` -- `#sola` imports in Node.
- `example/web/index.html` -- the shell, with the import map as its only inline script and root-relative URLs.
- `example/web/app.js` -- `import '#sola';`.
- `example/web/style.css` -- base styles.
- `tools/sola.mjs` -- `startDev` plus a thin, strictly parsed CLI under `import.meta.main`.
- `tools/sola.test.js` -- 45 tests covering every I/O matrix row, the CSP hash, import-map tag variants and CLI usage errors.

**Review findings:** patches applied: 1 (medium, import-map detection). Deferred: none. Rejected: 2 low (a mount on `/` is shadowed by the root; absolute-form request targets get 400), both because the case is not everyday dev-server use and the fix would add guard branches.

**Follow-up review recommendation:** false. One medium entry was patched (high 0, medium 1, low 0).

**Verification:**
- `node --test` passes 46 of 46.
- `curl` on `/providers/1` with `Accept: text/html` returns the shell with the AD-20 header and a real hash; `/sola/sola.js` returns 200.
- The CLI with `--api` or with no root prints usage and exits 1.
- The HTML-sink grep finds nothing in `sola` or `example`.
- Headless Chromium on `/` and `/providers/1` shows the heading, loads `/sola/sola.js` through the import map, and reports no console errors or CSP violations.

**Residual risks:**
- Only Node 22.22 was available; Node 24.12 is untested.
- Pao's manual browser check on port 3000 is still outstanding (HITL).
- Symlinks that point outside the served folders are refused on purpose.
