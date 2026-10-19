'use strict';

/**
 * Boot-state UI templates (Phase 2 — P7/P8/P11/P12/P13/P28).
 * Pure string builders — no DOM dependency, unit-testable, integration-ready
 * for the legacy SPA. The host mounts them; content is fail-closed: loading
 * shows NO financial values, blocked shows NO values and NO mode jargon.
 */
(function exposeBootUi(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AuthBootUi = api;
})(typeof globalThis === 'object' ? globalThis : this, function createBootUi(){

  function esc(value) {
    const s = String(value === null || value === undefined ? '' : value);
    // concat-built entities: immune to entity mangling in editors/transports
    return s.replace(/[&<>"']/g, (ch) => ({
      '&': '&' + 'amp;',
      '<': '&' + 'lt;',
      '>': '&' + 'gt;',
      '"': '&' + 'quot;',
      "'": '&' + '#39;',
    }[ch]));
  }

  // P7 — authorization loading state. No values, no cached panels.
  function renderLoadingHtml() {
    return '<div class="auth-boot-state auth-boot-loading" role="status" aria-live="polite">'
      + '<div class="auth-boot-spinner" aria-hidden="true"></div>'
      + '<p>Verificando sua conta...</p>'
      + '</div>';
  }

  // P8 — login screen. Google always; e-mail ONLY when the host proves the
  // provider is configured (fail-closed: no invented providers).
  function renderLoginHtml(options) {
    const opts = options || {};
    const appName = esc(opts.appName || 'Carteira de Investimentos');
    let html = '<div class="auth-boot-state auth-boot-login" role="main">'
      + '<h1>' + appName + '</h1>'
      + '<button type="button" id="auth-google-btn" class="auth-btn auth-btn-google">'
      + 'Continuar com Google</button>';
    if (opts.emailAuthConfigured === true) {
      html += '<button type="button" id="auth-email-btn" class="auth-btn auth-btn-email">'
        + 'Entrar com e-mail</button>';
    }
    html += '<p class="auth-boot-note">Ao entrar, sua carteira é carregada da sua conta.</p>'
      + '</div>';
    return html;
  }

  // P11/P28 — blocked state. Concise copy, no values, no jargon, no auto-demo.
  function renderBlockedHtml(options) {
    const authFailure = options && options.authFailure === true;
    return '<div class="auth-boot-state auth-boot-blocked" role="alert">'
      + '<h1>' + (authFailure ? 'Não foi possível validar o acesso' : 'Acesso não autorizado') + '</h1>'
      + '<p>' + (authFailure ? 'Tente novamente quando a conexão estiver disponível.' : 'Esta conta não tem autorização para acessar a carteira.') + '</p>'
      + (authFailure
        ? '<button type="button" class="auth-btn auth-btn-ghost" onclick="location.reload()">Tentar novamente</button>'
        : '<button type="button" class="auth-btn auth-btn-ghost" onclick="signOutGoogle()">Voltar para login</button>')
      + '</div>';
  }

  function renderInto(container, html) {
    if (typeof document === 'undefined' || !container) return false;
    const el = typeof container === 'string' ? document.getElementById(container) : container;
    if (!el) return false;
    el.innerHTML = html;
    return true;
  }

  return { esc, renderLoadingHtml, renderLoginHtml, renderBlockedHtml, renderInto };
});
