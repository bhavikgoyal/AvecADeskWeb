import { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Card,
    CircularProgress,
    MenuItem,
    Select,
    TextField,
    Typography,
    ToggleButtonGroup,
    ToggleButton,
    FormControl,
    InputLabel,
    Alert,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PauseIcon from '@mui/icons-material/Pause';
import VisibilityIcon from '@mui/icons-material/Visibility';
import IconButton from '@mui/material/IconButton';
import { useNavigate, useSearchParams } from 'react-router-dom';

import ResponsiveTable from '../../components/ResponsiveTable';
import { getMembers } from '../../api/membersApi';
import {
    getDailyWorkReport,
    getWeeklyWorkReport,
    getMonthlyWorkReport,
    mapWorkHistoryRow,
} from '../../api/userActivityApi';

function toISODateString(date) {
    if (date instanceof Date && Number.isNaN(date.getTime())) return null;
    if (!date) return null;

    const d = new Date(date);

    return new Date(
        d.getTime() - d.getTimezoneOffset() * 60000
    )
        .toISOString()
        .split('T')[0];
}

const filterInputSx = {
    width: '100%',
    '& .MuiInputBase-root': {
        height: 40,
        minHeight: 40,
        width: '100%',
        bgcolor: 'var(--card-bg)',
    },
    '& .MuiSelect-select': {
        display: 'flex',
        alignItems: 'center',
        minHeight: 24,
    },
    '& input[type="date"]': {
        minHeight: 24,
        width: '100%',
    },
};

const periodToggleSx = {
    bgcolor: '#eef2f7',
    borderRadius: '999px',
    p: 0.5,
    flexWrap: 'nowrap',
    '& .MuiToggleButtonGroup-grouped': {
        border: 0,
        mx: 0.25,
    },
    '& .MuiToggleButton-root': {
        border: 'none',
        borderRadius: '999px !important',
        px: { xs: 2, sm: 2.5 },
        py: 0.75,
        textTransform: 'none',
        fontWeight: 600,
        fontSize: '0.875rem',
        color: '#64748b',
        whiteSpace: 'nowrap',
        '&.Mui-selected': {
            bgcolor: 'var(--primary)',
            color: '#fff',
            '&:hover': {
                bgcolor: 'var(--primary-dark, #2a6fad)',
            },
        },
        '&:hover': {
            bgcolor: 'rgba(47, 128, 201, 0.08)',
        },
    },
};

const sectionCardSx = {
    width: '100%',
    minWidth: 0,
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

function parseTime(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    if (parts.length !== 3) return 0;
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

function ProductivityStatCard({ icon: Icon, value, label, iconColor }) {
    return (
        <Card
            elevation={0}
            sx={{
                p: contentInset,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                border: '1px solid var(--card-border)',
                bgcolor: 'var(--card-bg)',
                borderRadius: 2,
                height: '100%',
            }}
        >
            <Box
                sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 1.5,
                    bgcolor: 'var(--primary-soft, #e8f2fb)',
                    display: 'grid',
                    placeItems: 'center',
                    color: iconColor,
                    flexShrink: 0,
                    '& svg': { fontSize: 26 },
                }}
            >
                <Icon />
            </Box>
            <Box sx={{ minWidth: 0 }}>
                <Typography
                    sx={{
                        fontSize: { xs: '1.5rem', sm: '1.75rem' },
                        fontWeight: 800,
                        lineHeight: 1.1,
                        color: 'var(--text)',
                    }}
                >
                    {value}
                </Typography>
                <Typography
                    sx={{
                        fontSize: '0.875rem',
                        color: 'var(--muted)',
                        mt: 0.5,
                        lineHeight: 1.4,
                    }}
                >
                    {label}
                </Typography>
            </Box>
        </Card>
    );
}

function MemberCell({ row }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            <Box
                component="img"
                src={row.avatar || ''}
                alt={row.member || 'Member'}
                onError={(event) => {
                    event.currentTarget.style.visibility = 'hidden';
                    event.currentTarget.src = 'https://via.placeholder.com/40';
                }}
                sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    bgcolor: '#e8ecf1',
                    border: '1px solid #dce3ec',
                    flexShrink: 0,
                }}
            />
            <Box sx={{ minWidth: 0 }}>
                <Typography
                    variant="body2"
                    sx={{
                        fontWeight: 700,
                        color: 'var(--text)',
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {row.member}
                </Typography>
                {row.userId != null && row.userId !== '' && (
                    <Typography
                        variant="caption"
                        sx={{ color: 'var(--muted)', display: 'block', mt: 0.25 }}
                    >
                        User ID: {row.userId}
                    </Typography>
                )}
            </Box>
        </Box>
    );
}

