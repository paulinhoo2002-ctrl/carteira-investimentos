import { PagePlaceholder } from '../../components/PagePlaceholder';
import { getModernPageByDisplayId } from '../../types/shellNavigation.mjs';

export function NetWorthPage() {
  const page = getModernPageByDisplayId('net-worth');
  if (!page) {
    return null;
  }
  return <PagePlaceholder page={page} />;
}
