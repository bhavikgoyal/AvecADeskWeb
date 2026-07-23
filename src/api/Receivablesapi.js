import axiosClient from './axiosClient';

function buildParams({ fromDate, toDate, instituteId, studentId } = {}) {
  const params = {};
  if (fromDate) params.fromDate = fromDate;
  if (toDate) params.toDate = toDate;
  if (instituteId) params.instituteId = instituteId;
  if (studentId) params.studentId = studentId;
  return params;
}

export async function fetchReceivablesSummary(filters = {}) {
  const { data } = await axiosClient.get('/api/receivables/summary', { params: buildParams(filters) });
  return data; 
}

export async function fetchAnticipated(filters = {}) {
  const { data } = await axiosClient.get('/api/receivables/anticipated', { params: buildParams(filters) });
  return data; 
}

export async function fetchOverdue(filters = {}) {
  const { data } = await axiosClient.get('/api/receivables/overdue', { params: buildParams(filters) });
  return data; 
}

export async function fetchReceived(filters = {}) {
  const { data } = await axiosClient.get('/api/receivables/received', { params: buildParams(filters) });
  return data; 
}

export async function fetchMonthRevenueDashboard(filters = {}) {
  const { data } = await axiosClient.get('/api/receivables/month-revenue-dashboard', { params: buildParams(filters) });
  return data;
}

export async function fetchStudentPaymentInstallments(filters = {}) {
  const { data } = await axiosClient.get('/api/receivables/student-payment-installments', { params: buildParams(filters) });
  return data;
}