'use strict';
// Resolve o executável do Chrome/Chromium para os testes de navegador, em Windows, Linux e macOS.
// Regra: se CHROME_PATH estiver configurado, ele é obrigatório (nunca cai em silêncio para outro
// navegador); sem CHROME_PATH, usa o primeiro candidato existente; sem navegador, falha com
// mensagem clara. Ausência de navegador não pode virar teste "pulado" nem "aprovado".
const fs = require('node:fs');
const path = require('node:path');

const WINDOWS = [
  process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe'),
  process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Google', 'Chrome', 'Application', 'chrome.exe'),
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];
const LINUX = ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/snap/bin/chromium'];
const MACOS = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium'];

function candidatesFor(platform) {
  if (platform === 'win32') return WINDOWS.filter(Boolean);
  if (platform === 'darwin') return MACOS;
  return LINUX;
}

function resolveChromePath({ env = process.env, platform = process.platform, exists = fs.existsSync } = {}) {
  if (env.CHROME_PATH) {
    if (!exists(env.CHROME_PATH)) throw new Error(`CHROME_PATH aponta para um arquivo inexistente: ${env.CHROME_PATH}`);
    return env.CHROME_PATH;
  }
  const found = candidatesFor(platform).find(candidate => exists(candidate));
  if (!found) {
    throw new Error(`Chrome/Chromium não encontrado (${platform}). Instale o navegador ou defina CHROME_PATH. Candidatos: ${candidatesFor(platform).join(', ')}`);
  }
  return found;
}

module.exports = { resolveChromePath, candidatesFor };
