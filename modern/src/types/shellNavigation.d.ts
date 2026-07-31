import type { ModernPage, ModernPageId } from './navigation.mjs';

export type ShellNavigationGroupId =
  | 'PRIMARY'
  | 'SECONDARY'
  | 'MOBILE_BOTTOM'
  | 'MOBILE_MORE';

export type ShellNavigationId = ModernPageId | 'more';

export interface ShellNavigationGroups {
  PRIMARY: readonly ModernPageId[];
  SECONDARY: readonly ModernPageId[];
  MOBILE_BOTTOM: readonly ShellNavigationId[];
  MOBILE_MORE: readonly ModernPageId[];
}

export declare const SHELL_MORE_ITEM_ID: 'more';
export declare const SHELL_NAVIGATION_GROUPS: ShellNavigationGroups;
export declare function isShellNavigationGroupId(id: string): id is ShellNavigationGroupId;
export declare function getShellNavigationPageIds(): readonly ModernPageId[];
export declare function getModernPageByDisplayId(id: string, pages?: readonly ModernPage[]): ModernPage | null;
export declare function isModernPageId(id: string, pages?: readonly ModernPage[]): boolean;
export declare function validateShellNavigationAgainstPages(pages?: readonly ModernPage[]): readonly string[];
export declare function isShellNavigationContract(pages?: readonly ModernPage[]): boolean;