const WorkHistoryPage = () => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [period, setPeriod] = useState(searchParams.get('period') || 'Daily');
    const [selectedUserId, setSelectedUserId] = useState(searchParams.get('userId') || '');
    const [fromDate, setFromDate] = useState(
        searchParams.get('fromDate') || toISODateString(new Date())
    );

    const [summary, setSummary] = useState({
        productivityPercent: 0,
        neutralPercent: 0,
    });

    const [toDate] = useState(toISODateString(new Date()));

    const updateFilter = useCallback((key, value) => {
        setSearchParams(prev => {
            if (value) {
                prev.set(key, value);
            } else {
                prev.delete(key);
            }
            if (key === 'period') {
                const today = new Date();
                let newFromDate;
                if (value === 'Weekly') {
                    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                    newFromDate = toISODateString(lastWeek);
                } else if (value === 'Monthly') {
                    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                    newFromDate = toISODateString(lastMonth);
                } else {
                    newFromDate = toISODateString(today);
                }
                prev.set('fromDate', newFromDate);
            }
            return prev;
        }, { replace: true });
    }, [setSearchParams]);

    const handleView = (row) => {
        navigate(`/work-history/${row.userId}`, {
            state: { workDate: row.rawWorkDate, memberName: row.member },
        });
    };

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const memberData = await getMembers();

                setUsers(
                    memberData.map((user) => ({
                        id: user.userId,
                        fullName: user.userName,
                    }))
                );
            } catch (e) {
                console.error(e);
                setError('Failed to load users.');
            }
        };

        fetchUsers();
    }, []);

    useEffect(() => {
        setPeriod(searchParams.get('period') || 'Daily');
        setSelectedUserId(searchParams.get('userId') || '');
        setFromDate(searchParams.get('fromDate') || toISODateString(new Date()));
    }, [searchParams]);


    useEffect(() => {
        if (!fromDate || users.length === 0) return;

        const fetchWorkHistory = async () => {
            setLoading(true);
            setError('');

            try {
                const selectedUser = users.find(
                    (u) => String(u.id) === String(selectedUserId)
                );

                if (selectedUserId && !selectedUser) {
                    return;
                }

                const userName = selectedUser?.fullName;
                let reports = [];

                switch (period) {
                    case 'Weekly':
                        reports = await getWeeklyWorkReport({
                            userName,
                            fromDate,
                            toDate,
                        });
                        break;

                    case 'Monthly':
                        reports = await getMonthlyWorkReport({
                            userName,
                            fromDate,
                            toDate,
                        });
                        break;

                    case 'Daily':
                    default: {
                        const selectedDate = new Date(fromDate);

                        const startOfDay = new Date(selectedDate);
                        startOfDay.setHours(0, 0, 0, 0);

                        const endOfDay = new Date(selectedDate);
                        endOfDay.setHours(23, 59, 59, 999);

                        reports = await getDailyWorkReport({
                            userName,
                            fromDate: startOfDay.toISOString(),
                            toDate: endOfDay.toISOString(),
                        });
                        break;
                    }
                }

                setRows(reports.map(mapWorkHistoryRow));

                let totalProductive = 0;
                let totalNeutral = 0;

                reports.forEach((r) => {
                    totalProductive += parseTime(r.productive);
                    totalNeutral += parseTime(r.neutral);
                });

                const total = totalProductive + totalNeutral;

                const productivityPercent =
                    total > 0 ? (totalProductive / total) * 100 : 0;

                const neutralPercent =
                    total > 0 ? (totalNeutral / total) * 100 : 0;

                setSummary({
                    productivityPercent: Math.round(productivityPercent),
                    neutralPercent: Math.round(neutralPercent),
                });
            } catch (e) {
                console.error(e);
                setRows([]);
                setError(`Failed to fetch work history: ${e.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchWorkHistory();
    }, [selectedUserId, fromDate, period, users, toDate]);

    const prod = summary.productivityPercent || 0;
    const neutral = summary.neutralPercent || 0;

    const statCards = [
        {
            icon: TrendingUpIcon,
            value: `${prod}%`,
            label: 'Members Productivity Time',
            iconColor: 'var(--primary)',
        },
        {
            icon: PauseIcon,
            value: `${neutral}%`,
            label: 'Members Neutral Time',
            iconColor: 'var(--primary)',
        },
    ];

    const tableColumns = [
        { id: 'workDate', label: 'Date', field: 'workDate' },
        {
            id: 'member',
            label: 'Member',
            field: 'member',
            render: (row) => <MemberCell row={row} />,
        },
        { id: 'totalTime', label: 'Total Time', field: 'totalTime' },
        {
            id: 'productiveTime',
            label: 'Productive Time',
            field: 'productiveTime',
            cellSx: { color: 'rgb(51, 133, 198)', fontWeight: 600 },
        },
        {
            id: 'neutralTime',
            label: 'Neutral Time',
            field: 'neutralTime',
            cellSx: { color: '#d9902a', fontWeight: 600 },
        },
        {
            id: 'action',
            label: 'Action',
            field: 'action',
            align: 'center',
            headerSx: { whiteSpace: 'nowrap', width: 72 },
            cellSx: { whiteSpace: 'nowrap' },
            render: (row) => (
                <IconButton
                    size="small"
                    aria-label="View work history"
                    onClick={(event) => {
                        event.stopPropagation();
                        handleView(row);
                    }}
                    sx={{
                        color: 'var(--primary)',
                        bgcolor: 'var(--primary-soft, #e8f2fb)',
                        '&:hover': { bgcolor: 'rgba(47, 128, 201, 0.18)' },
                    }}
                >
                    <VisibilityIcon fontSize="small" />
                </IconButton>
            ),
        },
    ];

    return (
        <Box sx={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
            <Typography
                variant="h4"
                component="h1"
                sx={{
                    m: 0,
                    mb: { xs: 2, sm: 2.5 },
                    pl: contentInset,
                    fontWeight: 800,
                    color: 'var(--text)',
                    fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
                    letterSpacing: '-0.02em',
                }}
            >
                Productivity Reports
            </Typography>
            <Card
                elevation={0}
                sx={{
                    ...sectionCardSx,
                    mb: 2,
                    p: contentInset,
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 2,
                        alignItems: 'center',
                    }}
                >
                    <ToggleButtonGroup
                        value={period}
                        exclusive
                        size="small"
                        onChange={(_e, newPeriod) => {
                            if (newPeriod) {
                                setPeriod(newPeriod);
                                updateFilter('period', newPeriod);
                            }
                        }}
                        aria-label="Report period"
                        sx={{
                            ...periodToggleSx,
                            width: { xs: '100%', sm: 'auto' },
                        }}
                    >
                        <ToggleButton value="Daily">Daily</ToggleButton>
                        <ToggleButton value="Weekly">Weekly</ToggleButton>
                        <ToggleButton value="Monthly">Monthly</ToggleButton>
                    </ToggleButtonGroup>

                    <Box
                        sx={{
                            flex: { xs: '1 1 100%', sm: '1 1 220px' },
                            minWidth: { xs: '100%', sm: 200 },
                            maxWidth: { md: 320 },
                        }}
                    >
                        <FormControl fullWidth size="small" sx={filterInputSx}>
                            <InputLabel id="user-select-label" shrink>
                                User
                            </InputLabel>
                            <Select
                                labelId="user-select-label"
                                label="User"
                                value={selectedUserId}
                                displayEmpty
                                onChange={(e) => {
                                    setSelectedUserId(e.target.value);
                                    updateFilter('userId', e.target.value);
                                }}
                            >
                                <MenuItem value="">
                                    <em>All Users</em>
                                </MenuItem>
                                {users.map((user) => (
                                    <MenuItem key={user.id} value={user.id}>
                                        {user.fullName}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    {period === 'Daily' && (
                        <Box
                            sx={{
                                flex: { xs: '1 1 100%', sm: '0 0 200px' },
                                minWidth: { xs: '100%', sm: 180 },
                                maxWidth: { sm: 220 },
                            }}
                        >
                            <TextField
                                label="From"
                                type="date"
                                size="small"
                                value={fromDate}
                                onChange={(e) => {
                                    setFromDate(e.target.value);
                                    updateFilter('fromDate', e.target.value);
                                }}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                                sx={filterInputSx}
                            />
                        </Box>
                    )}
                </Box>
            </Card>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 2,
                    mb: 2,
                    width: '100%',
                }}
            >
                {statCards.map((card) => (
                    <ProductivityStatCard key={card.label} {...card} />
                ))}
            </Box>
            <Card
                elevation={0}
                sx={{
                    ...sectionCardSx,
                    overflow: 'hidden',
                }}
            >
                <Box sx={{ px: contentInset, pt: contentInset, pb: 1 }}>
                    <Typography
                        sx={{
                            fontWeight: 800,
                            fontSize: '1.05rem',
                            color: 'var(--text)',
                        }}
                    >
                        {period} Activity
                    </Typography>
                </Box>

                <Box
                    className="work-history-table-scroll"
                    sx={{
                        width: '100%',
                        maxWidth: '100%',
                        minWidth: 0,
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        WebkitOverflowScrolling: 'touch',
                        scrollbarWidth: 'thin',
                        '&::-webkit-scrollbar': { height: 8 },
                        '&::-webkit-scrollbar-thumb': {
                            borderRadius: 4,
                            backgroundColor: 'rgba(0,0,0,0.25)',
                        },
                        '& .MuiTableContainer-root': {
                            overflowX: 'auto',
                        },
                    }}
                >
                    {loading ? (
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                height: 300,
                            }}
                        >
                            <CircularProgress />
                        </Box>
                    ) : error ? (
                        <Box sx={{ p: 2 }}>
                            <Alert severity="error">{error}</Alert>
                        </Box>
                    ) : rows.length === 0 ? (
                        <Box
                            sx={{
                                p: { xs: 2, sm: 3 },
                                textAlign: 'center',
                            }}
                        >
                            <Typography color="text.secondary">
                                No work history found for the selected criteria.
                            </Typography>
                        </Box>
                    ) : (
                        <ResponsiveTable
                            columns={tableColumns}
                            rows={rows}
                            getRowKey={(row) => row.id}
                            variant="resource"
                            alwaysTable
                            sx={{
                                width: '100%',
                                ...tableAlignSx,
                                '& table': {
                                    width: '100%',
                                    minWidth: 720,
                                    tableLayout: { xs: 'auto', md: 'fixed' },
                                },
                            }}
                        />
                    )}
                </Box>
            </Card>
        </Box>
    );
};

export default WorkHistoryPage;
