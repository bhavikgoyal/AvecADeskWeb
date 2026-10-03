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

  const [vendorRowsList, setVendorRowsList] = useState([]);
  const [newStudentsList, setNewStudentsList] = useState([]);

  const [vendorStats, setVendorStats] = useState({
    total: 0,
    newThisMonth: 0,
    active: 0,
    pending: 0,
    loggedInToday: 0,
    idleOneMonth: 0,
    neverLoggedIn: 0,
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
        const getLastXMonths = (count = 12) => {
          const res = [];
          const now = new Date();
          for (let i = count - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            res.push({ year: d.getFullYear(), month: d.getMonth() });
          }
          return res;
        };

        const monthlyCounts = (list, dateField = 'createdAt', months = 12, mapper) => {
          const monthsArr = getLastXMonths(months);
          return monthsArr.map(({ year, month }) => {
            const count = Array.isArray(list)
              ? list.filter((item) => {
                const raw = mapper ? mapper(item) : item[dateField];
                if (!raw) return false;
                const parsed = Date.parse(raw);
                if (Number.isNaN(parsed)) return false;
                const d = new Date(parsed);
                return d.getFullYear() === year && d.getMonth() === month;
              }).length
              : 0;
            return { v: count };
          });
        };

        const getLastXDays = (count = 7) => {
          const res = [];
          const now = new Date();
          for (let i = count - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
            res.push({ year: d.getFullYear(), month: d.getMonth(), date: d.getDate() });
          }
          return res;
        };

        const dailyCounts = (list, dateField = 'lastLogin', days = 7, mapper) => {
          const daysArr = getLastXDays(days);
          return daysArr.map(({ year, month, date }) => {
            const count = Array.isArray(list)
              ? list.filter((item) => {
                const raw = mapper ? mapper(item) : item[dateField];
                if (!raw) return false;
                const parsed = Date.parse(raw);
                if (Number.isNaN(parsed)) return false;
                const d = new Date(parsed);
                return d.getFullYear() === year && d.getMonth() === month && d.getDate() === date;
              }).length
              : 0;
            return { v: count };
          });
        };

        const studentList = await fetchAllStudents();
        const vendorList = await fetchVendorRows();

        console.log('Fetched vendorList:', vendorList);

        if (Array.isArray(studentList)) {
          const studentDateMapper = (s) => s.createdAt || s.created_at || s.created;
          setStudentStats({
            total: studentList.length,
            newThisMonth: getNewThisMonthCount(studentList),
            monthlySpark: monthlyCounts(studentList, 'createdAt', 12, studentDateMapper),
          });
          setNewStudentsList(Array.isArray(studentList) ? studentList : []);
          try {
            console.log('AdmissionDash student monthlySpark:', monthlyCounts(studentList, 'createdAt', 12, studentDateMapper));
          } catch (e) { }
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

          const now = new Date();

          const idleOneMonth = vendorList.filter((v) => {
            if (!v.lastLogin) return false;
            const parsed = Date.parse(v.lastLogin);
            if (Number.isNaN(parsed)) return false;
            const d = new Date(parsed);
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
          }).length;
          const neverLoggedIn = vendorList.filter((v) => !v.lastLogin).length;

          const vendorDateMapper = (v) => v.createdAt || v.created_at || v.created;
          const vendorLastLoginMapper = (v) => v.lastLogin || v.last_login || v.last_login_at || v.lastLoginAt;

          setVendorStats({
            total: vendorList.length,
            newThisMonth: getNewThisMonthCount(vendorList),
            active,
            pending,
            loggedInToday,
            idleOneMonth,
            neverLoggedIn,
            monthlySpark: monthlyCounts(vendorList, 'createdAt', 12, vendorDateMapper),
            monthlyActiveSpark: monthlyCounts(vendorList, 'lastLogin', 12, vendorLastLoginMapper),
            dailyActiveSpark: dailyCounts(vendorList, 'lastLogin', 7, vendorLastLoginMapper),
          });
          setVendorRowsList(Array.isArray(vendorList) ? vendorList : []);
          try {
            console.log('vendorStats set:', {
              total: vendorList.length,
              idleOneMonth,
              neverLoggedIn,
              loggedInToday,
              active,
              pending,
            });
          } catch (e) { }
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
      subValue: (studentStats.monthlySpark && studentStats.monthlySpark.length)
        ? studentStats.monthlySpark[studentStats.monthlySpark.length - 1].v
        : studentStats.newThisMonth,
    },
    {
      label: 'Vendors',
      value: vendorStats.total.toLocaleString(),
      trend: vendorStats.newThisMonth > 0 ? 1 : 0,
      subValue: (vendorStats.monthlySpark && vendorStats.monthlySpark.length)
        ? vendorStats.monthlySpark[vendorStats.monthlySpark.length - 1].v
        : vendorStats.newThisMonth,
    },
  ];

  const kpiCards = [
    {
      label: 'Total Students',
      value: studentStats.total.toLocaleString(),
      sparklineData: (() => {
        const safeList = Array.isArray(newStudentsList) ? newStudentsList : [];
        const mapper = (s) => s.createdAt || s.created_at || s.created;
        const now = new Date();
        const days = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
          days.push(d);
        }
        const cumulative = days.map((day) => {
          const endOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);
          let cnt = 0;
          for (const s of safeList) {
            const raw = mapper(s);
            if (!raw) continue;
            const parsed = Date.parse(raw);
            if (Number.isNaN(parsed)) continue;
            if (parsed <= endOfDay.getTime()) cnt += 1;
          }
          return { v: cnt };
        });
        if (!Array.isArray(cumulative) || cumulative.length !== 7) return Array.from({ length: 7 }, () => ({ v: 0 }));
        cumulative[cumulative.length - 1].v = studentStats.total || cumulative[cumulative.length - 1].v;
        return cumulative;
      })(),
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
      sparklineData: (() => {
        const safeList = Array.isArray(vendorRowsList) ? vendorRowsList : [];
        const mapper = (v) => v.createdAt || v.created_at || v.created;
        const now = new Date();
        const days = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
          days.push(d);
        }
        const cumulative = days.map((day) => {
          const endOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);
          let cnt = 0;
          for (const v of safeList) {
            const raw = mapper(v);
            if (!raw) continue;
            const parsed = Date.parse(raw);
            if (Number.isNaN(parsed)) continue;
            if (parsed <= endOfDay.getTime()) cnt += 1;
          }
          return { v: cnt };
        });
        if (!Array.isArray(cumulative) || cumulative.length !== 7) return Array.from({ length: 7 }, () => ({ v: 0 }));
        cumulative[cumulative.length - 1].v = vendorStats.total || cumulative[cumulative.length - 1].v;
        return cumulative;
      })(),
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
          label: 'Pending Status',
          value: vendorStats.pending.toLocaleString(),
        },
      ],
    },
    {
      label: 'Currently Active Vendors',
      value: vendorStats.loggedInToday.toLocaleString(),
      sparklineData: (() => {
        if (vendorRowsList && vendorRowsList.length) {
          const out = [];
          const nowDate = new Date();
          for (let i = 6; i >= 0; i--) {
            const d = new Date(nowDate);
            d.setDate(d.getDate() - i);
            const key = d.toDateString();
            const cnt = vendorRowsList.filter((v) => {
              const parsed = v && v.lastLogin ? Date.parse(v.lastLogin) : NaN;
              if (Number.isNaN(parsed)) return false;
              const dd = new Date(parsed);
              return dd.toDateString() === key;
            }).length;
            out.push({ v: cnt });
          }
          return out;
        }
        if (vendorStats.dailyActiveSpark && vendorStats.dailyActiveSpark.length) return vendorStats.dailyActiveSpark;
        if (vendorStats.monthlyActiveSpark && vendorStats.monthlyActiveSpark.length) return vendorStats.monthlyActiveSpark.slice(-7);
        return Array.from({ length: 7 }, () => ({ v: 0 }));
      })(),
      icon: <HowToRegIcon />,
      color: 'var(--teal)',
      footer: [
        {
          label: 'Active today',
          value: vendorStats.loggedInToday.toLocaleString(),
        },
        {
          label: 'Idle',
          value: vendorStats.neverLoggedIn.toLocaleString(),
          color: 'var(--error, #d32f2f)',
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
