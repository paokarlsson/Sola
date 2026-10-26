#!/usr/bin/env node
// sola: developer tooling. For now only `sola dev`, a static server for an app
// shell under strict CSP (AD-5, AD-20). Uses node: built-ins only (AD-2).

import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { readFile, realpath, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { parseArgs } from 'node:util';

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

// Any `<script>` whose type is importmap (any case, any or no quotes, other
// attributes allowed); group 2 is the exact inner text up to `</script\s*>`.
const IMPORT_MAP = /<script(?=[\s>])[^>]*?\stype\s*=\s*(["']?)\s*importmap\s*\1(?=[\s/>])[^>]*>([\s\S]*?)<\/script\s*>/gi;

/**
 * Builds the AD-20 Content-Security-Policy for an HTML body. The hash covers the
 * exact text between `<script type="importmap">` and `</script>`, after the
 * newline normalisation every HTML parser applies (CRLF and CR become LF).
 */
function contentSecurityPolicy(html) {
  const hashes = [...html.matchAll(IMPORT_MAP)].map(([, , text]) => {
    const parsed = text.replace(/\r\n?/g, '\n');
    return ` 'sha256-${createHash('sha256').update(parsed, 'utf8').digest('base64')}'`;
  });
  return `default-src 'self'; script-src 'self'${hashes.join('')}; object-src 'none'; base-uri 'none'`;
}

/**
 * Starts the dev server.
 * @param {{ root: string, mounts?: { prefix: string, dir: string }[], port?: number }} options
 * @returns {Promise<{ port: number, url: string, close: () => Promise<void> }>}
 */
export async function startDev({ root, mounts = [], port = 3000 }) {
  const rootDir = await realDirectory(root);
  const bases = [{ prefix: '/', dir: rootDir }];
  for (const mount of mounts) {
    bases.push({ prefix: normalisePrefix(mount.prefix), dir: await realDirectory(mount.dir) });
  }
  bases.sort((a, b) => b.prefix.length - a.prefix.length);

  const server = createServer((request, response) => {
    handle(request, response, { rootDir, bases }).catch((error) => {
      if (response.headersSent) {
        response.destroy(error);
      } else {
        sendText(request, response, 500, 'Internal Server Error');
      }
    });
  });

  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    // No host argument: listen dual-stack so localhost works over IPv4 and IPv6.
    server.listen(port, () => {
      server.off('error', rejectListen);
      resolveListen();
    });
  });

  const actualPort = server.address().port;
  return {
    port: actualPort,
    url: `http://localhost:${actualPort}/`,
    close() {
      return new Promise((resolveClose, rejectClose) => {
        server.close((error) => (error ? rejectClose(error) : resolveClose()));
        server.closeAllConnections();
      });
    },
  };
}

// All routing lives here. Later stories add their early branches (`/api/`,
// `/__sola/`) before the static lookup.
async function handle(request, response, { rootDir, bases }) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    sendText(request, response, 405, 'Method Not Allowed');
    return;
  }

  const rawPath = request.url.split(/[?#]/, 1)[0];
  if (!rawPath.startsWith('/')) {
    sendText(request, response, 400, 'Bad Request');
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(rawPath);
  } catch {
    sendText(request, response, 400, 'Bad Request');
    return;
  }

  const file = await findFile(pathname, bases);
  if (file) {
    await sendFile(request, response, file);
    return;
  }

  if (acceptsHtml(request)) {
    const index = await regularFile(join(rootDir, 'index.html'), rootDir);
    if (index) {
      await sendFile(request, response, index);
      return;
    }
  }

  sendText(request, response, 404, 'Not Found');
}

// Maps a decoded pathname under the longest matching mount prefix (else the
// root) and returns a regular file inside that base directory, or null.
async function findFile(pathname, bases) {
  if (pathname.includes('\0')) return null;
  const base = bases.find(({ prefix }) => pathname.startsWith(prefix));
  const target = join(base.dir, pathname.slice(base.prefix.length));
  if (!isInside(target, base.dir)) return null;

  let info;
  try {
    info = await stat(target);
  } catch {
    return null;
  }
  if (info.isDirectory()) return regularFile(join(target, 'index.html'), base.dir);
  return regularFile(target, base.dir);
}

// Resolves symlinks and returns the real path only if it is a regular file that
// still lies inside `baseDir`.
async function regularFile(path, baseDir) {
  try {
    const real = await realpath(path);
    if (!isInside(real, baseDir)) return null;
    const info = await stat(real);
    return info.isFile() ? real : null;
  } catch {
    return null;
  }
}

function isInside(path, dir) {
  return path === dir || path.startsWith(dir.endsWith(sep) ? dir : dir + sep);
}

async function sendFile(request, response, path) {
  const type = CONTENT_TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream';
  const body = await readFile(path);
  response.statusCode = 200;
  response.setHeader('Content-Type', type);
  if (type.startsWith('text/html')) {
    response.setHeader('Content-Security-Policy', contentSecurityPolicy(body.toString('utf8')));
  }
  send(request, response, body);
}

function sendText(request, response, status, text) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'text/plain; charset=utf-8');
  send(request, response, Buffer.from(`${text}\n`));
}

function send(request, response, body) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Length', body.length);
  response.end(request.method === 'HEAD' ? undefined : body);
}

function acceptsHtml(request) {
  return (request.headers.accept ?? '').toLowerCase().includes('text/html');
}

function normalisePrefix(prefix) {
  let normalised = prefix.startsWith('/') ? prefix : `/${prefix}`;
  if (!normalised.endsWith('/')) normalised += '/';
  return normalised;
}

async function realDirectory(dir) {
  const real = await realpath(resolve(dir));
  if (!(await stat(real)).isDirectory()) throw new Error(`Not a directory: ${dir}`);
  return real;
}

// CLI ----------------------------------------------------------------------

const USAGE = 'Usage: node tools/sola.mjs dev <root> [--mount <prefix>=<dir>]... [--port <n>]';

function parseCli(args) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    strict: true,
    options: {
      mount: { type: 'string', multiple: true, default: [] },
      port: { type: 'string', default: '3000' },
    },
  });
  if (positionals.length !== 2 || positionals[0] !== 'dev') throw new Error('Expected: dev <root>');
  if (!/^\d+$/.test(values.port) || Number(values.port) > 65535) {
    throw new Error(`Invalid --port: ${values.port}`);
  }
  const mounts = values.mount.map((spec) => {
    const at = spec.indexOf('=');
    const prefix = spec.slice(0, at);
    const dir = spec.slice(at + 1);
    if (at < 1 || !prefix.startsWith('/') || dir === '') throw new Error(`Invalid --mount: ${spec}`);
    return { prefix, dir };
  });
  return { root: positionals[1], mounts, port: Number(values.port) };
}

if (import.meta.main) {
  let options;
  try {
    options = parseCli(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n${USAGE}\n`);
    process.exit(1);
  }
  try {
    const { url } = await startDev(options);
    process.stdout.write(`sola dev: ${url}\n`);
  } catch (error) {
    process.stderr.write(`sola dev: ${error.message}\n`);
    process.exit(1);
  }
}
