'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');

function getProfile() {
  const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || process.cwd(), 'AppData', 'Local');
  return path.join(localAppData, 'CarteiraInvestimentos', 'qa-browser-authenticated');
}

function getOrigin() {
  return process.env.QA_ORIGIN || 'http://localhost:4173';
}

function getPort() {
  return Number(process.env.QA_CDP_PORT || 9222);
}

async function browserCandidates() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  if (process.env.LOCALAPPDATA) {
    candidates.push(path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'));
  }
  return candidates;
}

async function cdpVersion() {
  try {
    const response = await fetch(`http://127.0.0.1:${getPort()}/json/version`);
    if (response.ok) {
      return await response.json();
    }
  } catch {}
  return null;
}

async function readAuthStatus() {
  const empty = {
    QA_BROWSER_RUNNING: false,
    CDP_REACHABLE: false,
    AUTHORITATIVE_TAB_FOUND: false,
    AUTH_SESSION_VALID: false,
    FB_CLOUD_LOADED: false,
    CLOUD_STABILIZED: false
  };
  let browser;
  try {
    const version = await cdpVersion();
    if (!version?.webSocketDebuggerUrl) return empty;
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${getPort()}`);
    const pages = browser.contexts().flatMap(context => context.pages());
    const page = pages.find(candidate => {
      try {
        const url = new URL(candidate.url());
        const expected = new URL(getOrigin());
        return url.origin === expected.origin
          && new URLSearchParams(url.search).get('protectedReadOnlyQa') === '1';
      } catch { return false; }
    });
    if (!page) return { ...empty, QA_BROWSER_RUNNING: true, CDP_REACHABLE: true };
    const state = await page.evaluate(async () => {
      const readiness = typeof getProtectedRealPilotReadiness === 'function'
        ? await getProtectedRealPilotReadiness().catch(() => null) : null;
      return {
        authResolved: typeof FB !== 'undefined' && FB.authResolved === true,
        user: typeof FB !== 'undefined' && Boolean(FB.user),
        accessAllowed: typeof FB !== 'undefined' && FB.access?.allowed === true,
        cloudLoaded: typeof FB !== 'undefined' && FB.cloudLoaded === true,
        readinessAuth: document.documentElement.dataset.protectedPilotReadinessAuth === 'true',
        bridgeBindingReady: readiness?.runtime?.bridgeBindingReady === true,
        executionPathComplete: readiness?.runtime?.executionPathComplete === true
      };
    }).catch(() => null);
    if (!state) return { ...empty, QA_BROWSER_RUNNING: true, CDP_REACHABLE: true, AUTHORITATIVE_TAB_FOUND: true };
    const authenticated = state.authResolved && state.user && state.accessAllowed;
    return {
      QA_BROWSER_RUNNING: true,
      CDP_REACHABLE: true,
      AUTHORITATIVE_TAB_FOUND: true,
      AUTH_SESSION_VALID: authenticated,
      FB_CLOUD_LOADED: state.cloudLoaded,
      CLOUD_STABILIZED: Boolean(authenticated && state.cloudLoaded && state.readinessAuth
        && state.bridgeBindingReady && state.executionPathComplete)
    };
  } catch {
    return empty;
  } finally {
    // connectOverCDP disconnects this client; it does not stop the user's browser.
    await browser?.close().catch(() => {});
  }
}

module.exports = {
  profile: getProfile(),
  origin: getOrigin(),
  port: getPort(),
  browserCandidates,
  cdpVersion,
  readAuthStatus
};
