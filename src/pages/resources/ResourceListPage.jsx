import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert } from '@mui/material';
import { fetchStudentRows } from '../../api/studentsApi';
import PageShell from '../../components/PageShell';
import { PAGE_CONFIG } from '../../config/pageConfig';
import { getResourceConfig } from '../../config/resourceConfig';
import { loadRecords } from '../../utils/resourceStorage';

export default function ResourceListPage({ basePath }) {
  const navigate = useNavigate();
  const resource = getResourceConfig(basePath);
  const page = PAGE_CONFIG[basePath];
  const isStudents = basePath === '/students';
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(isStudents);
  const [error, setError] = useState('');

  const loadRows = useCallback(async () => {
    if (!isStudents) {
      setRows(loadRecords(basePath));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const apiRows = await fetchStudentRows();
      setRows(apiRows);
    } catch (err) {
      setError(err.message || 'Failed to load students from the API.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [basePath, isStudents]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  if (!resource || !page) return null;

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {error}
        </Alert>
      )}
      <PageShell
        title={page.title}
        subtitle={page.subtitle}
        stats={page.stats}
        columns={resource.columns}
        rows={loading ? [] : rows}
        actionLabel={resource.actionLabel}
        searchPlaceholder={`Search ${resource.plural.toLowerCase()}...`}
        onAdd={() => navigate(`${basePath}/new`)}
        onRowClick={(row) => navigate(`${basePath}/${row.id}`, { state: { edit: true } })}
      />
    </>
  );
}
