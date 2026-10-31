import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert } from '@mui/material';
import PageShell from '../../components/PageShell';
import { getDuesTodoItems } from '../../api/cardApi';
import { formatDateDisplay } from '../../utils/dateFormat';

const DASHBOARD_PATH = '/dashboard/admin';

const COLUMNS = [
  { id: 'member', label: 'Member Name', field: 'member', headerSx: { width: '22%' } },
  { id: 'task', label: 'Task', field: 'task', primary: true, headerSx: { width: '46%' } },
  { id: 'originalDate', label: 'Original Date', field: 'originalDate', headerSx: { width: '16%' }, cellSx: { whiteSpace: 'nowrap' } },
  { id: 'dueDate', label: 'Due Date', field: 'dueDate', headerSx: { width: '16%' }, cellSx: { whiteSpace: 'nowrap' } },
];

export default function OverdueTasksPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    getDuesTodoItems('all')
      .then((list) => { if (mounted) setItems(list); })
      .catch(() => { if (mounted) setError('Tasks could not be loaded.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const rows = useMemo(
    () =>
      items.map((item, index) => ({
        id: `${index}-${item.itemName}`,
        member: item.assignedTo,
        task: item.itemName,
        originalDate: formatDateDisplay(item.cardDate),
        dueDate: formatDateDisplay(item.dueDate),
      })),
    [items],
  );

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {error}
        </Alert>
      )}
      <PageShell
        title="Overdue Team Tasks"
        showCharts={false}
        columns={COLUMNS}
        rows={rows}
        loading={loading}
        actionLabel="Cancel"
        searchPlaceholder="Search tasks..."
        onAdd={() => navigate(DASHBOARD_PATH)}
      />
    </>
  );
}
