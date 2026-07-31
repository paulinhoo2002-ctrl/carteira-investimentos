import { PagePlaceholder } from '../../components/PagePlaceholder';
import { getModernPageByDisplayId } from '../../types/shellNavigation.mjs';

export function GoalsPage() {
  const page = getModernPageByDisplayId('goals');
  if (!page) {
    return null;
  }
  return <PagePlaceholder page={page} />;
}
