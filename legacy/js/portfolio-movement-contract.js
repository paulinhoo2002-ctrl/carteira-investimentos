/**
 * Contrato puro de movimentação de carteira (Entrega 2A).
 *
 * Camada de seleção, normalização, identificação e prévia aritmética simples
 * para a futura interface da tela Aportes. Não é uma engine financeira.
 *
 * Não grava em S, não acessa localStorage/Firebase, não chama save/render,
 * não recalcula patrimônio/rentabilidade/preço médio e não reproduz
 * rfMovementValidation, saveRfMovimentacao nem syncAssetsFromAportes.
 *
 * Convenção de export: mesmo padrão UMD dos contratos raiz do projeto
 * (readonly-report-page-contract.js), com module.exports e instalação no
 * global quando carregado como script clássico.
 *
 * Identidade: este contrato não cria IDs artificiais. O assetId vem somente
 * de campos reais já existentes no ativo (asset.id, asset.assetId). Para
 * renda fixa, a identidade é sempre entregue por getEventAssetId. Ativos
 * sem ID real são excluídos das listas em vez de receberem um ID derivado.
 */
(function (root, factory) {
  const contract = factory();
  const exportedContract = Object.freeze({
    ...contract,
    default: contract,
  });

  if (typeof module === 'object' && module.exports) {
    module.exports = exportedContract;
  }

  const shouldInstallOnGlobal =
    root &&
    typeof document !== 'undefined' &&
    document.currentScript &&
    document.currentScript.type !== 'module';

  if (shouldInstallOnGlobal && !root.PortfolioMovementContract) {
    Object.defineProperty(root, 'PortfolioMovementContract', {
      configurable: false,
      enumerable: false,
      value: exportedContract,
      writable: false,
    });
  }
})(typeof globalThis !== 'undefined' ? globalThis : undefined, function () {
  const EPSILON = 1e-9;

  const FIXED_INCOME_TYPE_KEYS = Object.freeze(['RENDA FIXA', 'TESOURO DIRETO']);
  const RESERVE_TYPE_KEYS = Object.freeze(['RESERVA DE EMERGENCIA']);

  const MOVEMENT_ERROR_CODES = Object.freeze({
    INVALID_ASSET: 'INVALID_ASSET',
    INVALID_SALE_TYPE: 'INVALID_SALE_TYPE',
    INVALID_QUANTITY: 'INVALID_QUANTITY',
    INSUFFICIENT_QUANTITY: 'INSUFFICIENT_QUANTITY',
    INVALID_UNIT_PRICE: 'INVALID_UNIT_PRICE',
    INVALID_REDEMPTION_TYPE: 'INVALID_REDEMPTION_TYPE',
    INVALID_AMOUNT: 'INVALID_AMOUNT',
    INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  });

  function normalizeKey(value) {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  /**
   * Coerção numérica estrita (Entrega 2A).
   *
   * Aceita apenas formatos inequívocos:
   * - números nativos (incluindo 0, NaN/Infinity → fallback);
   * - strings simples com decimal pt-BR ou en-US, ex.: "10,5", "31,90", "1234.56".
   *
   * Não é parser monetário. Formatos ambíguos são rejeitados (fallback):
   * - "1.234,56" (separador de milhar pt-BR + decimal) — não tratado
   *   silenciosamente como 1.234. Deve ser entregue como número já
   *   normalizado pela UI ou por rfMoneyStrict/rfMovementValidation.
   * - "1.234.567" (múltiplos pontos) — rejeitado.
   * - "1,2,3" (múltiplas vírgulas) — rejeitado.
   *
   * A validação financeira oficial de RF continua em
   * rfMovementValidation (index.html); este contrato só produz preview.
   */
  function toFiniteNumber(value, fallback = null) {
    if (typeof value === 'string') {
      const s = String(value).trim().replace(/\s/g, '');
      const validFormat = /^[0-9]+([,.][0-9]+)?$/.test(s);
      if (!validFormat) return fallback;
      const n = parseFloat(s.replace(',', '.'));
      return Number.isFinite(n) ? n : fallback;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function isFixedIncomeTypeString(value) {
    return FIXED_INCOME_TYPE_KEYS.includes(normalizeKey(value));
  }

  function isReserveTypeString(value) {
    return RESERVE_TYPE_KEYS.includes(normalizeKey(value));
  }

  function assetTypeOf(asset) {
    return String((asset && (asset.type ?? asset.asset_type)) ?? '').trim();
  }

  function compareStrings(a, b) {
    return String(a).localeCompare(String(b));
  }

  function deepFreeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.freeze(value);
      Object.keys(value).forEach((key) => deepFreeze(value[key]));
    }
    return value;
  }

  function invalidResult(code, error) {
    return Object.freeze({ ok: false, error, code });
  }

  /**
   * 1. Lista de ativos disponíveis para venda (renda variável).
   */
  function buildSellableAssets(assets, options) {
    const list = Array.isArray(assets) ? assets : [];
    const opts = options && typeof options === 'object' ? options : {};
    const includeReserve = opts.includeReserve === true;
    const isFixedIncomeOverride = typeof opts.isFixedIncome === 'function' ? opts.isFixedIncome : null;
    const isReserveOverride = typeof opts.isReserve === 'function' ? opts.isReserve : null;

    const result = [];
    for (const asset of list) {
      if (!asset || typeof asset !== 'object') continue;

      const type = assetTypeOf(asset);
      let isFixedIncome = isFixedIncomeTypeString(type);
      let isReserve = isReserveTypeString(type);

      if (isFixedIncomeOverride) {
        try { isFixedIncome = !!isFixedIncomeOverride(asset); } catch (error) { isFixedIncome = false; }
      }
      if (isReserveOverride) {
        try { isReserve = !!isReserveOverride(asset); } catch (error) { isReserve = false; }
      }

      if (isFixedIncome) continue;
      if (isReserve && !includeReserve) continue;

      const qty = toFiniteNumber(asset.qty, null);
      if (qty === null || qty <= 0) continue;

      const ticker = String(asset.ticker ?? '').trim().toUpperCase();
      const assetId = String(asset.id ?? asset.assetId ?? '').trim();
      if (!assetId) continue;

      const currentPrice = toFiniteNumber(asset.current_price, 0);
      result.push(deepFreeze({
        assetId,
        ticker,
        name: String(asset.name ?? asset.product ?? asset.title ?? ticker ?? '').trim(),
        type,
        sector: String(asset.sector ?? asset.asset_sector ?? '').trim(),
        availableQuantity: qty,
        averagePrice: toFiniteNumber(asset.avg_price, 0),
        currentPrice,
        estimatedPositionValue: qty * currentPrice,
        movementKind: 'sale',
      }));
    }

    result.sort((a, b) => compareStrings(a.type, b.type) || compareStrings(a.ticker, b.ticker) || compareStrings(a.assetId, b.assetId));
    return Object.freeze(result);
  }

  /**
   * 2. Lista de títulos disponíveis para resgate (renda fixa).
   *
   * Helpers oficiais são injetados explicitamente; a lógica financeira de RF
   * não é duplicada. Se algum helper obrigatório não for função, a lista
   * retornada é vazia (falha previsível documentada nos testes).
   */
  const REDEEMABLE_HELPERS = Object.freeze([
    'isFixedIncomeAsset',
    'getPrincipalBalance',
    'getOfficialValues',
    'getEventAssetId',
    'getEventTicker',
  ]);

  function buildRedeemableAssets(assets, helpers, options) {
    const list = Array.isArray(assets) ? assets : [];
    const h = helpers && typeof helpers === 'object' ? helpers : {};
    if (!REDEEMABLE_HELPERS.every((name) => typeof h[name] === 'function')) {
      return Object.freeze([]);
    }

    const result = [];
    for (const asset of list) {
      if (!asset || typeof asset !== 'object') continue;

      let isRf = false;
      try { isRf = !!h.isFixedIncomeAsset(asset); } catch (error) { isRf = false; }
      if (!isRf) continue;

      let assetId = '';
      try { assetId = String(h.getEventAssetId(asset) ?? '').trim(); } catch (error) { assetId = ''; }
      if (!assetId) continue;

      let balance;
      try { balance = h.getPrincipalBalance(asset); } catch (error) { continue; }
      const appliedBalance = toFiniteNumber(
        balance && typeof balance === 'object' ? balance.value : balance,
        null
      );
      if (appliedBalance === null || appliedBalance <= 0) continue;

      let values = null;
      try { values = h.getOfficialValues(asset); } catch (error) { values = null; }
      const grossValue = values && typeof values === 'object' ? toFiniteNumber(values.gross, 0) : 0;
      const liquidValue = values && typeof values === 'object' ? toFiniteNumber(values.liquid, 0) : 0;

      let ticker = '';
      try { ticker = String(h.getEventTicker(asset) ?? '').trim().toUpperCase(); } catch (error) { ticker = ''; }

      result.push(deepFreeze({
        assetId,
        ticker,
        name: String(asset.name ?? asset.product ?? asset.title ?? ticker ?? '').trim(),
        type: assetTypeOf(asset) || 'Renda Fixa',
        subtype: String(asset.rf_subtype ?? asset.fixed_subtype ?? asset.bondType ?? asset.sector ?? asset.fixed_indexer ?? '').trim(),
        issuer: String(asset.fixed_issuer ?? asset.issuer ?? '').trim(),
        appliedBalance,
        grossValue,
        liquidValue,
        maturityDate: String(asset.rf_maturity_date ?? asset.fixed_maturity_date ?? asset.maturityDate ?? asset.vencimento ?? '').trim(),
        liquidity: String(asset.dailyLiquidity ?? asset.liquidity ?? '').trim(),
        movementKind: 'redemption',
      }));
    }

    result.sort((a, b) => compareStrings(a.subtype, b.subtype) || compareStrings(a.ticker, b.ticker) || compareStrings(a.assetId, b.assetId));
    return Object.freeze(result);
  }

  /**
   * 3. Detecção automática da classe da operação.
   */
  function resolvePortfolioMovementKind(asset) {
    if (!asset || typeof asset !== 'object') return 'unsupported';
    if (asset.movementKind === 'sale' || asset.movementKind === 'redemption') {
      return asset.movementKind;
    }
    const type = assetTypeOf(asset);
    if (!type) return 'unsupported';
    if (isFixedIncomeTypeString(type)) return 'redemption';
    if (isReserveTypeString(type)) return 'unsupported';
    return 'sale';
  }

  /**
   * 4. Prévia de venda total ou parcial (renda variável).
   */
  function buildVariableIncomeSalePreview(asset, input) {
    if (!asset || typeof asset !== 'object' || !input || typeof input !== 'object') {
      return invalidResult(MOVEMENT_ERROR_CODES.INVALID_ASSET, 'Ativo ou entrada inválidos.');
    }

    const assetId = String(asset.assetId ?? '').trim();
    const available = toFiniteNumber(asset.availableQuantity ?? asset.qty, null);
    if (!assetId || available === null || available <= 0) {
      return invalidResult(MOVEMENT_ERROR_CODES.INVALID_ASSET, 'Ativo não vendável.');
    }

    const saleType = input.saleType;
    if (saleType !== 'total' && saleType !== 'partial') {
      return invalidResult(MOVEMENT_ERROR_CODES.INVALID_SALE_TYPE, 'Tipo de venda inválido.');
    }

    const unitPrice = toFiniteNumber(input.unitPrice, null);
    if (unitPrice === null || unitPrice <= 0) {
      return invalidResult(MOVEMENT_ERROR_CODES.INVALID_UNIT_PRICE, 'Preço unitário deve ser maior que zero.');
    }

    const isTotal = saleType === 'total';
    let quantityToSell;
    if (isTotal) {
      quantityToSell = available;
    } else {
      const qty = toFiniteNumber(input.quantity, null);
      if (qty === null || qty <= 0) {
        return invalidResult(MOVEMENT_ERROR_CODES.INVALID_QUANTITY, 'Quantidade deve ser maior que zero.');
      }
      if (qty > available + EPSILON) {
        return invalidResult(MOVEMENT_ERROR_CODES.INSUFFICIENT_QUANTITY, 'Quantidade acima da posição disponível.');
      }
      quantityToSell = qty;
    }

    const quantityRemaining = Math.max(0, available - quantityToSell);
    return deepFreeze({
      ok: true,
      movementKind: 'sale',
      saleType,
      assetId,
      quantityAvailable: available,
      quantityToSell,
      quantityRemaining,
      unitPrice,
      estimatedGrossValue: quantityToSell * unitPrice,
      isTotal,
    });
  }

  /**
   * 5. Prévia informativa de resgate total ou parcial (renda fixa).
   *
   * Apenas prévia de UI: não calcula IR/IOF/bruto/líquido, não cria rfEvent e
   * não afirma validação definitiva. A validação financeira oficial continua
   * sendo rfMovementValidation (index.html), chamada na integração futura.
   */
  function buildFixedIncomeRedemptionPreview(asset, input) {
    if (!asset || typeof asset !== 'object' || !input || typeof input !== 'object') {
      return invalidResult(MOVEMENT_ERROR_CODES.INVALID_ASSET, 'Título ou entrada inválidos.');
    }

    const assetId = String(asset.assetId ?? '').trim();
    const balance = toFiniteNumber(asset.appliedBalance, null);
    if (!assetId || balance === null || balance <= 0) {
      return invalidResult(MOVEMENT_ERROR_CODES.INVALID_ASSET, 'Título sem saldo resgatável.');
    }

    const redemptionType = input.redemptionType;
    if (redemptionType !== 'total' && redemptionType !== 'partial') {
      return invalidResult(MOVEMENT_ERROR_CODES.INVALID_REDEMPTION_TYPE, 'Tipo de resgate inválido.');
    }

    const isTotal = redemptionType === 'total';
    let amountToRedeem;
    if (isTotal) {
      amountToRedeem = balance;
    } else {
      const amount = toFiniteNumber(input.amount, null);
      if (amount === null || amount <= 0) {
        return invalidResult(MOVEMENT_ERROR_CODES.INVALID_AMOUNT, 'Valor deve ser maior que zero.');
      }
      if (amount > balance + EPSILON) {
        return invalidResult(MOVEMENT_ERROR_CODES.INSUFFICIENT_BALANCE, 'Valor acima do saldo disponível.');
      }
      amountToRedeem = amount;
    }

    const balanceRemaining = Math.max(0, balance - amountToRedeem);
    return deepFreeze({
      ok: true,
      movementKind: 'redemption',
      redemptionType,
      assetId,
      balanceAvailable: balance,
      amountToRedeem,
      balanceRemaining,
      isTotal,
      requiresOfficialValidation: true,
    });
  }

  /**
   * 6. Busca por assetId (nunca apenas por ticker).
   */
  function findPortfolioMovementAsset(list, assetId) {
    if (!Array.isArray(list)) return null;
    const id = String(assetId ?? '').trim();
    if (!id) return null;
    for (const item of list) {
      if (item && typeof item === 'object' && String(item.assetId ?? '').trim() === id) {
        return deepFreeze({ ...item });
      }
    }
    return null;
  }

  return Object.freeze({
    MOVEMENT_ERROR_CODES,
    buildSellableAssets,
    buildRedeemableAssets,
    resolvePortfolioMovementKind,
    buildVariableIncomeSalePreview,
    buildFixedIncomeRedemptionPreview,
    findPortfolioMovementAsset,
  });
});
