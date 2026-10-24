// M903 — reload da aba (ativa o SW novo) + re-verifica títulos e ESC na produção
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
  const tabs = (await jget('/json/list')).filter(t => t.type === 'page' && t.url.includes('carteira-investimentos-delta'));
  const att = await sendC('Target.attachToTarget', { targetId: tabs[tabs.length - 1].id, flatten: true });
  const sid = att.sessionId;
  await sendC('Page.enable', {}, sid);
  await sendC('Runtime.enable', {}, sid);
  await sendC('Page.reload', {}, sid);
  await sleep(12000);
  const out = { auth: null, titles: {}, esc: {} };
  out.auth = JSON.parse(await evalP(sid, `JSON.stringify({ authed: !!(typeof FB!=='undefined'&&FB.user), nAssets: (typeof S!=='undefined'&&Array.isArray(S.assets))?S.assets.length:-1 })`).catch(() => null));
  for (const r of ['dividendos', 'renda-fixa']) {
    await evalP(sid, `go('${r}')`).catch(() => {});
    await sleep(1200);
    out.titles[r] = await evalP(sid, `document.title`);
  }
  await evalP(sid, `go('ativos')`).catch(() => {});
  await sleep(1500);
  await evalP(sid, `(() => { const b = document.querySelector('[onclick*="toggleAssetActionMenu"]'); if (b) b.click(); return !!b; })()`).catch(() => null);
  await sleep(500);
  await evalP(sid, `(() => { const i = Array.from(document.querySelectorAll('[onclick*="openAssetQuickMovement"], [onclick*="quick"]')).find(x => /comprar/i.test((x.textContent||'')+(x.getAttribute('onclick')||''))); if (i) i.click(); return !!i; })()`).catch(() => null);
  await sleep(1400);
  out.esc.modalOpen = await evalP(sid, `(() => { const o = document.querySelector('.note-overlay'); return !!(o && (o.checkVisibility ? o.checkVisibility() : o.getBoundingClientRect().width > 0)); })()`);
  if (out.esc.modalOpen) {
    await sendC('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 }, sid).catch(() => null);
    await sleep(700);
    out.esc.escCleanCloses = !(await evalP(sid, `(() => { const o = document.querySelector('.note-overlay'); return !!(o && (o.checkVisibility ? o.checkVisibility() : o.getBoundingClientRect().width > 0)); })()`));
  }
  console.log(JSON.stringify(out, null, 1));
  ws.close(); process.exit(0);
})().catch(e => { console.error('FAIL', String(e).slice(0, 250)); process.exit(1); });
