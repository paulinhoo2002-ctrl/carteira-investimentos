import { MODERN_PAGES } from './navigation.mjs';

export const SHELL_MORE_ITEM_ID = 'more';

export const SHELL_NAVIGATION_GROUPS = Object.freeze({
  PRIMARY: Object.freeze([
    'overview',
    'assets',
    'provents',
    'returns',
    'goals',
    'net-worth',
    'rebalance',
  ]),
  SECONDARY: Object.freeze([
    'fixed-income',
    'contributions',
    'reports',
    'settings',
  ]),
  MOBILE_BOTTOM: Object.freeze([
    'overview',
    'assets',
    'provents',
    'returns',
    SHELL_MORE_ITEM_ID,
  ]),
  MOBILE_MORE: Object.freeze([
    'goals',
    'net-worth',
    'rebalance',
    'fixed-income',
    'contributions',
    'reports',
    'settings',
  ]),
});

export const isShellNavigationGroupId = (id) =>
  Object.prototype.hasOwnProperty.call(SHELL_NAVIGATION_GROUPS, id);

export const getShellNavigationPageIds = () => [
  ...SHELL_NAVIGATION_GROUPS.PRIMARY,
  ...SHELL_NAVIGATION_GROUPS.SECONDARY,
];

export const getModernPageByDisplayId = (id, pages = MODERN_PAGES) =>
  pages.find((page) => page.id === id) ?? null;

export const isModernPageId = (id, pages = MODERN_PAGES) =>
  pages.some((page) => page.id === id);

export const validateShellNavigationAgainstPages = (pages = MODERN_PAGES) => {
  const knownIds = new Set(pages.map((page) => page.id));
  const errors = [];
  Object.keys(SHELL_NAVIGATION_GROUPS).forEach((group) => {
    SHELL_NAVIGATION_GROUPS[group].forEach((id) => {
      if (id !== SHELL_MORE_ITEM_ID && !knownIds.has(id)) {
        errors.push(`${group} references unknown page '${id}'`);
      }
    });
  });
  return errors;
};

export const isShellNavigationContract = (pages = MODERN_PAGES) =>
  validateShellNavigationAgainstPages(pages).length === 0;
