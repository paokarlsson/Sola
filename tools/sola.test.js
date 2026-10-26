import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { request as httpRequest } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startDev } from './sola.mjs';

const CLI = fileURLToPath(new URL('./sola.mjs', import.meta.url));
const INDEX_HTML = [
  '<!doctype html>',
  '<html lang="sv">',
  '<head>',
  '<script type="importmap">',
  '  { "imports": { "#sola": "/sola/sola.js" } }',
  '</script>',
  '</head>',
  '<body><main><h1>Root</h1></main></body>',
  '</html>',
  '',
].join('\n');
// Import-map tag variants the browser accepts; `inner` is the literal text the
// browser hashes, so the expected hash never goes through the server's regex.
const IMPORT_MAP_FORMS = [
  { name: 'single-quotes', open: "<script type='importmap'>", close: '</script>' },
  { name: 'unquoted', open: '<script type=importmap>', close: '</script>' },
  { name: 'uppercase', open: '<SCRIPT TYPE="IMPORTMAP">', close: '</SCRIPT>' },
  { name: 'extra-attributes', open: '<script data-x="1" type="importmap" nonce="n">', close: '</script>' },
  { name: 'whitespace', open: '<script\n  type = "importmap"\n>', close: '</script >' },
].map((form) => ({ ...form, inner: ` { "imports": { "#${form.name}": "/x.js" } } ` }));
const NOT_IMPORT_MAPS = [
  '<script type="module">{ "imports": {} }</script>',
  '<script data-type="importmap">{ "imports": {} }</script>',
];

const HTML_ACCEPT = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';

// The policy AD-20 requires, with the hash recomputed here from the served body.
function expectedPolicy(html) {
  const match = html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
  const scriptSrc = match
    ? `script-src 'self' 'sha256-${createHash('sha256').update(match[1].replace(/\r\n?/g, '\n')).digest('base64')}'`
    : "script-src 'self'";
  return `default-src 'self'; ${scriptSrc}; object-src 'none'; base-uri 'none'`;
}

// Sends the path exactly as given (fetch would normalise `..` segments away).
function rawRequest(port, path, { method = 'GET', headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = httpRequest({ host: 'localhost', port, path, method, headers }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.end();
  });
}

let fixture;
let dev;

before(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'sola-dev-'));
  const web = join(fixture, 'web');
  await mkdir(join(web, 'sub'), { recursive: true });
  await mkdir(join(web, 'empty-dir'), { recursive: true });
  await mkdir(join(fixture, 'lib', 'deep'), { recursive: true });
  await mkdir(join(fixture, 'deep-lib'), { recursive: true });

  await writeFile(join(fixture, 'secret.txt'), 'secret outside every base\n');
  await writeFile(join(web, 'index.html'), INDEX_HTML);
  await writeFile(join(web, 'app.js'), "import '#sola';\n");
  await writeFile(join(web, 'style.css'), 'body { margin: 0; }\n');
  await writeFile(join(web, 'plain.html'), '<!doctype html><title>Plain</title>\n');
  await writeFile(join(web, 'crlf.html'), '<!doctype html>\r\n<script type="importmap">{\r\n"imports": {}\r\n}</script>\r\n');
  for (const { name, open, close, inner } of IMPORT_MAP_FORMS) {
    await writeFile(join(web, `map-${name}.html`), `<!doctype html>\n${open}${inner}${close}\n`);
  }
  await writeFile(join(web, 'not-maps.html'), `<!doctype html>\n${NOT_IMPORT_MAPS.join('\n')}\n`);
  await writeFile(join(web, 'data.bin'), Buffer.from([0, 1, 2]));
  await writeFile(join(web, 'sub', 'index.html'), '<!doctype html><title>Sub</title>\n');
  await symlink(join(fixture, 'secret.txt'), join(web, 'link.txt'));
  await writeFile(join(fixture, 'lib', 'sola.js'), '// lib\n');
  await writeFile(join(fixture, 'lib', 'deep', 'x.js'), '// lib/deep\n');
  await writeFile(join(fixture, 'deep-lib', 'x.js'), '// deep-lib\n');

  dev = await startDev({
    root: web,
    mounts: [
      { prefix: '/sola/', dir: join(fixture, 'lib') },
      { prefix: '/sola/deep/', dir: join(fixture, 'deep-lib') },
    ],
    port: 0,
  });
});

after(async () => {
  await dev?.close();
  await rm(fixture, { recursive: true, force: true });
});

