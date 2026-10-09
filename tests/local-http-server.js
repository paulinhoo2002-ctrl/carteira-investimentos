const http = require('node:http');
const fsp = require('node:fs/promises');
const path = require('node:path');

// Ports Chromium refuses to navigate (net::ERR_UNSAFE_PORT blocklist subset
// relevant to the Windows ephemeral range, which starts at 1024).
const UNSAFE_CHROME_PORTS = new Set([
  1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53, 69, 77, 79,
  87, 95, 101, 102, 103, 104, 107, 109, 110, 111, 113, 115, 117, 119, 123, 135,
  137, 139, 143, 161, 179, 389, 427, 465, 512, 513, 514, 515, 526, 530, 531,
  532, 540, 548, 554, 556, 563, 587, 601, 636, 993, 995, 1719, 1720, 1723,
  2049, 3659, 4045, 5060, 5061, 6000, 6566, 6665, 6666, 6667, 6668, 6669,
  6697, 10080,
]);

function isUnsafeChromePort(port) {
  return UNSAFE_CHROME_PORTS.has(Number(port));
}

async function listenOnBrowserSafePort(server) {
  const MAX_ATTEMPTS = 16;
  for (let attempt = 1; ; attempt++) {
    const port = await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => resolve(server.address().port));
    });
    if (!isUnsafeChromePort(port)) return port;
    server.close();
    if (attempt >= MAX_ATTEMPTS) throw new Error(`Unable to allocate a browser-safe port after ${MAX_ATTEMPTS} attempts (last: ${port}).`);
  }
}

async function startLocalHttpServer(root, port = 0, { syntheticQa = true } = {}) {
  const documentRoot = path.resolve(root);
  const server = http.createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url || '/', 'http://127.0.0.1');
      const pathname = decodeURIComponent(requestUrl.pathname);
      if (pathname === '/api/yahoo-quote') {
        const requested = String(requestUrl.searchParams.get('symbols') || requestUrl.searchParams.get('tickers') || '')
          .split(',').map(symbol => symbol.trim().toUpperCase()).filter(Boolean).slice(0, 50);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        return res.end(JSON.stringify({ source: 'synthetic-qa-empty', requested, count: 0, results: [] }));
      }
      const filePath = path.resolve(documentRoot, pathname === '/' ? 'index.html' : `.${pathname}`);
      const relativePath = path.relative(documentRoot, filePath);
      if (relativePath === '..' || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
        res.writeHead(403);
        return res.end();
      }
      let content = await fsp.readFile(filePath);
      if (syntheticQa && path.extname(filePath) === '.html') {
        const html = content.toString('utf8');
        const head = /<head(?:\s[^>]*)?>/i;
        if (!head.test(html)) throw new Error('Synthetic QA runtime marker could not be injected.');
        content = Buffer.from(html.replace(head, match => `${match}\n<script>Object.defineProperty(window,'__LOCAL_QA_RUNTIME__',{value:'local-synthetic-v1',writable:false,configurable:false});</script>`), 'utf8');
      }
      res.writeHead(200, {
        'Content-Type': path.extname(filePath) === '.html' ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8',
        ...(syntheticQa && path.extname(filePath) === '.html' ? { 'Cache-Control': 'no-store' } : {}),
      });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });

  if (port === 0) {
    // listen(0) on Windows can return a Chromium-blocked port (ERR_UNSAFE_PORT);
    // retry until the OS hands out a browser-safe one.
    await listenOnBrowserSafePort(server);
  } else {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, '127.0.0.1', resolve);
    });
  }
  const query = syntheticQa ? '?testMode=1' : '';
  return { server, url: `http://127.0.0.1:${server.address().port}/index.html${query}` };
}

module.exports = { startLocalHttpServer, isUnsafeChromePort };

if (require.main === module) {
  const portIndex = process.argv.indexOf('--port');
  const port = portIndex >= 0 ? Number(process.argv[portIndex + 1]) : 4173;
  const syntheticQa = process.argv.includes('--synthetic-qa');
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    console.error('Port must be an integer between 0 and 65535.');
    process.exitCode = 1;
  } else {
    startLocalHttpServer(process.cwd(), port, { syntheticQa })
      .then(({ url }) => console.log(`QA server listening: ${url}`))
      .catch(error => {
        console.error(`QA server failed to start: ${error.message}`);
        process.exitCode = 1;
      });
  }
}
