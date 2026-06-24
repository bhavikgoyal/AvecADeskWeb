import { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CircularProgress,
    Grid,
    MenuItem,
    Select,
    TextField,
    Typography,
    FormControl,
    InputLabel,
    Alert,
} from '@mui/material';

import ResponsiveTable from '../../components/ResponsiveTable';
import { getMembers } from '../../api/membersApi';
import {
    getDailyWorkReport,
    getWeeklyWorkReport,
    getMonthlyWorkReport,
    mapWorkHistoryRow,
} from '../../api/userActivityApi';
import VisibilityIcon from '@mui/icons-material/Visibility';
import IconButton from '@mui/material/IconButton';
import { useNavigate } from 'react-router-dom';

function toISODateString(date) {
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

const WorkHistoryPage = () => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [period, setPeriod] = useState('Daily');

    const [fromDate, setFromDate] = useState(
        toISODateString(new Date())
    );

    const [toDate] = useState(toISODateString(new Date()));
    const handleView = (row) => {
        navigate(`/work-history/${row.userId}`, {
            state: { workDate: row.rawWorkDate },
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
        const today = new Date();
        let newFromDate;

        if (period === 'Weekly') {
            const lastWeek = new Date(
                today.getTime() - 7 * 24 * 60 * 60 * 1000
            );
            newFromDate = toISODateString(lastWeek);
        } else if (period === 'Monthly') {
            const lastMonth = new Date(
                today.getTime() - 30 * 24 * 60 * 60 * 1000
            );
            newFromDate = toISODateString(lastMonth);
        } else {
            newFromDate = toISODateString(today);
        }
        setFromDate(newFromDate);
    }, [period]);

    useEffect(() => {
        if (users.length === 0) return;

        const fetchWorkHistory = async () => {
            setLoading(true);
            setError('');

            try {
                const selectedUser = users.find(
                    (u) => String(u.id) === String(selectedUserId)
                );

                const employeeName = selectedUser?.fullName;

                let reports = [];
                switch (period) {
                    case 'Weekly':
                        reports = await getWeeklyWorkReport({
                            employeeName,
                            fromDate,
                            toDate,
                        });
                        break;

                    case 'Monthly':
                        reports = await getMonthlyWorkReport({
                            employeeName,
                            fromDate,
                            toDate,
                        });
                        break;

                    case 'Daily':
                    default:
                        reports = await getDailyWorkReport({
                            employeeName,
                            fromDate,
                            toDate,
                        });
                        break;
                }

                setRows(reports.map(mapWorkHistoryRow));
            } catch (e) {
                console.error(e);
                setRows([]);
                setError(
                    `Failed to fetch work history: ${e.message}`
                );
            } finally {
                setLoading(false);
            }
        };

        fetchWorkHistory();
    }, [selectedUserId, fromDate, period, users]);

    const tableColumns = [
        { id: 'workDate', label: 'Date', field: 'workDate' },
        { id: 'member', label: 'Member', field: 'member' },
        { id: 'totalTime', label: 'Total Time', field: 'totalTime' },
        { id: 'productiveTime', label: 'Productive Time', field: 'productiveTime' },
        { id: 'neutralTime', label: 'Neutral Time', field: 'neutralTime' },
        {
            id: 'action',
            label: 'Action',
            field: 'action',
            align: 'center',
            headerSx: { whiteSpace: 'nowrap' },
            cellSx: { whiteSpace: 'nowrap' },
            render: (row) => (
                <IconButton
                    color="primary"
                    size="small"
                    aria-label="View work history"
                    onClick={(event) => {
                        event.stopPropagation();
                        handleView(row);
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
                    my: { xs: 1.5, sm: 2 },
                    fontWeight: 'bold',
                    color: 'primary.main',
                    fontSize: { xs: '1.35rem', sm: '1.75rem', md: '2.125rem' },
                }}
            >
                WORK HISTORY PAGE
            </Typography>

            <Card
                elevation={0}
                sx={{
                    mt: 2,
                    width: '100%',
                    minWidth: 0,
                    border: '1px solid var(--card-border)',
                    bgcolor: 'var(--card-bg)',
                }}
            >
                <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
                    <Grid
                        container
                        spacing={2}
                        alignItems="stretch"
                        sx={{ width: '100%', maxWidth: '100%', m: 0 }}
                    >
                        <Grid
                            size={{ xs: 12, md: 5 }}
                            sx={{ width: '100%', minWidth: 0, display: 'flex' }}
                        >
                            <Box sx={{ width: '100%', minWidth: 0 }}>
                                <FormControl fullWidth size="small" sx={filterInputSx}>
                                    <InputLabel id="user-select-label" shrink>
                                        User
                                    </InputLabel>

                                    <Select
                                        labelId="user-select-label"
                                        label="User"
                                        value={selectedUserId}
                                        displayEmpty
                                        onChange={(e) =>
                                            setSelectedUserId(
                                                e.target.value
                                            )
                                        }
                                    >
                                        <MenuItem value="">
                                            <em>All Users</em>
                                        </MenuItem>

                                        {users.map((user) => (
                                            <MenuItem
                                                key={user.id}
                                                value={user.id}
                                            >
                                                {user.fullName}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Box>
                        </Grid>

                        <Grid
                            size={{ xs: 12, sm: 6, md: 4 }}
                            sx={{
                                width: '100%',
                                minWidth: { xs: '100%', sm: 180, md: 200 },
                                display: 'flex',
                            }}
                        >
                            <Box sx={{ width: '100%', minWidth: 0 }}>
                                <TextField
                                    label="From"
                                    type="date"
                                    size="small"
                                    value={fromDate}
                                    onChange={(e) =>
                                        setFromDate(e.target.value)
                                    }
                                    InputLabelProps={{
                                        shrink: true,
                                    }}
                                    fullWidth
                                    sx={filterInputSx}
                                />
                            </Box>
                        </Grid>

                        <Grid
                            size={{ xs: 12, sm: 6, md: 3 }}
                            sx={{
                                width: '100%',
                                minWidth: { xs: '100%', sm: 140, md: 160 },
                                display: 'flex',
                            }}
                        >
                            <Box sx={{ width: '100%', minWidth: 0 }}>
                                <FormControl fullWidth size="small" sx={filterInputSx}>
                                    <InputLabel id="period-select-label" shrink>
                                        Period
                                    </InputLabel>

                                    <Select
                                        labelId="period-select-label"
                                        label="Period"
                                        value={period}
                                        onChange={(e) =>
                                            setPeriod(
                                                e.target.value
                                            )
                                        }
                                    >
                                        <MenuItem value="Daily">
                                            Daily
                                        </MenuItem>

                                        <MenuItem value="Weekly">
                                            Weekly
                                        </MenuItem>

                                        <MenuItem value="Monthly">
                                            Monthly
                                        </MenuItem>
                                    </Select>
                                </FormControl>
                            </Box>
                        </Grid>
                    </Grid>
                </Box>

                <Box
                    sx={{
                        width: '100%',
                        maxWidth: '100%',
                        minWidth: 0,
                        overflowX: 'scroll',
                        overflowY: 'hidden',
                        WebkitOverflowScrolling: 'touch',
                        borderTop: rows.length > 0 ? '1px solid var(--card-border)' : 'none',
                        scrollbarWidth: 'thin',
                        '&::-webkit-scrollbar': { height: 8 },
                        '&::-webkit-scrollbar-thumb': {
                            borderRadius: 4,
                            backgroundColor: 'rgba(0,0,0,0.25)',
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
                            <Alert severity="error">
                                {error}
                            </Alert>
                        </Box>
                    ) : rows.length === 0 ? (
                        <Box
                            sx={{
                                p: { xs: 2, sm: 3 },
                                textAlign: 'center',
                            }}
                        >
                            <Typography color="text.secondary">
                                No work history found for the
                                selected criteria.
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
                                overflowX: 'scroll',
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
