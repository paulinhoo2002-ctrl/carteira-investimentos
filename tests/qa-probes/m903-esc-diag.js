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
  await sendC('Runtime.enable', {}, sid);
  // estado atual (modal pode estar aberto da tentativa anterior)
  const state = JSON.parse(await evalP(sid, `JSON.stringify({ fnExists: typeof quickMovementEscape, qmOpen: !!S.quickMovementOpen, baselineLen: Array.isArray(window.__qmBaseline) ? window.__qmBaseline.length : null, overlayInputs: document.querySelectorAll('.note-overlay input').length })`));
  console.log('estado:', JSON.stringify(state));
  if (state.qmOpen && state.fnExists === 'function') {
    const direct = await evalP(sid, `(() => { try { quickMovementEscape({ key: 'Escape' }); return 'chamada-ok'; } catch (e) { return 'THREW:' + String(e).slice(0, 80); } })()`);
    await sleep(700);
    const after = JSON.parse(await evalP(sid, `JSON.stringify({ qmOpen: !!S.quickMovementOpen, overlayVis: (() => { const o = document.querySelector('.note-overlay'); return !!(o && (o.checkVisibility ? o.checkVisibility() : o.getBoundingClientRect().width > 0)); })() })`));
    console.log('chamada direta:', direct, '| depois:', JSON.stringify(after));
    if (!after.qmOpen) {
      // fechar qualquer resto e testar listener REAL: reabrir + Input.dispatchKeyEvent
      await evalP(sid, `(() => { const b = document.querySelector('[onclick*="toggleAssetActionMenu"]'); if (b) b.click(); return !!b; })()`).catch(() => null);
      await sleep(400);
      await evalP(sid, `(() => { const i = Array.from(document.querySelectorAll('[onclick*="openAssetQuickMovement"], [onclick*="quick"]')).find(x => /comprar/i.test((x.textContent||'')+(x.getAttribute('onclick')||''))); if (i) i.click(); return !!i; })()`).catch(() => null);
      await sleep(1500);
      await sendC('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 }, sid).catch(() => null);
      await sleep(700);
      const trusted = JSON.parse(await evalP(sid, `JSON.stringify({ qmOpen: !!S.quickMovementOpen })`));
      console.log('ESC trusted após reabrir:', JSON.stringify(trusted));
    }
  }
  ws.close(); process.exit(0);
})().catch(e => { console.error('FAIL', String(e).slice(0, 250)); process.exit(1); });
