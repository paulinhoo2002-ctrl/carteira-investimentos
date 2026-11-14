/*
 * SM122 — Conciliação de posição (somente leitura, sem nova fonte de verdade).
 * Não altera S.assets, S.aportes nem qualquer cálculo existente. Recebe dados, devolve classificação.
 * Regras:
 *  - ausência de cobertura histórica comprovada NÃO é cobertura completa;
 *  - dado desconhecido NÃO vira zero (preço ausente, quantidade inválida => incompleto);
 *  - CONCILIADA só com cobertura COMPLETA comprovada, derivação completa e quantidades iguais.
 */
(function (root) {
  'use strict';

  var COVERAGE = { COMPLETE: 'COMPLETE', PARTIAL_OR_UNKNOWN: 'PARTIAL_OR_UNKNOWN' };
  var STATUS = { CONCILIADA: 'CONCILIADA', NAO_CONCILIADA: 'NAO_CONCILIADA', SEM_MOVIMENTOS: 'SEM_MOVIMENTOS' };

  function norm(value) { return String(value == null ? '' : value).trim().toUpperCase(); }

  function deriveFromMovements(movements) {
    var rows = (movements || []).filter(function (m) { return m && typeof m === 'object'; });
    rows = rows.slice().sort(function (a, b) {
      var da = String(a.date || ''), db = String(b.date || '');
      if (da !== db) return da < db ? -1 : 1;
      return String(a.id == null ? '' : a.id) < String(b.id == null ? '' : b.id) ? -1 : 1;
    });
    var flags = [], complete = true, qty = 0, cost = 0, seen = {};
    rows.forEach(function (m) {
      if (m.id == null || String(m.id) === '') { flags.push('MISSING_MOVEMENT_ID'); complete = false; }
      else if (seen[String(m.id)]) { flags.push('DUPLICATE_MOVEMENT'); complete = false; return; }
      else { seen[String(m.id)] = true; }
      var q = Math.abs(Number(m.qty));
      if (!(q > 0)) { flags.push('MOVEMENT_QUANTITY_UNKNOWN'); complete = false; return; }
      // Operação ausente ou desconhecida NÃO vira compra: a posição fica incompleta (SM132, P1).
      var rawOp = m.operation != null && m.operation !== '' ? m.operation : m.op;
      var op = String(rawOp == null ? '' : rawOp).trim().toLowerCase();
      if (['compra', 'buy', 'purchase', 'venda', 'sell'].indexOf(op) === -1) { flags.push('OPERATION_UNKNOWN'); complete = false; return; }
      if (op === 'venda' || op === 'sell') {
        if (qty <= 0) { flags.push('SALE_WITHOUT_POSITION'); complete = false; return; }
        var sold = Math.min(q, qty);
        var avg = cost / qty;
        cost -= avg * sold;
        qty -= sold;
        if (sold < q) { flags.push('SALE_EXCEEDS_POSITION'); complete = false; }
        return;
      }
      var price = Number(m.price);
      var total = Number(m.totalValue != null ? m.totalValue : m.value);
      var unit = price > 0 ? price : (total > 0 ? total / q : NaN);
      if (!(unit > 0)) { flags.push('MOVEMENT_PRICE_UNKNOWN'); complete = false; return; }
      qty += q;
      cost += q * unit;
    });
    var hasMovements = rows.length > 0;
    return {
      hasMovements: hasMovements,
      qty: hasMovements ? qty : null,
      cost: hasMovements ? cost : null,
      avgPrice: hasMovements && qty > 0 ? cost / qty : null,
      complete: hasMovements && complete,
      flags: Array.from(new Set(flags)),
      lastDate: hasMovements ? String(rows[rows.length - 1].date || '') || null : null
    };
  }

  function reconcilePosition(registered, movements, options) {
    var opts = options || {};
    var ticker = norm(registered && registered.ticker);
    var rows = (movements || []).filter(function (m) { return norm(m && m.ticker) === ticker; });
    var d = deriveFromMovements(rows);
    var coverage = opts.coverage === COVERAGE.COMPLETE ? COVERAGE.COMPLETE : COVERAGE.PARTIAL_OR_UNKNOWN;
    var registeredQty = Number(registered && registered.qty);
    var derivedQty = d.hasMovements ? d.qty : null;
    var difference = derivedQty == null ? null : derivedQty - registeredQty;
    var status, notice = null;
    if (!d.hasMovements) {
      status = STATUS.SEM_MOVIMENTOS;
      notice = 'Sem movimentações disponíveis: não há quantidade derivada para comparar.';
    } else if (coverage !== COVERAGE.COMPLETE) {
      status = STATUS.NAO_CONCILIADA;
      notice = 'Cobertura histórica não comprovada: a quantidade derivada dos lançamentos pode não representar a posição atual.';
    } else if (!d.complete) {
      status = STATUS.NAO_CONCILIADA;
      notice = 'Lançamentos incompletos ou inconsistentes: ' + d.flags.join(', ') + '.';
    } else if (Math.abs(difference) < 1e-9) {
      status = STATUS.CONCILIADA;
    } else {
      status = STATUS.NAO_CONCILIADA;
      notice = 'Quantidade registrada difere da derivada dos lançamentos.';
    }
    return {
      ticker: ticker,
      registeredQty: registeredQty,
      derivedQty: derivedQty,
      difference: difference,
      derivedAvgPrice: d.avgPrice,
      derivedCost: d.cost,
      coverage: coverage,
      status: status,
      complete: d.complete,
      flags: d.flags,
      referenceDate: d.lastDate,
      notice: notice
    };
  }

  // Apresentação (SM122-R): traduz o resultado de reconcilePosition em rótulo. Não recalcula nada.
  // Quantidades iguais com cobertura não comprovada NUNCA viram "Posição conciliada".
  var LABEL = {
    INSUFICIENTE: 'Dados insuficientes para comparar',
    DIVERGENCIA_INCOMPLETA: 'Divergência identificada · histórico incompleto',
    COINCIDEM_NAO_COMPROVADA: 'Quantidades coincidem · conciliação não comprovada',
    DIVERGENCIA: 'Divergência identificada',
    CONCILIADA: 'Posição conciliada'
  };
  function presentState(r) {
    if (!r || r.derivedQty == null || !r.complete) return { key: 'INSUFICIENTE', label: LABEL.INSUFICIENTE };
    var same = Math.abs(r.difference) < 1e-9;
    if (r.coverage !== COVERAGE.COMPLETE) {
      return same
        ? { key: 'COINCIDEM_NAO_COMPROVADA', label: LABEL.COINCIDEM_NAO_COMPROVADA }
        : { key: 'DIVERGENCIA_INCOMPLETA', label: LABEL.DIVERGENCIA_INCOMPLETA };
    }
    return same ? { key: 'CONCILIADA', label: LABEL.CONCILIADA } : { key: 'DIVERGENCIA', label: LABEL.DIVERGENCIA };
  }

  var api = { COVERAGE: COVERAGE, STATUS: STATUS, LABEL: LABEL, deriveFromMovements: deriveFromMovements, reconcilePosition: reconcilePosition, presentState: presentState };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PositionReconciliation = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
