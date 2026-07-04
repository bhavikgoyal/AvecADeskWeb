import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Alert } from '@mui/material';
import { deleteInstitute, fetchInstituteRows } from '../../api/institutesApi';
import { fetchPaymentSummary, formatCurrency } from '../../api/schedulesApi';
import { deleteStudent, fetchEnrolmentRows, fetchStudentRows } from '../../api/studentsApi';
import { deleteVendor, fetchVendorRows } from '../../api/vendorsApi';
import { getEmailTemplates, deleteEmailTemplate } from '../../api/EmailtemplatesApi';
import PageShell from '../../components/PageShell';
import { PAGE_CONFIG } from '../../config/pageConfig';
import { getResourceConfig } from '../../config/resourceConfig';
import { deleteRecord, loadRecords } from '../../utils/resourceStorage';

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

async function fetchResourceRows({
  basePath,
  isStudents,
  isEnrolment,
  isInstitutes,
  isVendors,
  pageStats,
}) {
  if (isEnrolment) {
    return { rows: await fetchEnrolmentRows(), stats: pageStats ?? [] };
  }

  if (isInstitutes) {
    return { rows: await fetchInstituteRows(), stats: pageStats ?? [] };
  }

  if (isVendors) {
    return { rows: await fetchVendorRows(), stats: pageStats ?? [] };
  }

  if (basePath === '/templates') {
    return { rows: await getEmailTemplates(), stats: pageStats ?? [] };
  }

  if (!isStudents) {
    return { rows: loadRecords(basePath), stats: pageStats ?? [] };
  }

  const apiRows = await fetchStudentRows();

  try {
    const summary = await fetchPaymentSummary();
    return { rows: apiRows, stats: applyStudentSummary(pageStats, summary) };
  } catch {
    return { rows: apiRows, stats: pageStats ?? [] };
  }
}

function getLoadErrorMessage(basePath) {
  if (basePath === '/status/students') return 'Failed to load student enrolment from the API.';
  if (basePath === '/institutes') return 'Failed to load institutes from the API.';
  if (basePath === '/vendors') return 'Failed to load vendors from the API.';
  if (basePath === '/students') return 'Failed to load students from the API.';
  return 'Failed to load records.';
}

export default function ResourceListPage({ basePath }) {
  const navigate = useNavigate();
  const location = useLocation();
  const resource = getResourceConfig(basePath);
  const page = PAGE_CONFIG[basePath];
  const isStudents = basePath === '/students';
  const isEnrolment = basePath === '/status/students';
  const isInstitutes = basePath === '/institutes';
  const isVendors = basePath === '/vendors';
  const isTemplates = basePath === '/templates';
  const pageStats = useMemo(() => page?.stats ?? [], [page]);
  const usesApi = isStudents || isEnrolment || isInstitutes || isVendors || isTemplates;
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(pageStats);
  const [loading, setLoading] = useState(usesApi);
  const [error, setError] = useState('');

  const refreshRows = useCallback(async () => {
    if (usesApi) setLoading(true);
    setError('');

    try {
      const result = await fetchResourceRows({
        basePath,
        isStudents,
        isEnrolment,
        isInstitutes,
        isVendors,
        pageStats,
      });
      setRows(result.rows);
      setStats(result.stats);
    } catch (err) {
      setError(err.message || getLoadErrorMessage(basePath));
      setRows([]);
      setStats(pageStats);
    } finally {
      if (usesApi) setLoading(false);
    }
  }, [basePath, isStudents, isEnrolment, isInstitutes, isVendors, isTemplates, pageStats, usesApi]);

  useEffect(() => {
    let cancelled = false;

    fetchResourceRows({
      basePath,
      isStudents,
      isEnrolment,
      isInstitutes,
      isVendors,
      pageStats,
    })
      .then((result) => {
        if (cancelled) return;
        setRows(result.rows);
        setStats(result.stats);
        if (usesApi) setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || getLoadErrorMessage(basePath));
        setRows([]);
        setStats(pageStats);
        if (usesApi) setLoading(false);
      });

    // If navigated back with a refresh flag, trigger refresh and clear state
    if (location?.state?.refresh) {
      refreshRows();
      try {
        // clear history state so refresh doesn't loop
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      } catch (e) {
        // ignore
      }
    }

    return () => {
      cancelled = true;
    };
  }, [basePath, isStudents, isEnrolment, isInstitutes, isVendors, isTemplates, pageStats, usesApi]);

  const handleDelete = useCallback(async (row) => {
    const label = row.fullName || row.businessName || row.instituteName || row.name || row.id;
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;

    setError('');
    try {
      if (isStudents || isEnrolment) {
        await deleteStudent(row.id);
        await refreshRows();
      } else if (isVendors) {
        await deleteVendor(row.id);
        await refreshRows();
        } else if (isInstitutes) {
          await deleteInstitute(row.id);
          await refreshRows();
        } else if (isTemplates) {
          await deleteEmailTemplate(row.id);
          await refreshRows();
        } else {
        deleteRecord(basePath, row.id);
        setRows((prev) => prev.filter((r) => String(r.id) !== String(row.id)));
      }
      } catch (err) {
      setError(err.message || 'Failed to delete record.');
    }
    }, [basePath, isStudents, isEnrolment, isVendors, isInstitutes, isTemplates, refreshRows]);

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
        showCharts={isTemplates ? false : (page.showCharts !== false)}
        columns={resource.columns}
        rows={loading ? [] : rows}
        actionLabel={resource.actionLabel}
        searchPlaceholder={`Search ${resource.plural.toLowerCase()}...`}
        // explicitly hide charts for templates
        showCharts={isTemplates ? false : (basePath !== '/institutes')}
        onAdd={() => navigate(`${basePath}/new`)}
        onRowClick={(row) => navigate(`${basePath}/${row.id}`, { state: { edit: true } })}
        onDelete={handleDelete}
      />
    </>
  );
}
