'use strict';

// legacy/js/app-constants.js
// Extracted constants from index.html inline script
// Pure constants — no logic, no side effects
// Uses legacy global pattern (window.AppConstants) for compatibility with non-module script loading

(function(root) {
  'use strict';

  // Quote refresh
  const QUOTE_REFRESH_INTERVAL = 5 * 60 * 1000;
  const QI = QUOTE_REFRESH_INTERVAL / 1000;

  // Color palette for charts
  const CLRS = ['#818cf8','#34d399','#fbbf24','#f472b6','#60a5fa','#a3e635','#fb923c','#a78bfa'];

  // Benchmark rates (fallback)
  const RENT_BENCH = { CDI:10.65, IPCA:4.50, IFIX:9.20, IBOV:11.00, SMLL:12.00, IDIV:10.00, IVVB11:13.00 };

  // Asset type definitions
  const TYPE_CHOICES = ['Ação','FII','ETF','Renda Fixa','Tesouro Direto','Reserva de emergência','BDR','Crypto','Stock','Reit','Fundos de Investimento'];
  const TYPE_ORDER   = ['Ação','FII','ETF','Renda Fixa','Tesouro Direto','BDR','Crypto','Stock','Reit','Fundos de Investimento'];
  const TYPE_FORM_CHOICES = TYPE_CHOICES.filter(t=>t!=='Reserva de emergência');
  const TYPE_DASH_CHOICES = TYPE_ORDER;
  const TYPE_GOAL_CHOICES = ['Ação','FII','ETF','BDR','Stock','Reit','Fundos de Investimento'];

  // Type aliases for normalization
  const TYPE_ALIASES = {
    'AÇÕES':'Ação','AÇÃO':'Ação','ACTIONS':'Ação',
    'FIIS':'FII','FUNDOS IMOBILIARIOS':'FII','FUNDOS IMOBILIÁRIOS':'FII',
    'ETFS':'ETF','ETF\'S':'ETF','ETF INTERNACIONAL':'ETF','ETFS INTERNACIONAIS':'ETF',
    'RENDA FIXA (CDB/LCI/LCA/LC/LF/RDB)':'Renda Fixa','RENDA FIXA':'Renda Fixa','TESOURO DIRETO':'Tesouro Direto',
    'RESERVA DE EMERGENCIA':'Reserva de emergência','RESERVA DE EMERGÊNCIA':'Reserva de emergência',
    'FUNDOS DE INVESTIMENTO':'Fundos de Investimento','FUNDOS DE INVESTIMENTOS':'Fundos de Investimento',
    'STOCK':'Stock','STOCKS':'Stock','REIT':'Reit','REITS':'Reit',
  };

  // Normalized lookup (uppercase, no accents, trimmed)
  const TYPE_ALIAS_LOOKUP = Object.fromEntries(
    Object.entries(TYPE_ALIASES).map(([k,v])=>[
      k.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toUpperCase(),
      v
    ])
  );

  // Storage keys
  const STOR = 'civ5';
  const APP_NAME = 'Carteira de Investimentos';
  const BACKUP_VER = 1;
  const DEFAULT_BRAPI = ''; // brapi opcional; cotações usam Yahoo Finance via /api/yahoo-quote
  const ACCESS_ADMIN_EMAILS = ['paulinhoo2002@gmail.com'];
  const THEME_STOR = 'carteira_theme';
  const THEME_COLOR = { dark:'#07090f', light:'#e8eff6' };

  // Expose on global object (legacy pattern)
  root.AppConstants = Object.freeze({
    QUOTE_REFRESH_INTERVAL,
    QI,
    CLRS,
    RENT_BENCH,
    TYPE_CHOICES,
    TYPE_ORDER,
    TYPE_FORM_CHOICES,
    TYPE_DASH_CHOICES,
    TYPE_GOAL_CHOICES,
    TYPE_ALIASES,
    TYPE_ALIAS_LOOKUP,
    STOR,
    APP_NAME,
    BACKUP_VER,
    DEFAULT_BRAPI,
    ACCESS_ADMIN_EMAILS,
    THEME_STOR,
    THEME_COLOR,
  });

  if (typeof module === 'object' && module.exports) {
    module.exports = root.AppConstants;
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));