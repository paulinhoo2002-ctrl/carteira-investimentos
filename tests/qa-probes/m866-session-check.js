// M866/M867 — sessão do dono na janela aberta? (booleans; se logado, QA autenticado somente leitura da produção publicada)
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
  if (!appTabs.length) { console.log(JSON.stringify({ session: 'NO_APP_TAB' })); process.exit(0); }
  // anexar na aba da app que o dono pode ter usado (não navegar de novo; a sessão é do perfil)
  const att = await sendC('Target.attachToTarget', { targetId: appTabs[appTabs.length - 1].id, flatten: true });
  const sid = att.sessionId;
  await sendC('Runtime.enable', {}, sid);
  await sleep(3000);
  const auth = JSON.parse(await evalP(sid, `JSON.stringify({ authed: !!(typeof FB!=='undefined'&&FB.user), nAssets: (typeof S!=='undefined'&&Array.isArray(S.assets))?S.assets.length:-1, loginVisible: !!Array.from(document.querySelectorAll('button')).find(b=>/Entrar com Google/.test(b.textContent)) })`).catch(() => null));
  console.log(JSON.stringify({ session: auth }));
  ws.close(); process.exit(0);
})().catch(e => { console.error('FAIL', String(e).slice(0, 200)); process.exit(1); });
