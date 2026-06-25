import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CircularProgress,
  Typography,
  Alert,
  IconButton,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import ResponsiveTable from '../ResponsiveTable';
import { getMembers, deleteMember, resignMember } from '../../api/membersApi';
import { Session } from '../../utils/session';

const sectionCardSx = {
  width: '100%',
  minWidth: 0,
  maxWidth: '100%',
  border: '1px solid var(--card-border)',
  bgcolor: 'var(--card-bg)',
  borderRadius: 2,
  boxShadow: '0 4px 16px rgba(26, 43, 61, 0.05)',
};

const contentInset = { xs: 1.5, sm: 2 };

const tableAlignSx = {
  '& .MuiTableCell-root:first-of-type': {
    pl: contentInset,
  },
  '& .MuiTableCell-root:last-of-type': {
    pr: contentInset,
  },
};

const scrollContainerSx = {
  scrollbarWidth: 'thin',
  scrollbarColor: 'rgba(47, 128, 201, 0.55) rgba(0,0,0,0.06)',
  '&::-webkit-scrollbar': { height: 10 },
  '&::-webkit-scrollbar-track': {
    bgcolor: 'rgba(0,0,0,0.05)',
    borderRadius: 5,
  },
  '&::-webkit-scrollbar-thumb': {
    borderRadius: 5,
    backgroundColor: 'rgba(47, 128, 201, 0.45)',
    '&:hover': {
      backgroundColor: 'rgba(47, 128, 201, 0.65)',
    },
  },
};

function MemberActions({ row, onEdit, onDelete, onResign }) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: { xs: 0.5, sm: 0.75 },
        flexWrap: 'nowrap',
        width: '100%',
      }}
    >
      <IconButton
        size="small"
        aria-label="Edit member"
        onClick={(event) => {
          event.stopPropagation();
          onEdit(row);
        }}
        sx={{
          color: 'var(--primary)',
          bgcolor: 'var(--primary-soft, #e8f2fb)',
          flexShrink: 0,
          '&:hover': { bgcolor: 'rgba(47, 128, 201, 0.18)' },
        }}
      >
        <EditOutlinedIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        aria-label="Delete member"
        onClick={(event) => {
          event.stopPropagation();
          onDelete(row.UserId);
        }}
        sx={{
          color: 'var(--danger, #d63939)',
          bgcolor: 'rgba(214, 57, 57, 0.08)',
          flexShrink: 0,
          '&:hover': { bgcolor: 'rgba(214, 57, 57, 0.14)' },
        }}
      >
        <DeleteOutlinedIcon fontSize="small" />
      </IconButton>
      <Button
        size="small"
        variant="outlined"
        onClick={(event) => {
          event.stopPropagation();
          onResign(row.UserId);
        }}
        sx={{
          textTransform: 'none',
          fontWeight: 600,
          fontSize: { xs: '0.6875rem', sm: '0.75rem' },
          lineHeight: 1.4,
          borderColor: 'var(--primary)',
          color: 'var(--primary)',
          borderRadius: 1.5,
          px: { xs: 1, sm: 1.5 },
          py: 0.5,
          minWidth: { xs: 60, sm: 72 },
          maxWidth: { xs: 60, sm: 72 },
          whiteSpace: 'nowrap',
          flexShrink: 0,
          bgcolor: 'var(--primary-soft, #e8f2fb)',
          '&:hover': {
            bgcolor: 'rgba(47, 128, 201, 0.18)',
            borderColor: 'var(--primary)',
          },
        }}
      >
        Resign
      </Button>
    </Box>
  );
}

function UsernameCell({ row }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
      <Box
        component="img"
        src={`/images/${row.UserName}.png`}
        alt={row.UserName}
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = `https://i.pravatar.cc/100?u=${row.UserId || row.UserName}`;
        }}
        sx={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          objectFit: 'cover',
          bgcolor: '#e8ecf1',
          border: '1px solid #dce3ec',
          flexShrink: 0,
        }}
      />
      <Typography
        variant="body2"
        title={row.UserName}
        sx={{
          fontWeight: 600,
          color: 'var(--text)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          minWidth: 0,
          flex: 1,
        }}
      >
        {row.UserName}
      </Typography>
    </Box>
  );
}

function TruncateCell({ value }) {
  const text = value ?? '';
  return (
    <Typography
      variant="body2"
      component="span"
      title={text}
      sx={{
        display: 'block',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        minWidth: 0,
        color: 'var(--text)',
      }}
    >
      {text}
    </Typography>
  );
}

/** Minimum table width — horizontal scroll below this. */
const TABLE_MIN_WIDTH = 1120;

const rollColSx = { width: 72, minWidth: 72, maxWidth: 72, whiteSpace: 'nowrap' };
const usernameColSx = { overflow: 'hidden', pr: 1.5 };
const fullNameColSx = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pl: 0.5 };
const emailColSx = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const phoneColSx = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const actionColSx = { width: 188, minWidth: 188, maxWidth: 188, whiteSpace: 'nowrap' };

const membersTableSx = {
  width: '100%',
  ...scrollContainerSx,
  ...tableAlignSx,
  pb: 0.5,
  '& table': {
    width: '100%',
    minWidth: TABLE_MIN_WIDTH,
    tableLayout: 'fixed',
  },
  '& .MuiTableCell-root': {
    whiteSpace: 'nowrap',
    verticalAlign: 'middle',
  },
  '& .MuiTableHead-root .MuiTableCell-root': {
    verticalAlign: 'middle',
  },
};

