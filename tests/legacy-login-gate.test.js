const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('function accessGateBox(){');
const end = html.indexOf('\nfunction shouldShowAccessGate()', start);
assert.ok(start >= 0 && end > start, 'real access gate renderer is present');
const renderer = html.slice(start, end);
const signInStart = html.indexOf('async function signInGoogle(){');
const signInEnd = html.indexOf('\nasync function signOutGoogle()', signInStart);
assert.ok(signInStart >= 0 && signInEnd > signInStart, 'canonical Google sign-in handler is present');
const signInHandler = html.slice(signInStart, signInEnd);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function renderGate(FB, ui = {}) {
  return vm.runInNewContext(`${renderer}\naccessGateBox()`, { FB, esc, authGateLoginPending: false, authGateLoginError: '', ...ui });
}

test('real access gate keeps unauthenticated content private and calls the canonical Google handler', () => {
  const markup = renderGate({ authResolved: true, user: null, access: { loading: false, allowed: false, reason: '' } });
  assert.match(markup, /data-auth-state="idle"/);
  assert.match(markup, /Continuar com Google/);
  assert.match(markup, /onclick="signInGoogle\(\)"/);
  assert.match(markup, /Acesso exclusivo ao proprietário/);
  assert.doesNotMatch(markup, /(?:R\$|dividendos|saldo|patrimônio atual)\s*\d/i);
});

test('real access gate presents session checking and access validation as noninteractive status', () => {
  const checking = renderGate({ authResolved: false, user: null, access: { loading: true, allowed: false, reason: '' } });
  assert.match(checking, /data-auth-state="checking"/);
  assert.match(checking, /role="status" aria-live="polite"/);
  assert.match(checking, /Verificando sua sessão/);
  assert.match(checking, /disabled aria-disabled="true"/);

  const validating = renderGate({ authResolved: true, user: { email: 'owner@example.invalid' }, access: { loading: true, allowed: false, reason: '' } });
  assert.match(validating, /data-auth-state="validating"/);
  assert.match(validating, /Conta detectada/);
  assert.match(validating, /owner@example\.invalid/);

  const signingIn = renderGate({ authResolved: true, user: null, access: { loading: false, allowed: false, reason: '' } }, { authGateLoginPending: true });
  assert.match(signingIn, /data-auth-state="signing-in"/);
  assert.match(signingIn, /Entrando\.\.\./);
  assert.match(signingIn, /aria-busy="true"/);
});

test('real access gate escapes access errors and keeps account exit available', () => {
  const unauthorized = renderGate({ authResolved: true, user: { email: 'owner@example.invalid' }, access: { loading: false, allowed: false, reason: '<acesso pendente>' } });
  assert.match(unauthorized, /data-auth-state="unauthorized"/);
  assert.match(unauthorized, /Esta conta não tem acesso/);
  assert.match(unauthorized, /onclick="signOutGoogle\(\)"/);
  assert.doesNotMatch(unauthorized, /<acesso pendente>/);

  const error = renderGate({ authResolved: true, user: null, access: { loading: false, allowed: false, reason: '<conexão indisponível>' } });
  assert.match(error, /data-auth-state="error"/);
  assert.match(error, /Não foi possível validar o acesso/);
  assert.doesNotMatch(error, /<conexão indisponível>/);
  assert.match(error, /role="alert" aria-live="assertive"/);

  const loginError = renderGate({ authResolved: true, user: null, access: { loading: false, allowed: false, reason: '' } }, { authGateLoginError: '<popup fechado>' });
  assert.match(loginError, /&lt;popup fechado&gt;/);
  assert.match(loginError, /Tentar novamente/);
});

test('canonical Google handler blocks duplicate popups and presents a safe retry message', async () => {
  let resolvePopup;
  let rejectPopup;
  let popupCalls = 0;
  let renders = 0;
  const context = {
    authGateLoginPending: false,
    authGateLoginError: '',
    FB: { ready: true, auth: { signInWithPopup() { popupCalls += 1; return new Promise((resolve, reject) => { resolvePopup = resolve; rejectPopup = reject; }); } } },
    firebase: { auth: { GoogleAuthProvider: class GoogleAuthProvider {} } },
    firebaseAuthPersistenceReady: Promise.resolve(),
    isLocalTestMode: () => false,
    render: () => { renders += 1; },
    debugWarn: () => {},
  };
  vm.runInNewContext(`${signInHandler}`, context);
  const first = context.signInGoogle();
  const duplicate = context.signInGoogle();
  await duplicate;
  assert.equal(popupCalls, 1);
  assert.equal(context.authGateLoginPending, true);
  rejectPopup({ code: 'auth/popup-closed-by-user' });
  await first;
  assert.equal(context.authGateLoginPending, false);
  assert.equal(context.authGateLoginError, 'Entrada cancelada. Se quiser, tente novamente.');
  assert.equal(renders, 2);
  assert.equal(typeof resolvePopup, 'function');
});
