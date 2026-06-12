import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageShell from '../../components/PageShell';
import { PAGE_CONFIG } from '../../config/pageConfig';
import { getResourceConfig } from '../../config/resourceConfig';
import { loadRecords } from '../../utils/resourceStorage';

export default function ResourceListPage({ basePath }) {
  const navigate = useNavigate();
  const resource = getResourceConfig(basePath);
  const page = PAGE_CONFIG[basePath];
  const [rows, setRows] = useState([]);

  useEffect(() => {
    setRows(loadRecords(basePath));
  }, [basePath]);

  if (!resource || !page) return null;

  return (
    <PageShell
      title={page.title}
      subtitle={page.subtitle}
      stats={page.stats}
      columns={resource.columns}
      rows={rows}
      actionLabel={resource.actionLabel}
      searchPlaceholder={`Search ${resource.plural.toLowerCase()}...`}
      onAdd={() => navigate(`${basePath}/new`)}
      onRowClick={(row) => navigate(`${basePath}/${row.id}`, { state: { edit: true } })}
    />
  );
}
