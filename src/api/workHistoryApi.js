import axiosClient from './axiosClient';

function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(value) {
    if (!value || typeof value !== 'string') return '00:00:00';
    return value.split('.')[0]; // Remove milliseconds if present
}

function normalizeWorkReport(report) {
    return {
        userId: report.userId ?? 0,
        userName: report.userName ?? 'N/A',
        workDate: report.workDate ?? '',
        totalTime: report.totalTime ?? '00:00:00',
        productive: report.productive ?? '00:00:00',
        neutral: report.neutral ?? '00:00:00',
        workspaces: report.workspaces ?? 'N/A',
    };
}

export function mapWorkHistoryRow(report) {
    return {
        id: `${report.userId}-${report.workDate}-${Math.random()}`, // Add random factor for unique key
        workDate: formatDate(report.workDate),
        member: report.userName,
        workspace: report.workspaces,
        totalTime: formatTime(report.totalTime),
        productiveTime: formatTime(report.productive),
        neutralTime: formatTime(report.neutral),
    };
}

export async function getDailyWorkReport(params) {
    const query = buildQuery(params);

    const response = await fetch(
        `/api/UserActivity/daily?${query}`,
        {
            headers: authHeaders(),
        }
    );

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result?.message || "Request failed");
    }

    return (result.data ?? []).map(normalizeWorkReport);
}

export async function getWeeklyWorkReport({ userId, fromDate, toDate }) {
    const params = {};

    if (userId) params.userId = userId;
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;

    const response = await axiosClient.get(
        '/api/UserActivity/weekly',
        { params }
    );

    return (response.data?.data ?? []).map(normalizeWorkReport);
}

export async function getMonthlyWorkReport({ userId, fromDate, toDate }) {
    const params = {};

    if (userId) params.userId = userId;
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;

    const response = await axiosClient.get(
        '/api/UserActivity/monthly',
        { params }
    );

    return (response.data?.data ?? []).map(normalizeWorkReport);
}