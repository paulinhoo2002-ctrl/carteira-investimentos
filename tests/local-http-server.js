const http = require('node:http');
const fsp = require('node:fs/promises');
const path = require('node:path');

async function startLocalHttpServer(root) {
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url || '/', 'http://127.0.0.1').pathname);
      const filePath = path.normalize(path.join(root, pathname === '/' ? '/index.html' : pathname));
      if (!filePath.startsWith(root)) {
        res.writeHead(403);
        return res.end();
      }
      res.writeHead(200, {
        'Content-Type': path.extname(filePath) === '.html' ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8',
      });
      res.end(await fsp.readFile(filePath));
    } catch {
      res.writeHead(404);
      res.end();
    }
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}/index.html?testMode=1` };
}

module.exports = { startLocalHttpServer };
