import type {
  ReadonlyGoalsFlags,
  ReadonlyGoalsMetrics,
  ReadonlyGoalsIncomeMetrics,
  ReadonlyGoalsAssetConfig,
  ReadonlyGoalsAllocationItem,
  ReadonlyGoalsHistoryGroup,
  ReadonlyGoalsSnapshot,
} from './goalsReadonlyContract.d.ts';

export interface ReadonlyGoalsViewModel {
  readonly flags: ReadonlyGoalsFlags;
  readonly patrimonyCard: ReadonlyGoalsCard | null;
  readonly incomeCard: ReadonlyGoalsCard | null;
  readonly assetGoalCard: ReadonlyGoalsAssetCard | null;
  readonly allocationSection: ReadonlyGoalsAllocationSection | null;
  readonly historySection: ReadonlyGoalsHistorySection | null;
  readonly hasAnyGoal: boolean;
  readonly originLabel: string;
  readonly generatedAt: string;
  readonly notice: string;
}

export interface ReadonlyGoalsCard {
  readonly title: string;
  readonly currentLabel: string;
  readonly currentValue: string;
  readonly targetLabel: string;
  readonly targetValue: string;
  readonly percentLabel: string;
  readonly percentValue: string | null;
  readonly barPercent: number;
  readonly tone: 'muted' | 'ok' | 'info' | 'warn' | 'danger';
  readonly statusText: string;
  readonly hasData: boolean;
  readonly missingValue: string | null;
  readonly excessValue: string | null;
}

export interface ReadonlyGoalsAssetCard {
  readonly typeLabel: string;
  readonly typeValue: string;
  readonly tickerLabel: string;
  readonly tickerValue: string;
  readonly monthlyContributionLabel: string;
  readonly monthlyContributionValue: string;
  readonly annualVariationLabel: string;
  readonly annualVariationValue: string;
  readonly finalValueLabel: string;
  readonly finalValueValue: string;
}

export interface ReadonlyGoalsAllocationSection {
  readonly items: readonly ReadonlyGoalsAllocationRow[];
}

export interface ReadonlyGoalsAllocationRow {
  readonly type: string;
  readonly targetPct: number;
  readonly targetValue: string;
  readonly actualPct: number;
  readonly actualValue: string;
}

export interface ReadonlyGoalsHistorySection {
  readonly summary: {
    readonly totalLabel: string;
    readonly totalValue: string;
    readonly monthCountLabel: string;
    readonly monthCountValue: string;
    readonly avgLabel: string;
    readonly avgValue: string;
  };
  readonly groups: readonly ReadonlyGoalsHistoryRow[];
}

export interface ReadonlyGoalsHistoryRow {
  readonly monthLabel: string;
  readonly totalValue: string;
  readonly countValue: string;
  readonly diffValue: string | null;
  readonly diffPctValue: string | null;
  readonly isCurrent: boolean;
}

// --- Format helpers ---

