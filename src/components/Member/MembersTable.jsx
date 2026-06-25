import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PersonOffOutlinedIcon from '@mui/icons-material/PersonOffOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { deleteMember, getMembers, resignMember } from '../../api/membersApi';
import ResponsiveTable from '../ResponsiveTable';
import { Session } from '../../utils/session';

function normalizeMember(user, index) {
  const userId = user.userId ?? user.UserId;
  return {
    ...user,
    id: userId,
    UserId: userId,
    UserName: user.userName ?? user.UserName ?? '',
    FirstName: user.firstName ?? user.FirstName ?? '',
    LastName: user.lastName ?? user.LastName ?? '',
    Email: user.email ?? user.Email ?? '',
    PhoneNo: user.phoneNo ?? user.PhoneNo ?? '',
    MemberResignedOn: user.memberResignedOn ?? user.MemberResignedOn,
    UserRoleId: user.userRoleId ?? user.UserRoleId,
    CompaniesId: user.companiesId ?? user.CompaniesId,
    IsActive: user.isActive ?? user.IsActive ?? user.active ?? user.Active,
    roleName: user.roleName ?? user.RoleName ?? '',
    roll: index + 1,
    fullName: `${user.firstName ?? user.FirstName ?? ''} ${user.lastName ?? user.LastName ?? ''}`.trim(),
  };
}

