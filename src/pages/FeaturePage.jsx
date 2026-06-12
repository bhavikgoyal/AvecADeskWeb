import PageShell from '../components/PageShell';
import { PAGE_CONFIG } from '../config/pageConfig';

export default function FeaturePage({ pageKey }) {
  const config = PAGE_CONFIG[pageKey];

  if (!config) {
    return null;
  }

  return <PageShell {...config} />;
}
