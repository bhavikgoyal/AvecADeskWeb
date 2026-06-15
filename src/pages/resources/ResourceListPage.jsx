import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert } from '@mui/material';
import { fetchInstituteRows } from '../../api/institutesApi';
import { fetchPaymentSummary, formatCurrency } from '../../api/schedulesApi';
import { fetchEnrolmentRows, fetchStudentRows } from '../../api/studentsApi';
import { fetchVendorRows } from '../../api/vendorsApi';
import PageShell from '../../components/PageShell';
import { PAGE_CONFIG } from '../../config/pageConfig';
import { getResourceConfig } from '../../config/resourceConfig';
import { loadRecords } from '../../utils/resourceStorage';

function applyStudentSummary(baseStats, summary) {
  if (!baseStats?.length || !summary) return baseStats;

  return [
    {
      ...baseStats[0],
      value: String(summary.activeStudents),
      caption: `${summary.activeStudents} active in system`,
    },
    {
      ...baseStats[1],
      value: formatCurrency(summary.collectedTotal),
      caption: 'Total amount paid',
    },
    {
      ...baseStats[2],
      value: formatCurrency(summary.outstandingTotal),
      caption: 'Total amount due',
    },
    {
      ...baseStats[3],
      value: formatCurrency(summary.overdueTotal),
      caption: `${summary.overdueCount} past due schedule(s)`,
    },
  ];
}

export default function ResourceListPage({ basePath }) {
  const navigate = useNavigate();
  const resource = getResourceConfig(basePath);
  const page = PAGE_CONFIG[basePath];
  const isStudents = basePath === '/students';
  const isEnrolment = basePath === '/status/students';
  const isInstitutes = basePath === '/institutes';
  const isVendors = basePath === '/vendors';
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(page?.stats ?? []);
  const [loading, setLoading] = useState(isStudents || isEnrolment || isInstitutes || isVendors);
  const [error, setError] = useState('');

  const loadRows = useCallback(async () => {
    if (isEnrolment) {
      setLoading(true);
      setError('');

      try {
        const apiRows = await fetchEnrolmentRows();
        setRows(apiRows);
        setStats(page?.stats ?? []);
      } catch (err) {
        setError(err.message || 'Failed to load student enrolment from the API.');
        setRows([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (isInstitutes) {
      setLoading(true);
      setError('');

      try {
        const apiRows = await fetchInstituteRows();
        setRows(apiRows);
        setStats(page?.stats ?? []);
      } catch (err) {
        setError(err.message || 'Failed to load institutes from the API.');
        setRows([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (isVendors) {
      setLoading(true);
      setError('');

      try {
        const apiRows = await fetchVendorRows();
        setRows(apiRows);
        setStats(page?.stats ?? []);
      } catch (err) {
        setError(err.message || 'Failed to load vendors from the API.');
        setRows([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!isStudents) {
      setRows(loadRecords(basePath));
      setStats(page?.stats ?? []);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const apiRows = await fetchStudentRows();
      setRows(apiRows);

      try {
        const summary = await fetchPaymentSummary();
        setStats(applyStudentSummary(page?.stats, summary));
      } catch {
        setStats(page?.stats ?? []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load students from the API.');
      setRows([]);
      setStats(page?.stats ?? []);
    } finally {
      setLoading(false);
    }
  }, [basePath, isStudents, isEnrolment, isInstitutes, isVendors, page?.stats]);

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
        stats={stats}
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
