export type ModernPageId =
  | 'overview'
  | 'assets'
  | 'fixed-income'
  | 'provents'
  | 'contributions'
  | 'reports'
  | 'settings'
  | 'returns'
  | 'goals'
  | 'net-worth'
  | 'rebalance';

export interface ModernPage {
  id: ModernPageId;
  label: string;
  displayLabel: string;
  title: string;
  description: string;
  hint: string;
}

export interface DemoCard {
  label: string;
  value: string;
  hint: string;
}

export declare const MODERN_PAGES: readonly ModernPage[];
export declare const OVERVIEW_CARDS: readonly DemoCard[];
