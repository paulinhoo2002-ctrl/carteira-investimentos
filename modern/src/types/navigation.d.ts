export type ModernPageId =
  | 'overview'
  | 'assets'
  | 'fixed-income'
  | 'provents'
  | 'contributions'
  | 'reports'
  | 'settings';

export interface ModernPage {
  id: ModernPageId;
  label: string;
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
