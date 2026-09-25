const http = require('node:http');
const fsp = require('node:fs/promises');
const path = require('node:path');

async function startLocalHttpServer(root, port = 0) {
  const documentRoot = path.resolve(root);
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url || '/', 'http://127.0.0.1').pathname);
      const filePath = path.resolve(documentRoot, pathname === '/' ? 'index.html' : `.${pathname}`);
      const relativePath = path.relative(documentRoot, filePath);
      if (relativePath === '..' || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
        res.writeHead(403);
        return res.end();
      }
      const content = await fsp.readFile(filePath);
      res.writeHead(200, {
        'Content-Type': path.extname(filePath) === '.html' ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8',
      });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  return { server, url: `http://127.0.0.1:${server.address().port}/index.html?testMode=1` };
}

module.exports = { startLocalHttpServer };

if (require.main === module) {
  const portIndex = process.argv.indexOf('--port');
  const port = portIndex >= 0 ? Number(process.argv[portIndex + 1]) : 4173;
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    console.error('Port must be an integer between 0 and 65535.');
    process.exitCode = 1;
  } else {
    startLocalHttpServer(process.cwd(), port)
      .then(({ url }) => console.log(`QA server listening: ${url}`))
      .catch(error => {
        console.error(`QA server failed to start: ${error.message}`);
        process.exitCode = 1;
      });
  }
}
