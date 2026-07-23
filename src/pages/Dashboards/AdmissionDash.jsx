import { useEffect, useState } from 'react';
import { Box, Button, Grid, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PeopleIcon from '@mui/icons-material/People';
import StoreIcon from '@mui/icons-material/Store';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import { useNavigate } from 'react-router-dom';
import { buildSparkline } from '../../constants/chartData';
import { fetchAllStudents } from '../../api/studentsApi';
import { fetchVendorRows } from '../../api/vendorsApi';
import { useAuth } from '../../hooks/useAuth';
import WelcomeCard from '../../components/WelcomeCard';
import StatCard from '../../components/StatCard';

export default function AdmissionDash() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [studentStats, setStudentStats] = useState({
    total: 0,
    newThisMonth: 0,
  });

  const [vendorStats, setVendorStats] = useState({
    total: 0,
    newThisMonth: 0,
    active: 0,
    pending: 0,
    loggedInToday: 0,
  });

  useEffect(() => {
    const getNewThisMonthCount = (list) =>
      Array.isArray(list)
        ? list.filter((item) => {
            if (!item.createdAt) return false;
            const created = new Date(item.createdAt);
            const now = new Date();
            return (
              created.getFullYear() === now.getFullYear() &&
              created.getMonth() === now.getMonth()
            );
          }).length
        : 0;

    const fetchData = async () => {
      try {
        const studentList = await fetchAllStudents();
        const vendorList = await fetchVendorRows();

        if (Array.isArray(studentList)) {
          setStudentStats({
            total: studentList.length,
            newThisMonth: getNewThisMonthCount(studentList),
          });
        }

        if (Array.isArray(vendorList)) {
          const active = vendorList.filter(
            (v) => (v.status || '').toLowerCase() === 'active',
          ).length;

          const pending = vendorList.filter(
            (v) => (v.status || '').toLowerCase() === 'pending',
          ).length;

          const loggedInToday = vendorList.filter((v) => {
            if (!v.lastLogin) return false;
            const loginDate = new Date(v.lastLogin);
            const today = new Date();
            return (
              loginDate.getDate() === today.getDate() &&
              loginDate.getMonth() === today.getMonth() &&
              loginDate.getFullYear() === today.getFullYear()
            );
          }).length;

          setVendorStats({
            total: vendorList.length,
            newThisMonth: getNewThisMonthCount(vendorList),
            active,
            pending,
            loggedInToday,
          });
        }
      } catch (error) {
        console.error('Dashboard Error:', error);
      }
    };

    fetchData();
  }, []);

  const welcomeFooterStats = [
    {
      label: 'Students',
      value: studentStats.total.toLocaleString(),
      trend: studentStats.newThisMonth > 0 ? 1 : 0,
    },
    {
      label: 'Vendors',
      value: vendorStats.total.toLocaleString(),
      trend: vendorStats.newThisMonth > 0 ? 1 : 0,
    },
  ];

  const kpiCards = [
    {
      label: 'Total Students',
      value: studentStats.total.toLocaleString(),
      sparklineData: buildSparkline(2),
      icon: <PeopleIcon />,
      color: 'var(--primary)',
      footer: [
        {
          label: 'New this month',
          value: `+${studentStats.newThisMonth}`,
          sub: 'this month',
        },
      ],
    },
    {
      label: 'Total Vendors',
      value: vendorStats.total.toLocaleString(),
      sparklineData: buildSparkline(2),
      icon: <StoreIcon />,
      color: 'var(--teal)',
      footer: [
        {
          label: 'New this month',
          value: `+${vendorStats.newThisMonth}`,
          sub: 'this month',
        },
        {
          label: 'Active',
          value: vendorStats.active.toLocaleString(),
        },
        {
          label: 'Pending',
          value: vendorStats.pending.toLocaleString(),
        },
      ],
    },
    {
      label: 'Currently Active Vendors',
      value: vendorStats.loggedInToday.toLocaleString(),
      sparklineData: buildSparkline(2),
      icon: <HowToRegIcon />,
      color: 'var(--teal)',
      footer: [
        {
          label: 'Logged in today',
          value: vendorStats.loggedInToday.toLocaleString(),
        },
        {
          label: 'Active total',
          value: vendorStats.active.toLocaleString(),
        },
        {
          label: 'Pending',
          value: vendorStats.pending.toLocaleString(),
        },
      ],
    },
  ];

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 1.25,
          mb: 1.5,
          flexWrap: 'wrap',
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'var(--primary)',
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            Overview
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--text)', mt: 0.5 }}>
            Admission Dashboard
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--muted)', mt: 0.5, maxWidth: 560 }}>
            Admissions overview across students and vendors
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => navigate('/status/students')}
            sx={{
              textTransform: 'none',
              borderRadius: 2,
              borderColor: 'var(--card-border)',
              color: 'var(--text)',
            }}
          >
            View students
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => navigate('/vendors')}
            sx={{
              textTransform: 'none',
              borderRadius: 2,
              bgcolor: 'var(--primary)',
              '&:hover': { bgcolor: 'var(--primary-dark)' },
            }}
          >
            Manage vendors
          </Button>
        </Box>
      </Box>

      <Stack spacing={1.25}>
        <WelcomeCard
          userName={user?.name}
          avatar={user?.avatar}
          subtitle="Track student intake and vendor activity from one place."
          footerStats={welcomeFooterStats}
        />

        <Grid container spacing={{ xs: 1, md: 1.25 }}>
          {kpiCards.map((stat) => (
            <Grid key={stat.label} size={{ xs: 12, md: 4 }}>
              <StatCard {...stat} />
            </Grid>
          ))}
        </Grid>
      </Stack>
    </Box>
  );
}
