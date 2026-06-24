import axiosClient from './axiosClient';
import { Session } from "../utils/session";

const authHeaders = () => {
  const token = Session.getToken();

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

function buildQuery(params) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.append(key, value);
    }
  });

  return search.toString();
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "";

  const [hours, minutes] = value.split(":");

  return `${hours}:${minutes}`;
}

function normalizeWorkReport(report) {
  return {
    userId: report.userId ?? 0,
    userName: report.userName ?? "",
    workDate: report.workDate ?? "",
    checkIn: report.checkIn ?? "",
    checkOut: report.checkOut ?? "",
    totalTime: report.totalTime ?? "00:00:00",
    productive: report.productive ?? "00:00:00",
    neutral: report.neutral ?? "00:00:00",
    workspaces: report.workspaces ?? "",
  };
}

export function mapWorkHistoryRow(report) {
  return {
    id: `${report.userId}-${report.workDate}`,
    userId: report.userId,
    member: report.userName,
    rawWorkDate: report.workDate,
    workDate: formatDate(report.workDate),
    workspace: report.workspaces,
    totalTime: report.totalTime,
    productiveTime: report.productive,
    neutralTime: report.neutral,
    checkIn: formatTime(report.checkIn),
    checkOut: formatTime(report.checkOut),
  };
}

export async function getDailyWorkReport({ employeeName, fromDate, toDate, }) {
  const query = buildQuery({ employeeName, fromDate, toDate, });
  const response = await fetch(`/api/UserActivity/daily?${query}`,
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

export async function getWeeklyWorkReport({ employeeName, fromDate, toDate }) {
  const response = await axiosClient.get("/api/UserActivity/weekly",
    {
      params: {
        employeeName, fromDate, toDate,
      },
    }
  );

  return (response.data?.data ?? []).map(normalizeWorkReport);
}

export async function getMonthlyWorkReport({ employeeName, fromDate, toDate }) {
  const response = await axiosClient.get("/api/UserActivity/monthly",
    {
      params: {
        employeeName, fromDate, toDate,
      },
    }
  );

  return (response.data?.data ?? []).map(normalizeWorkReport);
}