export default function MembersTable({ searchQuery = '' }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const role = Session.getRole();
  const isTeamLeader = role === 'Team Leader';

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getMembers();
        const normalized = Array.isArray(data)
          ? data.map((u) => ({
              ...u,
              UserId: u.userId ?? u.UserId,
              UserName: u.userName ?? u.UserName,
              FirstName: u.firstName ?? u.FirstName,
              LastName: u.lastName ?? u.LastName,
              Email: u.email ?? u.Email,
              PhoneNo: u.phoneNo ?? u.PhoneNo,
              MemberResignedOn: u.memberResignedOn ?? u.MemberResignedOn,
              UserRoleId: u.userRoleId ?? u.UserRoleId,
              CompaniesId: u.companiesId ?? u.CompaniesId,
              IsActive: u.isActive ?? u.IsActive ?? u.active ?? u.Active,
            }))
          : [];
        setRows(normalized);
      } catch (err) {
        setError(err.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleDelete = useCallback(async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      const result = await deleteMember(userId);
      if (result.success) {
        setRows((prev) => prev.filter((u) => String(u.UserId) !== String(userId)));
        alert('Member deleted successfully');
      } else {
        alert(result.message || 'Delete failed');
      }
    } catch (err) {
      alert(err.message || 'Delete failed');
    }
  }, []);

  const handleResign = useCallback(async (userId) => {
    if (!window.confirm('Are you sure this member is resigning?')) return;
    try {
      const result = await resignMember(userId);
      if (result.success) {
        const resignDate = new Date().toISOString();
        setRows((prev) =>
          prev.map((u) => (u.UserId === userId ? { ...u, MemberResignedOn: resignDate } : u)),
        );
        alert('Member marked as resigned');
      } else {
        alert(result.message || 'Failed to mark member as resigned');
      }
    } catch (err) {
      alert(err.message || 'Failed to mark member as resigned');
    }
  }, []);

  const handleEdit = useCallback(
    (row) => navigate(`/Members/Edit/${row.UserId}`, { state: { user: row } }),
    [navigate],
  );

  const filteredRows = rows.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      (r.UserName || '').toLowerCase().includes(q) ||
      (r.FirstName || '').toLowerCase().includes(q) ||
      (r.LastName || '').toLowerCase().includes(q) ||
      (r.Email || '').toLowerCase().includes(q) ||
      (r.PhoneNo || '').toLowerCase().includes(q) ||
      (r.roleName || '').toLowerCase().includes(q)
    );
  });

  const tableRows = useMemo(
    () =>
      filteredRows.map((r, index) => ({
        ...r,
        roll: index + 1,
        fullName: `${r.FirstName || ''} ${r.LastName || ''}`.trim(),
        email: r.Email || '',
        phone: r.PhoneNo || '',
        roleName: r.roleName || '',
        isActive: !!(r.IsActive ?? r.Active),
      })),
    [filteredRows],
  );

  const tableColumns = useMemo(() => {
    const columns = [
      {
        id: 'roll',
        label: 'Roll',
        field: 'roll',
        align: 'center',
        headerSx: rollColSx,
        cellSx: { ...rollColSx, color: 'var(--muted)', fontWeight: 600 },
      },
      {
        id: 'username',
        label: 'Username',
        field: 'username',
        render: (row) => <UsernameCell row={row} />,
        headerSx: usernameColSx,
        cellSx: usernameColSx,
      },
      {
        id: 'fullName',
        label: 'Full name',
        field: 'fullName',
        render: (row) => <TruncateCell value={row.fullName} />,
        headerSx: fullNameColSx,
        cellSx: fullNameColSx,
      },
      {
        id: 'email',
        label: 'Email',
        field: 'email',
        render: (row) => <TruncateCell value={row.email} />,
        headerSx: emailColSx,
        cellSx: emailColSx,
      },
      {
        id: 'phone',
        label: 'Phone',
        field: 'phone',
        render: (row) => <TruncateCell value={row.phone} />,
        headerSx: phoneColSx,
        cellSx: phoneColSx,
      },
      {
        id: 'roleName',
        label: 'Role Name',
        field: 'roleName',
      },
      {
        id: 'active',
        label: 'Active',
        field: 'active',
        align: 'center',
        headerSx: { width: 80, minWidth: 80 },
        cellSx: { width: 80, minWidth: 80, textAlign: 'center' },
        render: (row) => (
          <Typography
            variant="body2"
            component="span"
            sx={{
              fontWeight: 600,
              color: row.isActive ? 'rgb(51, 133, 198)' : 'var(--muted)',
            }}
          >
            {row.isActive ? 'Yes' : 'No'}
          </Typography>
        ),
      },
    ];

    if (!isTeamLeader) {
      columns.push({
        id: 'action',
        label: 'Action',
        field: 'action',
        align: 'center',
        headerSx: actionColSx,
        cellSx: actionColSx,
        render: (row) => (
          <MemberActions
            row={row}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onResign={handleResign}
          />
        ),
      });
    }

    return columns;
  }, [isTeamLeader, handleEdit, handleDelete, handleResign]);

  return (
    <Card elevation={0} sx={{ ...sectionCardSx, overflow: 'hidden' }}>
      <Box sx={{ px: contentInset, pt: contentInset, pb: 1 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text)' }}>
          All Members
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box sx={{ p: 2 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      ) : tableRows.length === 0 ? (
        <Box sx={{ p: { xs: 2, sm: 3 }, textAlign: 'center' }}>
          <Typography color="text.secondary">No users found.</Typography>
        </Box>
      ) : (
        <Box
          className="members-table-scroll"
          sx={{
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          <ResponsiveTable
            columns={tableColumns}
            rows={tableRows}
            getRowKey={(row) => row.UserId}
            variant="resource"
            alwaysTable
            tableMinWidth={TABLE_MIN_WIDTH}
            sx={membersTableSx}
          />
        </Box>
      )}
    </Card>
  );
}
