// M867/M868 — QA autenticado da PRODUÇÃO PUBLICADA (abc8cf4), sessão legítima do dono.
// Somente leitura: views, Hide Values (leitura), zero-writes; depois logout + proteção pós-logout (M868).
const http = require('http');
const BASE = 'http://127.0.0.1:9233';
function jget(p) { return new Promise((res, rej) => { http.get(BASE + p, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => res(JSON.parse(b))); }).on('error', rej); }); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const ver = await jget('/json/version');
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
  let msgId = 0;
  const sendC = (method, params, sid) => new Promise((res, rej) => {
    const id = ++msgId;
    ws.send(JSON.stringify({ id, sessionId: sid, method, params: params || {} }));
    const on = m => { const d = JSON.parse(m.data); if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error('e')) : res(d.result); } };
    ws.addEventListener('message', on);
    setTimeout(() => { ws.removeEventListener('message', on); rej(new Error('timeout')); }, 45000);
  });
  const evalP = (sid, expr) => new Promise((res, rej) => {
    const id = ++msgId;
    ws.send(JSON.stringify({ id, sessionId: sid, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true, awaitPromise: true } }));
    const on = m => { const d = JSON.parse(m.data); if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error('e')) : res(d.result.result.value); } };
    ws.addEventListener('message', on);
    setTimeout(() => { ws.removeEventListener('message', on); rej(new Error('timeout')); }, 45000);
  });
  const appTabs = (await jget('/json/list')).filter(t => t.type === 'page' && t.url.includes('carteira-investimentos-delta'));
  const att = await sendC('Target.attachToTarget', { targetId: appTabs[appTabs.length - 1].id, flatten: true });
  const sid = att.sessionId;
  await sendC('Runtime.enable', {}, sid);

  const auth = JSON.parse(await evalP(sid, `JSON.stringify({ authed: !!(typeof FB!=='undefined'&&FB.user), verified: (typeof FB!=='undefined'&&FB.user) ? !!FB.user.emailVerified : null, nAssets: (typeof S!=='undefined'&&Array.isArray(S.assets))?S.assets.length:-1 })`));
  const storage0 = await evalP(sid, `localStorage.length + ':' + (document.cookie ? document.cookie.length : 0)`);

  const views = {};
  for (const label of ['dashboard', 'patrimonio', 'ativos', 'dividendos', 'renda-fixa', 'relatorios']) {
    await evalP(sid, `(() => { const els = Array.from(document.querySelectorAll('[data-view], nav button, .nav button, .tabs button, [onclick*="go("], .tab, button')); const el = els.find(e => (((e.getAttribute('data-view')||'')+' '+(e.textContent||'')+' '+(e.getAttribute('onclick')||'')).toLowerCase().includes('${label}'))); if (el) el.click(); return !!el; })()`).catch(() => false);
    await sleep(1500);
    views[label] = JSON.parse(await evalP(sid, `JSON.stringify({ money: (document.body.innerText.match(/R\\$\\s*[0-9]/g)||[]).length, partial: /parcial|indispon|desconhec|consolida/i.test(document.body.innerText), rows: Math.min(document.querySelectorAll('tr,[data-asset],.rf-position').length, 60), title: document.title.slice(0, 34) })`));
  }

  // Hide Values: leitura da preferência sem alterar
  const hvPref = await evalP(sid, `(() => { let v = null; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/hide|ocult/i.test(k)) v = localStorage.getItem(k) === 'true'; } return v; })()`);
  const storage1 = await evalP(sid, `localStorage.length + ':' + (document.cookie ? document.cookie.length : 0)`);

  // M868 — logout na sessão QA (perfil isolado) + proteção pós-logout
  await evalP(sid, `(() => { const els = Array.from(document.querySelectorAll('button, [role=button], a')); const el = els.find(e => /^Sair$|Sair da conta|Encerrar sess/i.test((e.textContent||'').trim()) || /logout|signOut/i.test(e.getAttribute('onclick')||'')); if (el) { el.click(); return true; } return false; })()`).catch(() => false);
  await sleep(5000);
  await evalP(sid, `(() => { const b = Array.from(document.querySelectorAll('button')).find(e => /^(Sair|Confirmar|Encerrar)$/i.test((e.textContent||'').trim())); if (b) { b.click(); return true; } return false; })()`).catch(() => false);
  await sleep(7000);
  const postLogout = JSON.parse(await evalP(sid, `JSON.stringify({ stillAuthed: !!(typeof FB!=='undefined'&&FB.user), loginGate: !!Array.from(document.querySelectorAll('button')).find(b=>/Entrar com Google|Entre com Google/.test(b.textContent)), money: (document.body.innerText.match(/R\\$\\s*[0-9]/g)||[]).length, panels: document.querySelectorAll('.premium-dashboard, .canon-dashboard, [data-asset]').length })`));

  console.log(JSON.stringify({ auth, views, hvPref, storageUnchanged: storage0 === storage1, postLogout }, null, 1));
  ws.close(); process.exit(0);
})().catch(e => { console.error('FAIL', String(e).slice(0, 250)); process.exit(1); });
