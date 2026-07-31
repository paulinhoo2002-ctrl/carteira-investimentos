import { PagePlaceholder } from '../../components/PagePlaceholder';
import { getModernPageByDisplayId } from '../../types/shellNavigation.mjs';

export function RebalancePage() {
  const page = getModernPageByDisplayId('rebalance');
  if (!page) {
    return null;
  }
  return <PagePlaceholder page={page} />;
}
