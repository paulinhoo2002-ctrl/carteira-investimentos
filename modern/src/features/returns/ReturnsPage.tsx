import { PagePlaceholder } from '../../components/PagePlaceholder';
import { getModernPageByDisplayId } from '../../types/shellNavigation.mjs';

export function ReturnsPage() {
  const page = getModernPageByDisplayId('returns');
  if (!page) {
    return null;
  }
  return <PagePlaceholder page={page} />;
}
