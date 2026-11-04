import axiosClient from './axiosClient';

const toNumber = (value) => Number(value ?? 0) || 0;

export async function getProductivityDashboard({ fromDate, toDate, trendDays }) {
  const response = await axiosClient.get('/api/Productivity/dashboard', {
    params: { fromDate, toDate, trendDays },
  });
  const data = response.data?.data ?? {};

  return {
    members: (data.members ?? []).map((m) => ({
      userId: m.userId,
      name: m.fullName || m.userName || `User ${m.userId}`,
      role: m.roleName ?? '',
      totalSeconds: toNumber(m.totalSeconds),
      productiveSeconds: toNumber(m.productiveSeconds),
      neutralSeconds: toNumber(m.neutralSeconds),
      tasksTotal: toNumber(m.tasksTotal),
      tasksDone: toNumber(m.tasksDone),
      firstLoginOn: m.firstLoginOn ?? null,
      lastSeenOn: m.lastSeenOn ?? null,
      loginDays: toNumber(m.loginDays),
    })),
    dailyActivity: (data.dailyActivity ?? []).map((d) => ({
      id: `${d.workDate}-${d.userId}`,
      workDate: d.workDate,
      userId: d.userId,
      userName: d.userName ?? '',
      name: d.fullName || d.userName || `User ${d.userId}`,
      totalSeconds: toNumber(d.totalSeconds),
      productiveSeconds: toNumber(d.productiveSeconds),
      neutralSeconds: toNumber(d.neutralSeconds),
    })),
    trend: (data.trend ?? []).map((t) => ({
      workDate: t.workDate,
      productiveSeconds: toNumber(t.productiveSeconds),
      neutralSeconds: toNumber(t.neutralSeconds),
    })),
  };
}