export function formatReadonlyCurrencyOrMissing(value: number | null): string {
  if (!Number.isFinite(value as number)) {
    return 'Nao informado';
  }

  return new Intl.NumberFormat('pt-BR', {
    currency: 'BRL',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(Number(value));
}

export function formatReadonlyPercentOrMissing(value: number | null): string {
  if (!Number.isFinite(value as number)) {
    return 'Nao informado';
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(Number(value) / 100);
}

export function formatReadonlyPercentSimple(value: number | null): string {
  if (!Number.isFinite(value as number)) {
    return 'Nao informado';
  }

  return `${Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

export function formatReadonlyTextOrMissing(value: string | null | undefined): string {
  const normalized = String(value ?? '').trim();
  return normalized || 'Nao informado';
}

export function formatReadonlyDateTime(value: string | null | undefined): string {
  if (!value) {
    return 'Nao informado';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Nao informado';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date);
}

// --- Card builders ---

function buildPatrimonyCard(
  metrics: ReadonlyGoalsMetrics,
  flags: ReadonlyGoalsFlags,
): ReadonlyGoalsCard | null {
  if (!flags.hasPatrimonyGoal && !metrics.hasCurrent) {
    return null;
  }

  const hasData = metrics.hasCurrent && metrics.hasTarget;
  const currentValue = formatReadonlyCurrencyOrMissing(metrics.current);
  const targetValue = formatReadonlyCurrencyOrMissing(metrics.target);
  const percentValue = hasData ? formatReadonlyPercentSimple(metrics.percent) : null;
  const percentLabel = hasData && percentValue !== null ? percentValue : 'Nao calculavel';

  const barPercent = hasData ? Math.max(0, Math.min(100, metrics.barPercent)) : 0;

  let statusText: string;
  if (!flags.hasPatrimonyGoal) {
    statusText = 'Meta patrimonial nao configurada';
  } else if (!metrics.hasCurrent) {
    statusText = 'Patrimonio atual indisponivel';
  } else if (metrics.reached) {
    statusText = 'Meta atingida';
  } else if (metrics.missing !== null) {
    statusText = `Faltam ${formatReadonlyCurrencyOrMissing(metrics.missing)}`;
  } else {
    statusText = 'Em progresso';
  }

  const missingValue = metrics.missing !== null ? formatReadonlyCurrencyOrMissing(metrics.missing) : null;
  const excessValue = metrics.excess !== null ? formatReadonlyCurrencyOrMissing(metrics.excess) : null;

  return {
    title: 'Meta patrimonial',
    currentLabel: 'Patrimonio atual',
    currentValue,
    targetLabel: 'Meta',
    targetValue,
    percentLabel,
    percentValue,
    barPercent: Math.max(0, Math.min(100, metrics.barPercent)),
    tone: metrics.tone,
    statusText,
    hasData,
    missingValue,
    excessValue,
  };
}

function buildIncomeCard(
  metrics: ReadonlyGoalsIncomeMetrics,
  flags: ReadonlyGoalsFlags,
): ReadonlyGoalsCard | null {
  if (!flags.hasIncomeGoal && !metrics.hasCurrent && !metrics.hasData) {
    return null;
  }

  const hasData = metrics.hasCurrent && metrics.hasTarget;
  const currentValue = formatReadonlyCurrencyOrMissing(metrics.current);
  const targetValue = formatReadonlyCurrencyOrMissing(metrics.target);
  const percentValue = hasData ? formatReadonlyPercentSimple(metrics.percent) : null;
  const percentLabel = hasData && percentValue !== null ? percentValue : 'Nao calculavel';

  const barPercent = hasData ? Math.max(0, Math.min(100, metrics.barPercent)) : 0;

  let statusText: string;
  if (!flags.hasIncomeGoal) {
    statusText = 'Meta de renda passiva nao configurada';
  } else if (!metrics.hasCurrent) {
    statusText = 'Renda atual indisponivel';
  } else if (metrics.reached) {
    statusText = 'Meta atingida';
  } else if (metrics.missing !== null) {
    statusText = `Faltam ${formatReadonlyCurrencyOrMissing(metrics.missing)}/mes`;
  } else {
    statusText = 'Em progresso';
  }

  const missingValue = metrics.missing !== null ? formatReadonlyCurrencyOrMissing(metrics.missing) : null;
  const excessValue = metrics.excess !== null ? formatReadonlyCurrencyOrMissing(metrics.excess) : null;

  return {
    title: 'Meta de renda passiva',
    currentLabel: metrics.currentMonthLabel || 'Mes corrente',
    currentValue,
    targetLabel: 'Meta mensal',
    targetValue,
    percentLabel,
    percentValue,
    barPercent,
    tone: metrics.tone,
    statusText,
    hasData,
    missingValue,
    excessValue,
  };
}

function buildAssetGoalCard(config: ReadonlyGoalsAssetConfig): ReadonlyGoalsAssetCard | null {
  if (
    !config.type &&
    !config.ticker &&
    config.monthlyContribution === 0 &&
    config.annualVariation === 0 &&
    config.finalValue === 0
  ) {
    return null;
  }

  return {
    typeLabel: 'Tipo',
    typeValue: formatReadonlyTextOrMissing(config.type),
    tickerLabel: 'Ativo',
    tickerValue: formatReadonlyTextOrMissing(config.ticker),
    monthlyContributionLabel: 'Aporte mensal',
    monthlyContributionValue: formatReadonlyCurrencyOrMissing(config.monthlyContribution),
    annualVariationLabel: 'Variacao anual',
    annualVariationValue: `${formatReadonlyPercentSimple(config.annualVariation)}`,
    finalValueLabel: 'Valor final alvo',
    finalValueValue: formatReadonlyCurrencyOrMissing(config.finalValue),
  };
}

function buildAllocationSection(
  items: readonly ReadonlyGoalsAllocationItem[],
): ReadonlyGoalsAllocationSection | null {
  if (!items || items.length === 0) {
    return null;
  }

  const rows: ReadonlyGoalsAllocationRow[] = items.map((item) => ({
    type: item.type,
    targetPct: item.pct,
    targetValue: formatReadonlyPercentSimple(item.pct),
    actualPct: 0,
    actualValue: 'Nao informado',
  }));

  return {
    items: rows,
  };
}

function buildHistorySection(
  history: {
    readonly groups: readonly ReadonlyGoalsHistoryGroup[];
    readonly summary: {
      readonly total: number;
      readonly monthCount: number;
      readonly avg: number | null;
    };
  },
): ReadonlyGoalsHistorySection | null {
  if (!history.groups || history.groups.length === 0) {
    return null;
  }

  const summary = {
    totalLabel: 'Total historico',
    totalValue: formatReadonlyCurrencyOrMissing(history.summary.total),
    monthCountLabel: 'Meses com lancamentos',
    monthCountValue: String(history.summary.monthCount),
    avgLabel: 'Media mensal',
    avgValue: formatReadonlyCurrencyOrMissing(history.summary.avg),
  };

  const rows: ReadonlyGoalsHistoryRow[] = history.groups.map((group) => ({
    monthLabel: group.label,
    totalValue: formatReadonlyCurrencyOrMissing(group.total),
    countValue: String(group.count),
    diffValue: group.diff !== null ? formatReadonlyCurrencyOrMissing(group.diff) : null,
    diffPctValue:
      group.diffPct !== null
        ? `${group.diffPct >= 0 ? '+' : ''}${Math.abs(group.diffPct).toLocaleString('pt-BR', {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })}%`
        : null,
    isCurrent: group.isCurrent,
  }));

  return {
    summary,
    groups: rows,
  };
}

export function createReadonlyGoalsViewModel(
  snapshot: ReadonlyGoalsSnapshot,
): ReadonlyGoalsViewModel {
  const flags = snapshot.flags;

  const hasAnyGoal =
    flags.hasPatrimonyGoal ||
    flags.hasIncomeGoal ||
    flags.hasAssetGoal ||
    flags.hasAllocationGoal;

  return {
    flags,
    patrimonyCard: buildPatrimonyCard(snapshot.patrimony, flags),
    incomeCard: buildIncomeCard(snapshot.income, flags),
    assetGoalCard: flags.hasAssetGoal ? buildAssetGoalCard(snapshot.assetGoal) : null,
    allocationSection: flags.hasAllocationGoal
      ? buildAllocationSection(snapshot.allocation.items)
      : null,
    historySection: snapshot.history.groups.length > 0
      ? buildHistorySection(snapshot.history)
      : null,
    hasAnyGoal,
    originLabel: snapshot.originLabel,
    generatedAt: snapshot.generatedAt,
    notice: snapshot.notice,
  };
}
