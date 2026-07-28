import type { ReadonlyAssetSignalKey, ReadonlyAssetsSortKey } from './readonlyReportsViewModel';
import type { ReportsReadonlyDiagnostics } from './reportsRefreshController';

export const sortLabels: Record<ReadonlyAssetsSortKey, string> = {
  currentValueDesc: 'Maior valor da posicao',
  currentValueAsc: 'Menor valor da posicao',
  rentabilityPctDesc: 'Maior rentabilidade',
  rentabilityPctAsc: 'Menor rentabilidade',
  resultDesc: 'Maior resultado',
  resultAsc: 'Menor resultado',
  ticker: 'Ticker',
  name: 'Nome',
  signalPriority: 'Prioridade do sinal',
};

export const signalLabels: Record<ReadonlyAssetSignalKey, string> = {
  all: 'Todos',
  incomplete: 'Dados incompletos',
  concentration: 'Concentração alta',
  wait: 'Aguardar',
  attractive: 'Atrativo para aporte',
  neutral: 'Neutro',
};

export const signalBadgeVariant: Record<ReadonlyAssetSignalKey, 'neutral' | 'info' | 'warning'> = {
  all: 'neutral',
  incomplete: 'warning',
  concentration: 'warning',
  wait: 'warning',
  attractive: 'info',
  neutral: 'neutral',
};

export const diagnosticStatusLabel: Record<ReportsReadonlyDiagnostics['refreshStatus'], string> = {
  idle: 'Leitura pronta',
  updated: 'Leitura atualizada',
  fallback: 'Fallback readonly ativo',
  error: 'Ultimo snapshot valido preservado',
};

export const diagnosticStatusVariant: Record<
  ReportsReadonlyDiagnostics['refreshStatus'],
  'neutral' | 'positive' | 'warning' | 'negative'
> = {
  idle: 'neutral',
  updated: 'positive',
  fallback: 'warning',
  error: 'negative',
};

export const trendBadgeVariant: Record<'positive' | 'negative' | 'neutral', 'positive' | 'negative' | 'neutral'> = {
  positive: 'positive',
  negative: 'negative',
  neutral: 'neutral',
};

export function categoryBadgeVariant(category: string) {
  if (/etf/i.test(category)) {
    return 'info' as const;
  }

  if (/fii/i.test(category)) {
    return 'neutral' as const;
  }

  return 'positive' as const;
}

export function summarizeItemLabel(ticker: string, name: string) {
  return `${ticker} · ${name}`;
}
