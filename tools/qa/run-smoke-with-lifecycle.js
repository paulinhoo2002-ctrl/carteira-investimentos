'use strict';

const { spawn } = require('node:child_process');
const path = require('node:path');
const { startLocalHttpServer } = require('../../tests/local-http-server.js');

const ROOT = path.join(__dirname, '..', '..');
const SMOKE_SCRIPT = path.join(ROOT, 'tools/qa/browser-smoke.js');

async function waitForServerReady(baseUrl, maxAttempts = 50) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(new URL('/index.html', baseUrl));
      if (response.status === 200) return;
    } catch {
      // ignore, retry
    }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error(`Server at ${baseUrl} not ready after ${maxAttempts * 100}ms`);
}

async function main() {
  const providedOrigin = process.env.QA_ORIGIN;
  let server = null;
  let serverOwned = false;
  let originToUse = providedOrigin;
  
  try {
    if (!providedOrigin) {
      // Auto-start local QA server on ephemeral port
      console.log('[qa:smoke] QA_ORIGIN not set, starting local QA server...');
      const { server: startedServer, url } = await startLocalHttpServer(ROOT, 0);
      server = startedServer;
      serverOwned = true;
      originToUse = url;
      console.log(`[qa:smoke] QA server listening: ${originToUse}`);
      
      // Wait for server readiness
      await waitForServerReady(originToUse);
      console.log('[qa:smoke] QA server ready');
    } else {
      console.log(`[qa:smoke] Using provided QA_ORIGIN: ${providedOrigin}`);
    }
    
    // Run smoke test with the determined origin
    const child = spawn(process.execPath, [SMOKE_SCRIPT], {
      cwd: ROOT,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, QA_ORIGIN: originToUse }
    });
    
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', chunk => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
    
    const exitCode = await new Promise((resolve, reject) => {
      child.once('exit', (code) => resolve(code));
      child.once('error', error => reject(error));
    });
    
    // Forward smoke output
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
    
    process.exitCode = exitCode;
    
  } catch (error) {
    console.error(`[qa:smoke] Error: ${error.message}`);
    process.exitCode = 1;
  } finally {
    // Cleanup: only stop server we own
    if (serverOwned && server) {
      console.log('[qa:smoke] Stopping owned QA server...');
      await new Promise((resolve) => {
        server.close(resolve);
      });
      console.log('[qa:smoke] QA server stopped');
    }
  }
}

// Handle process signals for cleanup
const cleanup = () => {
  if (serverOwned && server) {
    server.close();
  }
  process.exit(1);
};

let server = null;
let serverOwned = false;

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

main().catch(error => {
  console.error(error.stack);
  process.exitCode = 1;
});