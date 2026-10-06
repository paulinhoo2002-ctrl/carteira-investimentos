import type { ModernPageId } from '../../types/navigation.mjs';
import {
  buildReadonlyReportSessionSearch,
  readReadonlyReportSessionContext,
} from './readonlyReportSessionContext.ts';

type HistoryWindow = Pick<Window, 'history' | 'location' | 'addEventListener' | 'removeEventListener'>;

export function createReadonlyReportSessionHistory(target: HistoryWindow) {
  const getCurrentPageId = (fallbackPageId: ModernPageId = 'reports') =>
    readReadonlyReportSessionContext(target.location.search, fallbackPageId).pageId;

  return {
    getCurrentPageId,
    navigate(pageId: ModernPageId) {
      const nextUrl = new URL(target.location.href);
      nextUrl.search = buildReadonlyReportSessionSearch(pageId, nextUrl.search);
      target.history.pushState(target.history.state, '', nextUrl.toString());
    },
    subscribe(listener: (pageId: ModernPageId) => void, fallbackPageId: ModernPageId = 'reports') {
      const onPopState = () => listener(getCurrentPageId(fallbackPageId));
      target.addEventListener('popstate', onPopState);
      return () => target.removeEventListener('popstate', onPopState);
    },
  };
}