export default function MembersTable() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const role = Session.getRole();
  const isTeamLeader = role === 'Team Leader';

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setError('');
        const data = await getMembers();
        if (!active) return;
        const normalized = Array.isArray(data) ? data.map(normalizeMember) : [];
        setRows(normalized);
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Something went wrong');
        setRows([]);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const handleDelete = useCallback(async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await deleteMember(userId);
      if (!response.ok) throw new Error(`Delete failed: ${response.status}`);
      setRows((prev) => prev.filter((user) => String(user.UserId) !== String(userId)));
      alert('Member deleted successfully');
    } catch (err) {
      alert(err.message || 'Delete failed');
    }
  }, []);

  const handleResign = useCallback(async (userId) => {
    if (!window.confirm('Are you sure this member is resigning?')) return;

    try {
      const response = await resignMember(userId);
      if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
      const resignDate = new Date().toISOString();
      setRows((prev) =>
        prev.map((user) => (user.UserId === userId ? { ...user, MemberResignedOn: resignDate } : user)),
      );
      alert('Member marked as resigned');
    } catch (err) {
      alert(err.message || 'Failed to mark member as resigned');
    }
  }, []);

  const openEdit = useCallback(
    (row) => navigate(`/Members/Edit/${row.UserId}`, { state: { user: row } }),
    [navigate],
  );

  const filteredRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      [row.UserName, row.fullName, row.Email, row.PhoneNo, row.roleName]
        .some((value) => String(value ?? '').toLowerCase().includes(term)),
    );
  }, [rows, query]);

  const columns = useMemo(() => {
    const baseColumns = [
      {
        id: 'roll',
        label: '#',
        field: 'roll',
        hideOnMobile: true,
        headerSx: { width: 48 },
        cellSx: { color: 'var(--muted)', fontWeight: 600 },
      },
      {
        id: 'username',
        label: 'Username',
        field: 'UserName',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <Avatar
              src={`/images/${row.UserName}.png`}
              alt={row.UserName}
              sx={{ width: 32, height: 32, border: '2px solid var(--card-border)' }}
              imgProps={{
                onError: (event) => {
                  event.target.onerror = null;
                  event.target.src = `https://i.pravatar.cc/100?u=${row.UserId || row.UserName}`;
                },
              }}
            >
              {row.UserName?.[0]?.toUpperCase()}
            </Avatar>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'inherit', whiteSpace: 'nowrap' }}>
              {row.UserName}
            </Typography>
          </Box>
        ),
      },
      { id: 'fullName', label: 'Full name', field: 'fullName' },
      { id: 'email', label: 'Email', field: 'Email', hideOnMobile: true },
      { id: 'phone', label: 'Phone', field: 'PhoneNo', hideOnMobile: true },
      { id: 'roleName', label: 'Role', field: 'roleName', hideOnMobile: true },
      {
        id: 'active',
        label: 'Active',
        field: 'IsActive',
        render: (row) => {
          const active = Boolean(row.IsActive ?? row.Active);
          return (
            <Chip
              label={active ? 'Yes' : 'No'}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.7rem',
                fontWeight: 700,
                bgcolor: active ? 'rgba(47, 179, 68, 0.1)' : 'var(--muted-bg)',
                color: active ? 'var(--success)' : 'var(--muted)',
                border: '1px solid',
                borderColor: active ? 'rgba(47, 179, 68, 0.2)' : 'var(--card-border)',
              }}
            />
          );
        },
      },
    ];

    if (isTeamLeader) return baseColumns;

    return [
      ...baseColumns,
      {
        id: 'actions',
        label: 'Actions',
        align: 'right',
        headerSx: { minWidth: 120, width: 120, px: 1, whiteSpace: 'nowrap' },
        cellSx: { minWidth: 120, width: 120, px: 1, whiteSpace: 'nowrap' },
        render: (row) => (
          <Stack
            direction="row"
            spacing={0.25}
            justifyContent="flex-end"
            alignItems="center"
            sx={{ flexWrap: 'nowrap', width: 'max-content', ml: 'auto' }}
            onClick={(event) => event.stopPropagation()}
          >
            <Tooltip title="Edit member">
              <IconButton
                size="small"
                aria-label="Edit member"
                onClick={() => openEdit(row)}
                sx={{
                  flexShrink: 0,
                  color: 'var(--primary)',
                  opacity: 0.85,
                  '&:hover': { opacity: 1, bgcolor: 'var(--primary-soft)' },
                }}
              >
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete member">
              <IconButton
                size="small"
                aria-label="Delete member"
                onClick={() => handleDelete(row.UserId)}
                sx={{
                  flexShrink: 0,
                  color: 'var(--danger)',
                  opacity: 0.55,
                  '&:hover': { opacity: 1, bgcolor: 'rgba(214, 57, 57, 0.08)' },
                }}
              >
                <DeleteOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Resign member">
              <IconButton
                size="small"
                aria-label="Resign member"
                onClick={() => handleResign(row.UserId)}
                sx={{
                  flexShrink: 0,
                  color: 'var(--text)',
                  opacity: 0.7,
                  '&:hover': { opacity: 1, bgcolor: 'var(--primary-soft)', color: 'var(--primary)' },
                }}
              >
                <PersonOffOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ];
  }, [handleDelete, handleResign, isTeamLeader, openEdit]);

  if (loading) {
    return (
      <Paper elevation={0} className="dashboard-card" sx={{ borderRadius: 3, py: 6, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={28} sx={{ color: 'var(--primary)' }} />
      </Paper>
    );
  }

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={0} className="dashboard-card" sx={{ borderRadius: 3, overflow: 'hidden', width: '100%' }}>
        <Box sx={{ px: { xs: 1.25, md: 1.5 }, py: 1.25, borderBottom: '1px solid var(--card-border)', bgcolor: 'var(--card-bg)' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} alignItems={{ xs: 'stretch', md: 'center' }}>
            <TextField
              size="small"
              placeholder="Search members..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'var(--muted)' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                flex: 1,
                minWidth: { xs: '100%', md: '200px' },
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  bgcolor: 'var(--muted-bg)',
                  '&:hover': { bgcolor: '#fff' },
                },
              }}
            />
            {!isTeamLeader && (
              <Button
                variant="contained"
                size="small"
                onClick={() => navigate('/Members/Create')}
                sx={{
                  textTransform: 'none',
                  bgcolor: 'var(--primary)',
                  '&:hover': { bgcolor: 'var(--primary-dark)' },
                  width: { xs: '100%', md: 'auto' },
                  height: 40,
                  px: 3,
                  borderRadius: 2,
                  fontWeight: 600,
                }}
              >
                Add Member
              </Button>
            )}
          </Stack>
          {rows.length > 0 && (
            <Typography sx={{ fontSize: '0.72rem', color: 'var(--muted)', mt: 1, fontWeight: 600 }}>
              Showing {filteredRows.length} of {rows.length} members
              {query.trim() ? ` matching "${query.trim()}"` : ''}
            </Typography>
          )}
        </Box>

        {filteredRows.length > 0 ? (
          <ResponsiveTable
            columns={columns}
            rows={filteredRows}
            getRowKey={(row) => row.id}
            variant="resource"
            onRowClick={!isTeamLeader ? openEdit : undefined}
            sx={{
              '& table': {
                minWidth: { xs: 640, md: 900, lg: 1040 },
              },
            }}
          />
        ) : (
          <Box sx={{ px: { xs: 1.25, md: 1.5 }, py: 2.5, bgcolor: 'var(--card-bg)' }}>
            <Typography variant="body2" sx={{ color: 'var(--muted)' }}>
              {query.trim() ? `No results for "${query.trim()}".` : 'No members found.'}
            </Typography>
          </Box>
        )}
      </Paper>
    </>
  );
}
