'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const Browser = require('./canonical-qa-browser');

async function collectDiagnostics() {
  const browserPath = Browser.browserCandidates().find(candidate => fs.existsSync(candidate)) || null;
  const cdp = await Browser.cdpVersion();
  const auth = await Browser.readAuthStatus();
  const serverUrl = `${Browser.origin}/index.html`;
  let serverReachable = false;
  try { serverReachable = (await fetch(serverUrl)).ok; } catch { /* diagnostic only */ }
  const rootPollution = fs.readdirSync(process.cwd()).filter(name =>
    name.startsWith('.browser-harness-home-')
    || name.startsWith('.browser-harness-tmp-')
    || name.startsWith('.browser-harness-config-')
    || name.startsWith('.browser-harness-runtime')
  );
  const output = {
    browserExecutable: browserPath,
    browserVersion: cdp?.Browser || null,
    canonicalProfile: Browser.profile,
    profileExists: fs.existsSync(Browser.profile),
    cdpPort: Browser.port,
    cdpReachable: Boolean(cdp?.webSocketDebuggerUrl),
    cdpBrowser: cdp?.Browser || null,
    serverPort: Number(process.env.QA_APP_PORT || 4173),
    serverReachable,
    authoritativeTab: auth.AUTHORITATIVE_TAB_FOUND,
    authSessionValid: auth.AUTH_SESSION_VALID,
    cloudLoaded: auth.FB_CLOUD_LOADED,
    cloudStabilized: auth.CLOUD_STABILIZED,
    rootTempPollution: rootPollution,
    expectedHead: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  };
  return output;
}

async function main() {
  const output = await collectDiagnostics();
  output.pass = output.profileExists && output.cdpReachable && output.serverReachable && output.authoritativeTab
    && output.authSessionValid && output.cloudLoaded && output.cloudStabilized && output.rootTempPollution.length === 0;
  console.log(JSON.stringify(output, null, 2));
  process.exitCode = output.pass ? 0 : 2;
}

module.exports = { collectDiagnostics, main };

if (require.main === module) {
  main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
}
