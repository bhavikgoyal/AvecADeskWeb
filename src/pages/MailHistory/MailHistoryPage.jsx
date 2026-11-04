import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  TablePagination,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ResponsiveTable from '../../components/ResponsiveTable';
import TableContentSkeleton from '../../components/TableContentSkeleton';
import {
  DateTextField,
  LIST_FILTER_ALL,
  isListFilterAll,
  listOutlinedButtonSx,
  listSearchFieldSx,
  listSelectFieldSx,
  listSelectProps,
  listToolbarActionsSx,
  listToolbarRowSx,
  listToolbarSearchGroupSx,
} from '../../components/forms';
import {
  fetchMailHistory,
  fetchMailHistoryById,
  fetchMailHistoryTypes,
} from '../../api/mailHistoryApi';
import { formatDateDisplay } from '../../utils/dateFormat';

const TABLE_MIN_WIDTH = 1200;

const tableSx = {
  width: '100%',
  '& table': { width: '100%', minWidth: TABLE_MIN_WIDTH, tableLayout: 'fixed' },
  '& .MuiTableCell-root': { whiteSpace: 'nowrap', verticalAlign: 'middle' },
};

const dateFieldSx = {
  width: { xs: '100%', md: 165 },
  '& .MuiInputBase-root': {
    height: 40,
    borderRadius: 2,
    backgroundColor: 'var(--muted-bg)',
    '&.Mui-focused': { backgroundColor: '#fff' },
  },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--card-border)' },
};

const ellipsisSx = {
  display: 'block',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  minWidth: 0,
};

