export type AssetCategory = 'Acao demo' | 'FII demo' | 'ETF demo';
export type AssetTrend = 'positive' | 'neutral' | 'negative';

export interface AssetReportItem {
  readonly ticker: string;
  readonly name: string;
  readonly category: AssetCategory;
  readonly quantity: number;
  readonly averagePrice: number;
  readonly currentValue: number;
  readonly variationPct: number;
  readonly allocationPct: number;
  readonly trend: AssetTrend;
}

export const ASSETS_REPORT_UPDATED_AT = '15/07/2026, 10:30';

export const ASSETS_REPORT_ITEMS: readonly AssetReportItem[] = Object.freeze([
  Object.freeze({
    ticker: 'DEMO-ALFA11',
    name: 'Empresa Demonstrativa Alfa',
    category: 'Acao demo',
    quantity: 120,
    averagePrice: 18.4,
    currentValue: 2520,
    variationPct: 14.13,
    allocationPct: 36,
    trend: 'positive',
  }),
  Object.freeze({
    ticker: 'DEMO-BETA34',
    name: 'Fundo Demonstrativo Beta',
    category: 'FII demo',
    quantity: 80,
    averagePrice: 12.5,
    currentValue: 1000,
    variationPct: 0,
    allocationPct: 14.3,
    trend: 'neutral',
  }),
  Object.freeze({
    ticker: 'DEMO-GAMA3',
    name: 'Carteira Demonstrativa Gama',
    category: 'ETF demo',
    quantity: 45,
    averagePrice: 55.2,
    currentValue: 2140,
    variationPct: -13.86,
    allocationPct: 30.57,
    trend: 'negative',
  }),
  Object.freeze({
    ticker: 'DEMO-DELTA5',
    name: 'Ativo Demonstrativo Delta',
    category: 'Acao demo',
    quantity: 32,
    averagePrice: 41.75,
    currentValue: 1340,
    variationPct: 0.3,
    allocationPct: 19.13,
    trend: 'positive',
  }),
]);
