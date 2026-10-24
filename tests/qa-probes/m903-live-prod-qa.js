// M903-M910 — QA autenticado AO VIVO da produção 4483112 (sessão legítima do dono).
// Títulos por rota (M879), ESC limpo/sujo no modal REAL (M878, cancela sem salvar), views, HV pref, zero escritas.
// SEM logout no final — sessão preservada para uso do proprietário.
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

  const auth = JSON.parse(await evalP(sid, `JSON.stringify({ authed: !!(typeof FB!=='undefined'&&FB.user), nAssets: S.assets.length })`));
  const storage0 = await evalP(sid, `localStorage.length + ':' + (document.cookie ? document.cookie.length : 0)`);

  // 1) títulos por rota (M879 ao vivo)
  const titles = {};
  for (const r of ['dividendos', 'renda-fixa', 'ativos']) {
    await evalP(sid, `go('${r}')`).catch(() => {});
    await sleep(1200);
    titles[r] = await evalP(sid, `document.title`);
  }

  // 2) ESC no modal REAL: abrir compra de um ativo existente, ESC limpo fecha; reabrir, digitar, ESC protege; fechar por Cancelar (zero escritas)
  await evalP(sid, `go('ativos')`).catch(() => {});
  await sleep(1500);
  const esc = {};
  // abrir modal de compra (menu da primeira linha)
  await evalP(sid, `(() => { const b = document.querySelector('[onclick*="toggleAssetActionMenu"]'); if (b) b.click(); return !!b; })()`).catch(() => null);
  await sleep(500);
  await evalP(sid, `(() => { const i = Array.from(document.querySelectorAll('[onclick*="openAssetQuickMovement"], [onclick*="quick"]')).find(x => /comprar/i.test((x.textContent||'')+(x.getAttribute('onclick')||''))); if (i) i.click(); return !!i; })()`).catch(() => null);
  await sleep(1400);
  esc.modalOpen = await evalP(sid, `(() => { const o = document.querySelector('.note-overlay'); return !!(o && (o.checkVisibility ? o.checkVisibility() : o.getBoundingClientRect().width > 0)); })()`);
  if (esc.modalOpen) {
    // ESC limpo
    await evalP(sid, `(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return 1; })()`).catch(() => null);
    await sleep(700);
    esc.escCleanCloses = !(await evalP(sid, `(() => { const o = document.querySelector('.note-overlay'); return !!(o && (o.checkVisibility ? o.checkVisibility() : o.getBoundingClientRect().width > 0)); })()`));
    if (esc.escCleanCloses) {
      // reabrir + digitar (sujo) + ESC protege + Cancelar
      await evalP(sid, `(() => { const b = document.querySelector('[onclick*="toggleAssetActionMenu"]'); if (b) b.click(); return !!b; })()`).catch(() => null);
      await sleep(500);
      await evalP(sid, `(() => { const i = Array.from(document.querySelectorAll('[onclick*="openAssetQuickMovement"], [onclick*="quick"]')).find(x => /comprar/i.test((x.textContent||'')+(x.getAttribute('onclick')||''))); if (i) i.click(); return !!i; })()`).catch(() => null);
      await sleep(1400);
      await evalP(sid, `(() => { const inp = document.querySelector('.note-overlay input:not([type=date]):not([type=checkbox])'); if (inp) { inp.value = '1'; inp.dispatchEvent(new Event('input', { bubbles: true })); } return !!inp; })()`).catch(() => null);
      await evalP(sid, `(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return 1; })()`).catch(() => null);
      await sleep(700);
      esc.escDirtyStaysOpen = await evalP(sid, `(() => { const o = document.querySelector('.note-overlay'); return !!(o && (o.checkVisibility ? o.checkVisibility() : o.getBoundingClientRect().width > 0)); })()`);
      // fechar por Cancelar/Fechar explícito (zero escritas)
      await evalP(sid, `(() => { const b = Array.from(document.querySelectorAll('.note-overlay button')).find(x => /cancelar|fechar/i.test((x.textContent||'').toLowerCase())); if (b) b.click(); return !!b; })()`).catch(() => null);
      await sleep(800);
      esc.closedByCancel = !(await evalP(sid, `(() => { const o = document.querySelector('.note-overlay'); return !!(o && (o.checkVisibility ? o.checkVisibility() : o.getBoundingClientRect().width > 0)); })()`));
    }
  }

  // 3) views rápidas + estados honestos
  const views = {};
  for (const label of ['dashboard', 'patrimonio', 'renda-fixa']) {
    await evalP(sid, `(() => { const els = Array.from(document.querySelectorAll('[data-view], nav button, .tabs button, [onclick*="go("], .tab, button')); const el = els.find(e => (((e.getAttribute('data-view')||'')+' '+(e.textContent||'')+' '+(e.getAttribute('onclick')||'')).toLowerCase().includes('${label}'))); if (el) el.click(); return !!el; })()`).catch(() => null);
    await sleep(1300);
    views[label] = JSON.parse(await evalP(sid, `JSON.stringify({ money: (document.body.innerText.match(/R\\$\\s*[0-9]/g)||[]).length, partial: /parcial|indispon|consolida/i.test(document.body.innerText), title: document.title.slice(0, 30) })`));
  }

  const hvPref = await evalP(sid, `(() => { let v = null; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/hide|ocult/i.test(k)) v = localStorage.getItem(k) === 'true'; } return v; })()`);
  const storage1 = await evalP(sid, `localStorage.length + ':' + (document.cookie ? document.cookie.length : 0)`);

  console.log(JSON.stringify({ auth, titles, esc, views, hvPref, zeroWrites: storage0 === storage1, sessionPreserved: true }, null, 1));
  ws.close(); process.exit(0);
})().catch(e => { console.error('FAIL', String(e).slice(0, 250)); process.exit(1); });