function formatMailType(type) {
  if (!type) return '—';
  return type.replace(/([a-z])([A-Z])/g, '$1 $2');
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${formatDateDisplay(date)} ${time}`;
}

const STATUS_COLORS = {
  Sent: { color: '#1b7a3d', bgcolor: 'rgba(46, 160, 67, 0.12)' },
  Failed: { color: '#c62828', bgcolor: 'rgba(214, 57, 57, 0.1)' },
  Skipped: { color: '#8a5a00', bgcolor: 'rgba(240, 173, 40, 0.16)' },
};

function StatusChip({ status }) {
  const colors = STATUS_COLORS[status] || { color: 'var(--muted)', bgcolor: 'rgba(101, 119, 146, 0.12)' };
  return <Chip size="small" label={status || '—'} sx={{ fontWeight: 600, ...colors }} />;
}

/** Real recipient; in Demo/QA the mail went to the test inbox (or nowhere) instead. */
function recipientOf(mail) {
  return mail.intendedToEmail || mail.toEmail || '';
}

function deliveredToLabel(mail) {
  if (mail.status === 'Skipped') return 'Not sent (Demo/QA mode)';
  if (mail.toEmail && mail.intendedToEmail && mail.toEmail !== mail.intendedToEmail) return `${mail.toEmail} (test inbox)`;
  return mail.toEmail || '—';
}

function TextCell({ value, title, color = 'var(--text)', fontWeight = 400 }) {
  return (
    <Typography variant="body2" component="span" title={title ?? value} sx={{ ...ellipsisSx, color, fontWeight }}>
      {value || '—'}
    </Typography>
  );
}

function StatCard({ label, value, color }) {
  return (
    <Paper
      elevation={0}
      sx={{
        flex: '1 1 160px',
        px: 2,
        py: 1.5,
        border: '1px solid var(--card-border)',
        borderRadius: 2,
      }}
    >
      <Typography variant="body2" sx={{ color: 'var(--muted)', fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 800, color }}>
        {value}
      </Typography>
    </Paper>
  );
}

function DetailRow({ label, children }) {
  return (
    <Box sx={{ display: 'flex', gap: 2, py: 0.75, borderBottom: '1px solid var(--card-border)' }}>
      <Typography variant="body2" sx={{ width: 150, flexShrink: 0, color: 'var(--muted)', fontWeight: 600 }}>
        {label}
      </Typography>
      <Box sx={{ minWidth: 0, flex: 1, wordBreak: 'break-word' }}>{children}</Box>
    </Box>
  );
}

function MailDetailDialog({ mailId, onClose }) {
  const [mail, setMail] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!mailId) return;
    setMail(null);
    setError('');
    fetchMailHistoryById(mailId)
      .then(setMail)
      .catch((err) => setError(err.message || 'Failed to load mail.'));
  }, [mailId]);

  return (
    <Dialog open={!!mailId} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Typography variant="h6" component="span" sx={{ fontWeight: 700, ...ellipsisSx }}>
          {mail?.subject || 'Mail details'}
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error">{error}</Alert>}
        {!mail && !error && (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        )}
        {mail && (
          <>
            <DetailRow label="Status">
              <StatusChip status={mail.status} />
            </DetailRow>
            {mail.errorMessage && (
              <DetailRow label="Error">
                <Typography variant="body2" sx={{ color: '#c62828' }}>
                  {mail.errorMessage}
                </Typography>
              </DetailRow>
            )}
            <DetailRow label="Mail type">{formatMailType(mail.mailType)}</DetailRow>
            <DetailRow label="Recipient">{recipientOf(mail) || '—'}</DetailRow>
            <DetailRow label="Delivered to">{deliveredToLabel(mail)}</DetailRow>
            <DetailRow label="Mail mode">{mail.mailMode || '—'}</DetailRow>
            <DetailRow label="From">{mail.fromEmail || '—'}</DetailRow>
            <DetailRow label="Sent on">{formatDateTime(mail.sentOn)}</DetailRow>
            <DetailRow label="Sent by">{mail.sentByUserName || '—'}</DetailRow>
            {mail.attachmentName && <DetailRow label="Attachment">{mail.attachmentName}</DetailRow>}

            <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2.5, mb: 1 }}>
              Mail body
            </Typography>
            {mail.bodyHtml ? (
              <Box
                component="iframe"
                title="Mail body"
                sandbox=""
                srcDoc={mail.bodyHtml}
                sx={{ width: '100%', height: 420, border: '1px solid var(--card-border)', borderRadius: 2, bgcolor: '#fff' }}
              />
            ) : (
              <Typography variant="body2" sx={{ color: 'var(--muted)' }}>
                Body is not stored for this mail type (it contains a one-time code or link).
              </Typography>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function MailHistoryPage() {
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ totalCount: 0, sentCount: 0, failedCount: 0, skippedCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mailTypes, setMailTypes] = useState([]);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [mailType, setMailType] = useState(LIST_FILTER_ALL);
  const [status, setStatus] = useState(LIST_FILTER_ALL);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [selectedMailId, setSelectedMailId] = useState(null);

  useEffect(() => {
    fetchMailHistoryTypes()
      .then(setMailTypes)
      .catch(() => setMailTypes([]));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(0);
  }, [search, mailType, status, fromDate, toDate, rowsPerPage]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchMailHistory({
      search,
      mailType: isListFilterAll(mailType) ? '' : mailType,
      status: isListFilterAll(status) ? '' : status,
      fromDate,
      toDate,
      pageNumber: page + 1,
      pageSize: rowsPerPage,
    })
      .then((data) => {
        if (cancelled) return;
        setRows(data.items);
        setTotals({
          totalCount: data.totalCount,
          sentCount: data.sentCount,
          failedCount: data.failedCount,
          skippedCount: data.skippedCount,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Failed to load mail history.');
        setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search, mailType, status, fromDate, toDate, page, rowsPerPage]);

  const hasFilters = Boolean(
    searchInput || fromDate || toDate || !isListFilterAll(mailType) || !isListFilterAll(status),
  );

  const clearFilters = () => {
    setSearchInput('');
    setMailType(LIST_FILTER_ALL);
    setStatus(LIST_FILTER_ALL);
    setFromDate('');
    setToDate('');
  };

  const columns = useMemo(
    () => [
      {
        id: 'sentOn',
        label: 'Sent On',
        field: 'sentOn',
        headerSx: { width: 175 },
        cellSx: { width: 175 },
        render: (row) => <TextCell value={formatDateTime(row.sentOn)} />,
      },
      {
        id: 'mailType',
        label: 'Mail Type',
        field: 'mailType',
        headerSx: { width: 220 },
        cellSx: { width: 220 },
        render: (row) => <TextCell value={formatMailType(row.mailType)} fontWeight={600} />,
      },
      {
        id: 'toEmail',
        label: 'Recipient',
        field: 'toEmail',
        headerSx: { width: 230 },
        cellSx: { width: 230 },
        render: (row) => (
          <TextCell value={recipientOf(row)} title={`Delivered to: ${deliveredToLabel(row)}`} color="var(--primary)" />
        ),
      },
      {
        id: 'subject',
        label: 'Subject',
        field: 'subject',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
            {row.attachmentName && (
              <AttachFileIcon fontSize="small" titleAccess={row.attachmentName} sx={{ color: 'var(--muted)', flexShrink: 0 }} />
            )}
            <TextCell value={row.subject} />
          </Box>
        ),
      },
      {
        id: 'status',
        label: 'Status',
        field: 'status',
        align: 'center',
        headerSx: { width: 100 },
        cellSx: { width: 100 },
        render: (row) => <StatusChip status={row.status} />,
      },
      {
        id: 'mailMode',
        label: 'Mode',
        field: 'mailMode',
        headerSx: { width: 110 },
        cellSx: { width: 110 },
        render: (row) => <TextCell value={row.mailMode} />,
      },
      {
        id: 'sentBy',
        label: 'Sent By',
        field: 'sentByUserName',
        headerSx: { width: 150 },
        cellSx: { width: 150 },
        render: (row) => <TextCell value={row.sentByUserName} />,
      },
    ],
    [],
  );

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--text)', mb: 0.5 }}>
        Mail History
      </Typography>
      <Typography variant="body2" sx={{ color: 'var(--muted)', mb: 2 }}>
        Every mail sent by the system: who it went to, when, and what type it was.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <StatCard label="Total mails" value={totals.totalCount} color="var(--text)" />
        <StatCard label="Sent" value={totals.sentCount} color="#1b7a3d" />
        <StatCard label="Failed" value={totals.failedCount} color="#c62828" />
        <StatCard label="Skipped (Demo/QA)" value={totals.skippedCount} color="#8a5a00" />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={0} sx={{ border: '1px solid var(--card-border)', borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 2, borderBottom: '1px solid var(--card-border)' }}>
          <Box sx={listToolbarRowSx}>
            <Box sx={listToolbarSearchGroupSx}>
              <TextField
                size="small"
                placeholder="Search mails..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                sx={listSearchFieldSx}
              />
              <TextField
                select
                size="small"
                value={mailType}
                onChange={(e) => setMailType(e.target.value)}
                SelectProps={{
                  ...listSelectProps('All mail types'),
                  renderValue: (selected) => (isListFilterAll(selected) ? 'All mail types' : formatMailType(selected)),
                }}
                sx={listSelectFieldSx(!isListFilterAll(mailType))}
              >
                <MenuItem value={LIST_FILTER_ALL}>All mail types</MenuItem>
                {mailTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {formatMailType(type)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                SelectProps={listSelectProps('All statuses')}
                sx={listSelectFieldSx(!isListFilterAll(status))}
              >
                <MenuItem value={LIST_FILTER_ALL}>All statuses</MenuItem>
                <MenuItem value="Sent">Sent</MenuItem>
                <MenuItem value="Failed">Failed</MenuItem>
                <MenuItem value="Skipped">Skipped</MenuItem>
              </TextField>
              <DateTextField
                size="small"
                label="From"
                value={fromDate}
                onChangeValue={setFromDate}
                maxDate={toDate || undefined}
                sx={dateFieldSx}
              />
              <DateTextField
                size="small"
                label="To"
                value={toDate}
                onChangeValue={setToDate}
                minDate={fromDate || undefined}
                sx={dateFieldSx}
              />
            </Box>
            {hasFilters && (
              <Box sx={listToolbarActionsSx}>
                <Button variant="outlined" size="small" onClick={clearFilters} sx={listOutlinedButtonSx}>
                  Clear
                </Button>
              </Box>
            )}
          </Box>
        </Box>

        {loading ? (
          <TableContentSkeleton
            rows={8}
            columns={[
              { id: 'sentOn', label: 'Sent On', flex: 1 },
              { id: 'mailType', label: 'Mail Type', flex: 1.2 },
              { id: 'toEmail', label: 'Recipient', flex: 1.5 },
              { id: 'subject', label: 'Subject', flex: 2.5 },
              { id: 'status', label: 'Status', flex: 0.7 },
              { id: 'mailMode', label: 'Mode', flex: 0.7 },
              { id: 'sentBy', label: 'Sent By', flex: 1 },
            ]}
          />
        ) : rows.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">No mails found.</Typography>
          </Box>
        ) : (
          <ResponsiveTable
            columns={columns}
            rows={rows}
            getRowKey={(row) => row.id}
            variant="resource"
            alwaysTable
            tableMinWidth={TABLE_MIN_WIDTH}
            sx={tableSx}
            onRowClick={(row) => setSelectedMailId(row.id)}
          />
        )}

        <TablePagination
          component="div"
          count={totals.totalCount}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_event, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => setRowsPerPage(parseInt(event.target.value, 10))}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Paper>

      <MailDetailDialog mailId={selectedMailId} onClose={() => setSelectedMailId(null)} />
    </Box>
  );
}
