(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DataQualityRemediation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STATES = Object.freeze(['OPEN', 'NEEDS_REVIEW', 'BLOCKED_BY_MISSING_DATA', 'RESOLVABLE', 'INFORMATIONAL', 'RESOLVED']);
  const SEVERITIES = Object.freeze(['CRITICAL', 'WARNING', 'INFO']);
  const DOMAINS = Object.freeze(['POSITIONS', 'INCOME', 'TRANSACTIONS', 'IMPORTS', 'FIXED_INCOME', 'CORPORATE_EVENTS', 'HISTORY', 'TAX', 'SYSTEM']);
  const DATA_STATES = Object.freeze(['KNOWN', 'UNKNOWN', 'PARTIAL', 'NEEDS_REVIEW', 'STALE', 'UNAVAILABLE', 'MISMATCH', 'MISSING', 'UNMAPPED', 'FIXTURE_REQUIRED', 'SHADOW', 'MANUAL']);

  const text = (value, fallback = '') => {
    const result = String(value ?? '').trim();
    return result || fallback;
  };
  const list = (value) => Array.isArray(value) ? value : [];
  const upper = (value) => text(value).toUpperCase();
  const identityPart = (value) => upper(value).replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 80) || 'UNKNOWN';
  const finite = (value) => Number.isFinite(Number(value));

  function issue(input = {}) {
    const state = STATES.includes(upper(input.state)) ? upper(input.state) : 'OPEN';
    const severity = SEVERITIES.includes(upper(input.severity)) ? upper(input.severity) : 'INFO';
    const domain = DOMAINS.includes(upper(input.domain)) ? upper(input.domain) : 'SYSTEM';
    const dataState = DATA_STATES.includes(upper(input.dataState)) ? upper(input.dataState) : 'UNKNOWN';
    const key = text(input.key, `${domain}:${identityPart(input.entityId || input.entityLabel)}:${identityPart(input.field)}`);
    return Object.freeze({
      id: text(input.id, `DQ-${key}`),
      key,
      state,
      severity,
      domain,
      dataState,
      rootCause: text(input.rootCause, 'DATA_QUALITY_REVIEW'),
      entityType: text(input.entityType, 'Registro'),
      entityId: text(input.entityId, 'unknown'),
      entityLabel: text(input.entityLabel, 'Registro sem identificação'),
      field: text(input.field, 'unknown'),
      message: text(input.message, 'Há uma condição de dados que merece conferência.'),
      impact: text(input.impact, 'Pode limitar a interpretação deste dado.'),
      recommendedAction: text(input.recommendedAction, 'Revisar a origem do dado.'),
      actionType: text(input.actionType, 'REVIEW'),
      route: text(input.route),
      source: text(input.source, 'derived_read_only'),
      coverage: text(input.coverage, 'UNKNOWN'),
      confidence: text(input.confidence, 'LOW'),
      safeNavigation: input.safeNavigation !== false,
      financialWriteRequired: input.financialWriteRequired === true,
      manualReviewRequired: input.manualReviewRequired === true || state === 'NEEDS_REVIEW',
      details: text(input.details),
    });
  }

  function fromLegacy(entry, defaults = {}) {
    if (!entry) return null;
    const severity = upper(entry.severity) === 'CRITICAL' ? 'CRITICAL' : upper(entry.severity) === 'WARNING' ? 'WARNING' : 'INFO';
    const legacyDomain = ({
      'ATIVOS': 'POSITIONS',
      'DIVIDENDOS': 'INCOME',
      'RENDA FIXA': 'FIXED_INCOME',
      'MOVIMENTACOES': 'TRANSACTIONS',
      'DUPLICIDADES': 'TRANSACTIONS',
      'MOEDAS': 'POSITIONS',
      'CONFIGURACOES': 'SYSTEM',
    })[upper(entry.category).normalize('NFD').replace(/[\u0300-\u036f]/g, '')] || defaults.domain;
    return issue({
      ...defaults,
      id: entry.id,
      key: entry.key || entry.identityKey,
      severity,
      state: entry.state || (severity === 'INFO' ? 'INFORMATIONAL' : 'NEEDS_REVIEW'),
      domain: entry.domain || legacyDomain,
      dataState: entry.dataState || (severity === 'INFO' ? 'KNOWN' : 'NEEDS_REVIEW'),
      rootCause: entry.rootCause || entry.category || defaults.rootCause,
      entityType: entry.entityType,
      entityId: entry.entityId || entry.identitySummary,
      entityLabel: entry.entityLabel,
      field: entry.field,
      message: entry.message,
      impact: entry.impact || entry.recommendation,
      recommendedAction: entry.recommendedAction || entry.recommendation,
      actionType: entry.actionType || 'REVIEW',
      route: entry.route,
      source: entry.source || 'legacy_data_quality',
      coverage: entry.coverage || 'PARTIAL',
      confidence: entry.confidence || 'MEDIUM',
      safeNavigation: entry.safeNavigation !== false,
      financialWriteRequired: false,
      manualReviewRequired: entry.manualReviewRequired,
    });
  }

  function collectLegacyIssues(entries) {
    return list(entries).map((entry) => fromLegacy(entry)).filter(Boolean);
  }

  function collectKnownLimitations(input = {}) {
    const issues = [];
    if (input.xpStatus === 'FIXTURE_REQUIRED') issues.push(issue({
      key: 'IMPORTS:XP:FIXTURE_REQUIRED', state: 'BLOCKED_BY_MISSING_DATA', severity: 'INFO', domain: 'IMPORTS', dataState: 'FIXTURE_REQUIRED',
      rootCause: 'IMPORT_FIXTURE_REQUIRED', entityType: 'Importador', entityId: 'XP', entityLabel: 'XP', field: 'fixture',
      message: 'A fonte XP permanece dependente de fixture validada.', impact: 'A cobertura da importação XP não pode ser tratada como completa.',
      recommendedAction: 'Disponibilizar fixture legítima e revisar a prévia antes de qualquer confirmação.', actionType: 'IMPORT_PREVIEW', route: 'import-center', source: 'product_contract', coverage: 'UNAVAILABLE', confidence: 'HIGH',
    }));
    if (input.btgStatus === 'FIXTURE_REQUIRED') issues.push(issue({
      key: 'IMPORTS:BTG:FIXTURE_REQUIRED', state: 'BLOCKED_BY_MISSING_DATA', severity: 'INFO', domain: 'IMPORTS', dataState: 'FIXTURE_REQUIRED',
      rootCause: 'IMPORT_FIXTURE_REQUIRED', entityType: 'Importador', entityId: 'BTG', entityLabel: 'BTG', field: 'fixture',
      message: 'A fonte BTG permanece dependente de fixture validada.', impact: 'A cobertura da importação BTG não pode ser tratada como completa.',
      recommendedAction: 'Disponibilizar fixture legítima e revisar a prévia antes de qualquer confirmação.', actionType: 'IMPORT_PREVIEW', route: 'import-center', source: 'product_contract', coverage: 'UNAVAILABLE', confidence: 'HIGH',
    }));
    if (input.corporateEventsMode === 'SHADOW_READ_ONLY') issues.push(issue({
      key: 'CORPORATE_EVENTS:SHADOW_READ_ONLY', state: 'INFORMATIONAL', severity: 'INFO', domain: 'CORPORATE_EVENTS', dataState: 'SHADOW',
      rootCause: 'CORPORATE_EVENT_AUTHORITY_NOT_ENABLED', entityType: 'Eventos corporativos', entityId: 'shadow', entityLabel: 'Eventos corporativos', field: 'mode',
      message: 'Eventos corporativos permanecem em modo shadow somente leitura.', impact: 'Nenhum evento é realizado automaticamente nem altera a posição corrente.',
      recommendedAction: 'Revisar manualmente eventos relevantes quando houver evidência suficiente.', actionType: 'READ_ONLY_REVIEW', route: 'confiabilidade', source: 'product_contract', coverage: 'PARTIAL', confidence: 'HIGH',
    }));
    if (input.fixedIncomeManualAuthority === true) issues.push(issue({
      key: 'FIXED_INCOME:MANUAL_AUTHORITY', state: 'INFORMATIONAL', severity: 'INFO', domain: 'FIXED_INCOME', dataState: 'MANUAL',
      rootCause: 'FIXED_INCOME_MANUAL_AUTHORITY', entityType: 'Renda fixa', entityId: 'manual-authority', entityLabel: 'Renda fixa manual', field: 'authority',
      message: 'Valores manuais de renda fixa continuam sendo a autoridade atual.', impact: 'Cotações derivadas não podem sobrescrever o valor informado pelo usuário.',
      recommendedAction: 'Revisar a origem manual quando necessário; nenhuma sobrescrita automática é feita.', actionType: 'READ_ONLY_REVIEW', route: 'renda-fixa', source: 'product_contract', coverage: 'PARTIAL', confidence: 'HIGH',
    }));
    return issues;
  }

  function collectSignals(input = {}) {
    const issues = [...collectLegacyIssues(input.legacyIssues), ...collectKnownLimitations(input)];
    const assets = list(input.assets);
    assets.forEach((asset, index) => {
      const label = text(asset.ticker || asset.symbol, `Ativo ${index + 1}`);
      if (!text(asset.ticker || asset.symbol)) issues.push(issue({
        key: `POSITIONS:${index}:MISSING_TICKER`, state: 'RESOLVABLE', severity: 'WARNING', domain: 'POSITIONS', dataState: 'MISSING', rootCause: 'POSITION_IDENTITY_MISSING',
        entityType: 'Ativo', entityId: String(index), entityLabel: label, field: 'ticker', message: 'Ativo sem ticker identificável.', impact: 'A posição pode não ser reconciliada com histórico, cotações ou proventos.', recommendedAction: 'Revisar a identificação do ativo.', actionType: 'REVIEW', route: 'ativos', source: 'assets', coverage: 'PARTIAL', confidence: 'HIGH',
      }));
      if (!finite(asset.qty ?? asset.quantity)) issues.push(issue({
        key: `POSITIONS:${identityPart(label)}:UNKNOWN_QUANTITY`, state: 'BLOCKED_BY_MISSING_DATA', severity: 'WARNING', domain: 'POSITIONS', dataState: 'UNKNOWN', rootCause: 'POSITION_QUANTITY_UNKNOWN',
        entityType: 'Ativo', entityId: label, entityLabel: label, field: 'quantity', message: 'Quantidade da posição não está disponível.', impact: 'Totais derivados que dependem de quantidade devem permanecer parciais.', recommendedAction: 'Revisar a origem da posição; não interpretar ausência como zero.', actionType: 'REVIEW', route: 'ativos', source: 'assets', coverage: 'PARTIAL', confidence: 'HIGH',
      }));
    });
    list(input.transactions).forEach((tx, index) => {
      const type = upper(tx.type || tx.kind || tx.operation);
      if (/SELL|VENDA/.test(type) && !finite(tx.costBasis ?? tx.allocatedCostBasis)) issues.push(issue({
        key: `TRANSACTIONS:${index}:UNKNOWN_COST_BASIS`, state: 'NEEDS_REVIEW', severity: 'CRITICAL', domain: 'TAX', dataState: 'NEEDS_REVIEW', rootCause: 'SALE_COST_BASIS_MISSING',
        entityType: 'Movimentação', entityId: String(index), entityLabel: text(tx.ticker || tx.asset, `Venda ${index + 1}`), field: 'costBasis', message: 'Venda sem custo de aquisição confiável.', impact: 'Resultado realizado não pode ser tratado como definitivo.', recommendedAction: 'Revisar documentos e a reconstrução do custo antes de usar o resultado fiscal.', actionType: 'REVIEW', route: 'relatorios', source: 'transactions', coverage: 'PARTIAL', confidence: 'HIGH',
      }));
    });
    return issues;
  }

  function dedupeIssues(items) {
    const seen = new Map();
    list(items).forEach((entry) => {
      const normalized = entry?.id && entry?.state ? entry : issue(entry);
      const previous = seen.get(normalized.key);
      if (!previous || severityRank(normalized.severity) < severityRank(previous.severity)) seen.set(normalized.key, normalized);
    });
    return [...seen.values()];
  }

  function severityRank(value) { return ({ CRITICAL: 1, WARNING: 2, INFO: 3 }[upper(value)] || 4); }
  function stateRank(value) { return ({ OPEN: 1, NEEDS_REVIEW: 1, RESOLVABLE: 2, BLOCKED_BY_MISSING_DATA: 3, INFORMATIONAL: 4, RESOLVED: 5 }[upper(value)] || 9); }

  function build(input = {}) {
    const issues = dedupeIssues(collectSignals(input));
    const by = (field) => issues.reduce((result, item) => { const key = item[field]; result[key] = (result[key] || 0) + 1; return result; }, {});
    const rootCauses = Object.values(issues.reduce((result, item) => {
      const key = item.rootCause;
      if (!result[key]) result[key] = { rootCause: key, count: 0, issueIds: [], domains: new Set(), states: new Set(), severities: new Set() };
      result[key].count += 1; result[key].issueIds.push(item.id); result[key].domains.add(item.domain); result[key].states.add(item.state); result[key].severities.add(item.severity); return result;
    }, {})).map((group) => ({ ...group, domains: [...group.domains], states: [...group.states], severities: [...group.severities] })).sort((a, b) => b.count - a.count || a.rootCause.localeCompare(b.rootCause));
    return Object.freeze({
      issues: Object.freeze(issues),
      summary: Object.freeze({ total: issues.length, open: issues.filter((item) => ['OPEN', 'NEEDS_REVIEW', 'RESOLVABLE', 'BLOCKED_BY_MISSING_DATA'].includes(item.state)).length, needsReview: issues.filter((item) => item.state === 'NEEDS_REVIEW').length, informational: issues.filter((item) => item.state === 'INFORMATIONAL').length, resolved: issues.filter((item) => item.state === 'RESOLVED').length, critical: issues.filter((item) => item.severity === 'CRITICAL').length, warning: issues.filter((item) => item.severity === 'WARNING').length, info: issues.filter((item) => item.severity === 'INFO').length }),
      byDomain: Object.freeze(by('domain')),
      byState: Object.freeze(by('state')),
      rootCauses: Object.freeze(rootCauses),
      writeCount: 0,
      generatedAt: new Date().toISOString(),
    });
  }

  function filter(model, filters = {}) {
    const search = upper(filters.search);
    return list(model?.issues).filter((item) => (!filters.state || filters.state === 'ALL' || item.state === filters.state) && (!filters.severity || filters.severity === 'ALL' || item.severity === filters.severity) && (!filters.domain || filters.domain === 'ALL' || item.domain === filters.domain) && (!search || [item.entityLabel, item.message, item.rootCause, item.field].some((value) => upper(value).includes(search)))).sort((a, b) => stateRank(a.state) - stateRank(b.state) || severityRank(a.severity) - severityRank(b.severity) || a.entityLabel.localeCompare(b.entityLabel));
  }

  return { STATES, SEVERITIES, DOMAINS, DATA_STATES, issue, collectSignals, collectKnownLimitations, dedupeIssues, build, filter, severityRank, stateRank };
});
