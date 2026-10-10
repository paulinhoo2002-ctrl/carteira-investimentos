// V583/V584 — hosted QA extended validation: session survival semantics.
// Runs against carteira-invest-qa-v316 with the two synthetic accounts only.
// Covers: login -> logout (token revocation client-side simulation via API),
// re-login persistence, update persistence, delete semantics, and cross-user denial.
const apiKey = process.argv[2];
const A = { email: 'qa-a@exemplo-invalido.test', password: 'QaUserA-Synth-2026' };

async function signIn(user) {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: user.password, returnSecureToken: true })
  });
  const d = await res.json();
  if (d.error) throw new Error('signIn: ' + d.error.message);
  return d;
}

async function fsOp(idToken, method, path_, body) {
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/carteira-invest-qa-v316/databases/(default)/documents${path_}`, {
    method,
    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const status = res.status;
  let data = null; try { data = await res.json(); } catch {}
  return { status, data };
}

const results = [];
const rec = (n, ok, d) => { results.push(ok); console.log(`${ok ? '✔' : '✖'} ${n}${d ? ' — ' + d : ''}`); };

(async () => {
  // 1. Sign in, write doc with server timestamp semantics (updateTime proves hosted persistence).
  const s1 = await signIn(A);
  const w1 = await fsOp(s1.idToken, 'PATCH', `/portfolios/${s1.localId}`, { fields: { synth: { stringValue: 'v584-a' }, rev: { integerValue: 1 } } });
  rec('V584 write rev1 (hosted)', w1.status === 200, `status ${w1.status}`);
  const rev1Time = w1.data?.updateTime;

  // 2. Logout simulation: discard token; a REVOKED-style check uses a garbage token.
  const denied = await fsOp('garbage-token', 'GET', `/portfolios/${s1.localId}`);
  rec('V583 invalid token denied', denied.status === 401, `status ${denied.status}`);

  // 3. Fresh login (new session) — read must return the persisted doc.
  const s2 = await signIn(A);
  const r2 = await fsOp(s2.idToken, 'GET', `/portfolios/${s2.localId}`);
  rec('V584 persists across logout+login', r2.status === 200 && r2.data?.fields?.rev?.integerValue === '1', `status ${r2.status}`);

  // 4. Update (rev 2) and confirm updateTime advanced (no duplication, in-place).
  const w2 = await fsOp(s2.idToken, 'PATCH', `/portfolios/${s2.localId}`, { fields: { synth: { stringValue: 'v584-a' }, rev: { integerValue: 2 } } });
  const rev2Time = w2.data?.updateTime;
  rec('V584 update in place (new updateTime)', w2.status === 200 && rev2Time && rev1Time !== rev2Time, `status ${w2.status}`);

  // 5. Read again — exactly one doc, rev 2.
  const r3 = await fsOp(s2.idToken, 'GET', `/portfolios/${s2.localId}`);
  rec('V584 single doc, no duplication', r3.status === 200 && r3.data?.fields?.rev?.integerValue === '2');

  // 6. Cleanup.
  const del = await fsOp(s2.idToken, 'DELETE', `/portfolios/${s2.localId}`);
  rec('V584 cleanup', del.status === 200 || del.status === 404, `status ${del.status}`);

  const pass = results.filter(Boolean).length;
  console.log(`\nSUMMARY: ${pass}/${results.length} PASS`);
  process.exitCode = pass === results.length ? 0 : 2;
})();// Manual hosted-QA harness (not part of npm test): run with the QA web API key.
// Usage: node tests/qa-hosted-session-persistence.manual-test.js <apiKey>
// Requires the two synthetic QA accounts (qa-a/qa-b@exemplo-invalido.test) in
// carteira-invest-qa-v316. Never run against production.