describe('startDev', () => {
  test('listens on a free port for port 0 and returns it', () => {
    assert.ok(dev.port > 0);
    assert.equal(dev.url, `http://localhost:${dev.port}/`);
  });

  test('serves a root file with its content type and no-store', async () => {
    const res = await fetch(new URL('/app.js', dev.url));
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'text/javascript; charset=utf-8');
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.equal(res.headers.get('content-security-policy'), null);
    assert.equal(await res.text(), "import '#sola';\n");
  });

  test('serves css and falls back to octet-stream for unknown extensions', async () => {
    const css = await fetch(new URL('/style.css', dev.url));
    assert.equal(css.headers.get('content-type'), 'text/css; charset=utf-8');
    const bin = await fetch(new URL('/data.bin', dev.url));
    assert.equal(bin.status, 200);
    assert.equal(bin.headers.get('content-type'), 'application/octet-stream');
    assert.deepEqual([...new Uint8Array(await bin.arrayBuffer())], [0, 1, 2]);
  });

  test('serves index.html on / with the AD-20 CSP header', async () => {
    const res = await fetch(dev.url);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'text/html; charset=utf-8');
    const body = await res.text();
    assert.equal(body, INDEX_HTML);
    const csp = res.headers.get('content-security-policy');
    assert.equal(csp, expectedPolicy(body));
    assert.match(csp, /^default-src 'self'; script-src 'self' 'sha256-[A-Za-z0-9+/]+=*'; object-src 'none'; base-uri 'none'$/);
  });

  test('hashes the import map exactly as served, whitespace included', async () => {
    const body = await (await fetch(dev.url)).text();
    const text = '\n  { "imports": { "#sola": "/sola/sola.js" } }\n';
    assert.ok(body.includes(`<script type="importmap">${text}</script>`));
    const hash = createHash('sha256').update(text).digest('base64');
    const res = await fetch(dev.url);
    assert.ok(res.headers.get('content-security-policy').includes(`'sha256-${hash}'`));
  });

  test('hashes CRLF line endings as the HTML parser sees them (LF)', async () => {
    const res = await fetch(new URL('/crlf.html', dev.url));
    const hash = createHash('sha256').update('{\n"imports": {}\n}').digest('base64');
    assert.equal(
      res.headers.get('content-security-policy'),
      `default-src 'self'; script-src 'self' 'sha256-${hash}'; object-src 'none'; base-uri 'none'`,
    );
  });

  for (const { name, inner } of IMPORT_MAP_FORMS) {
    test(`hashes an import map written as ${name}`, async () => {
      const res = await fetch(new URL(`/map-${name}.html`, dev.url));
      assert.equal(res.status, 200);
      const hash = createHash('sha256').update(inner).digest('base64');
      assert.equal(
        res.headers.get('content-security-policy'),
        `default-src 'self'; script-src 'self' 'sha256-${hash}'; object-src 'none'; base-uri 'none'`,
      );
    });
  }

  test('scripts that are not import maps get no hash', async () => {
    const res = await fetch(new URL('/not-maps.html', dev.url));
    assert.equal(
      res.headers.get('content-security-policy'),
      "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'",
    );
  });

  test('HTML without an import map gets script-src self and no hash', async () => {
    const res = await fetch(new URL('/plain.html', dev.url));
    assert.equal(res.status, 200);
    assert.equal(
      res.headers.get('content-security-policy'),
      "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'",
    );
  });

  test('serves a mounted directory on its prefix', async () => {
    const res = await fetch(new URL('/sola/sola.js', dev.url));
    assert.equal(res.status, 200);
    assert.equal(await res.text(), '// lib\n');
  });

  test('the longest matching mount prefix wins', async () => {
    const res = await fetch(new URL('/sola/deep/x.js', dev.url));
    assert.equal(res.status, 200);
    assert.equal(await res.text(), '// deep-lib\n');
  });

  test('answers a deep link that accepts HTML with index.html and CSP', async () => {
    const res = await fetch(new URL('/providers/42', dev.url), { headers: { accept: HTML_ACCEPT } });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'text/html; charset=utf-8');
    const body = await res.text();
    assert.equal(body, INDEX_HTML);
    assert.equal(res.headers.get('content-security-policy'), expectedPolicy(body));
  });

  test('a missing asset is 404 text/plain', async () => {
    const res = await fetch(new URL('/missing.js', dev.url), { headers: { accept: '*/*' } });
    assert.equal(res.status, 404);
    assert.equal(res.headers.get('content-type'), 'text/plain; charset=utf-8');
    assert.equal(res.headers.get('content-security-policy'), null);
  });

  test('a missing file under a mount is 404 without HTML in Accept', async () => {
    const res = await fetch(new URL('/sola/missing.js', dev.url), { headers: { accept: '*/*' } });
    assert.equal(res.status, 404);
  });

  test('a directory with index.html serves it', async () => {
    const res = await fetch(new URL('/sub/', dev.url));
    assert.equal(res.status, 200);
    assert.equal(await res.text(), '<!doctype html><title>Sub</title>\n');
    assert.ok(res.headers.get('content-security-policy'));
  });

  test('a directory without index.html is treated as no file', async () => {
    const asset = await fetch(new URL('/empty-dir/', dev.url), { headers: { accept: '*/*' } });
    assert.equal(asset.status, 404);
    const page = await fetch(new URL('/empty-dir/', dev.url), { headers: { accept: HTML_ACCEPT } });
    assert.equal(page.status, 200);
    assert.equal(await page.text(), INDEX_HTML);
  });

  for (const path of [
    '/../secret.txt',
    '/../../secret.txt',
    '/%2e%2e/secret.txt',
    '/..%2fsecret.txt',
    '/sola/..%2fsecret.txt',
    '/sola/..%2f..%2fsecret.txt',
    '/sola/%2e%2e/%2e%2e/secret.txt',
    '/sola/%2fetc%2fpasswd',
    '/link.txt',
    '/app.js%00.png',
  ]) {
    test(`traversal ${path} never leaves root or mount`, async () => {
      const asset = await rawRequest(dev.port, path, { headers: { accept: '*/*' } });
      assert.equal(asset.status, 404);
      assert.ok(!asset.body.includes('secret'));
      const page = await rawRequest(dev.port, path, { headers: { accept: HTML_ACCEPT } });
      assert.equal(page.status, 200);
      assert.equal(page.body, INDEX_HTML);
    });
  }

  test('malformed percent-encoding is 400', async () => {
    const res = await rawRequest(dev.port, '/%E0%A4%A.js');
    assert.equal(res.status, 400);
    const res2 = await rawRequest(dev.port, '/%zz', { headers: { accept: HTML_ACCEPT } });
    assert.equal(res2.status, 400);
  });

  test('POST is 405 with Allow: GET, HEAD', async () => {
    const res = await fetch(dev.url, { method: 'POST', body: 'x' });
    assert.equal(res.status, 405);
    assert.equal(res.headers.get('allow'), 'GET, HEAD');
  });

  test('HEAD sends the GET headers without a body', async () => {
    const get = await rawRequest(dev.port, '/app.js');
    const head = await rawRequest(dev.port, '/app.js', { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(head.body, '');
    for (const name of ['content-type', 'content-length', 'cache-control']) {
      assert.equal(head.headers[name], get.headers[name]);
    }
  });

  test('HEAD on an HTML deep link carries the CSP header', async () => {
    const head = await rawRequest(dev.port, '/providers/1', { method: 'HEAD', headers: { accept: HTML_ACCEPT } });
    assert.equal(head.status, 200);
    assert.equal(head.body, '');
    assert.equal(head.headers['content-security-policy'], expectedPolicy(INDEX_HTML));
  });

  test('query strings are ignored when mapping to a file', async () => {
    const res = await fetch(new URL('/app.js?v=1', dev.url));
    assert.equal(res.status, 200);
  });
});

describe('startDev without an index.html', () => {
  test('a deep link that accepts HTML is 404', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'sola-dev-empty-'));
    const server = await startDev({ root: dir, port: 0 });
    try {
      const res = await fetch(new URL('/providers/1', server.url), { headers: { accept: HTML_ACCEPT } });
      assert.equal(res.status, 404);
    } finally {
      await server.close();
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('rejects a root that does not exist', async () => {
    await assert.rejects(startDev({ root: join(tmpdir(), 'sola-dev-does-not-exist-'), port: 0 }));
  });
});

function runCli(args) {
  return new Promise((resolve) => {
    execFile(process.execPath, [CLI, ...args], { timeout: 10_000 }, (error, stdout, stderr) => {
      resolve({ code: error ? error.code : 0, stdout, stderr });
    });
  });
}

describe('CLI', () => {
  for (const args of [
    ['dev'],
    [],
    ['serve', 'x'],
    ['dev', 'x', '--api', 'http://localhost:3001'],
    ['dev', 'x', '--port', 'abc'],
    ['dev', 'x', '--port', '70000'],
    ['dev', 'x', '--mount', 'sola/'],
  ]) {
    test(`\`${args.join(' ')}\` prints usage on stderr and exits 1`, async () => {
      const { code, stdout, stderr } = await runCli(args);
      assert.equal(code, 1);
      assert.equal(stdout, '');
      assert.match(stderr, /Usage: node tools\/sola\.mjs dev <root>/);
    });
  }

  test('dev <root> --port 0 prints the URL and serves the root', async () => {
    const child = spawn(process.execPath, [CLI, 'dev', join(fixture, 'web'), '--mount', `/sola/=${join(fixture, 'lib')}`, '--port', '0']);
    try {
      const url = await new Promise((resolve, reject) => {
        let out = '';
        child.stdout.on('data', (chunk) => {
          out += chunk;
          const match = out.match(/http:\/\/localhost:\d+\//);
          if (match) resolve(match[0]);
        });
        child.on('exit', (code) => reject(new Error(`CLI exited with ${code}`)));
      });
      const res = await fetch(new URL('/sola/sola.js', url));
      assert.equal(res.status, 200);
      assert.equal(await res.text(), '// lib\n');
    } finally {
      child.kill();
    }
  });
});
