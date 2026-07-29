import axiosClient from './axiosClient';

function formatCurrency(value) {
  const amount = Number(value);
  if (Number.isNaN(amount)) return '—';
  return amount.toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  });
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function mapInvoiceRow(item) {
  return {
    id: String(item.invoiceId ?? item.InvoiceId ?? ''),
    invoiceId: item.invoiceId ?? item.InvoiceId,
    invoiceNumber: item.invoiceNumber ?? item.InvoiceNumber ?? '',
    instituteId: item.instituteId ?? item.InstituteId,
    instituteNameRef: item.instituteName ?? item.InstituteName ?? '',
    invoiceStatus: item.status ?? item.Status ?? '',
    totalAmount: formatCurrency(item.totalAmount ?? item.TotalAmount),
    totalAmountRaw: Number(item.totalAmount ?? item.TotalAmount ?? 0),
    createdAt: formatDate(item.createdAt ?? item.CreatedAt),
    createdAtRaw: item.createdAt ?? item.CreatedAt ?? null,
    pdfPath: item.pdfPath ?? item.PdfPath ?? null,
    rejectionReason: item.rejectionReason ?? item.RejectionReason ?? '',
  };
}

export function mapPaidStudentRow(item) {
  return {
    id: String(item.studentPaymentInstallmentId ?? item.StudentPaymentInstallmentId ?? item.studentId),
    studentId: item.studentId ?? item.StudentId,
    fullName: item.fullName ?? item.FullName ?? '',
    studentCode: item.studentCode ?? item.StudentCode ?? '',
    courseName: item.courseName ?? item.CourseName ?? '',
    campus: item.campus ?? item.Campus ?? '',
    instituteId: item.instituteId ?? item.InstituteId,
    instituteName: item.instituteName ?? item.InstituteName ?? '',
    installmentNo: item.installmentNo ?? item.InstallmentNo,
    dueDate: formatDate(item.dueDate ?? item.DueDate),
    feesAmount: formatCurrency(item.feesAmount ?? item.FeesAmount),
    invoiceAmount: formatCurrency(item.invoiceAmount ?? item.InvoiceAmount),
    paymentStatus: item.paymentStatus ?? item.PaymentStatus ?? '',
  };
}

export async function fetchInvoices() {
  const { data } = await axiosClient.get('/api/invoices');
  const list = Array.isArray(data) ? data : [];
  return list.map(mapInvoiceRow);
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function computeMonthlySummary(mappedRows) {
  const now = new Date();
  const thisMonthKey = getMonthKey(now);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = getMonthKey(lastMonthDate);
  const summary = {
    thisMonth: { count: 0, total: 0, paid: 0, due: 0 },
    lastMonth: { count: 0, total: 0, paid: 0, due: 0 },
  };

  for (const row of mappedRows) {
    const createdRaw = row.createdAtRaw ?? row.createdAt;
    const created = !createdRaw || createdRaw === '—' ? null : new Date(createdRaw);
    if (!created || Number.isNaN(created.getTime())) continue;
    const key = getMonthKey(created);
    const amount = Number(row.totalAmountRaw || 0) || 0;
    const status = (row.invoiceStatus || '').toString().toLowerCase();
    const isPaid = status === 'approved' || status === 'paid';
    const isDueStatus = status === 'pending' || status === 'invoiced';
    const target = key === thisMonthKey ? summary.thisMonth : (key === lastMonthKey ? summary.lastMonth : null);
    if (!target) continue;
    if (!(isPaid || isDueStatus)) continue;
    target.count += 1;
    target.total += amount;
    if (isPaid) target.paid += amount;
    else if (isDueStatus) target.due += amount;
  }

  summary.thisMonth.total = Number(summary.thisMonth.total.toFixed(2));
  summary.thisMonth.paid = Number(summary.thisMonth.paid.toFixed(2));
  summary.thisMonth.due = Number(summary.thisMonth.due.toFixed(2));
  summary.lastMonth.total = Number(summary.lastMonth.total.toFixed(2));
  summary.lastMonth.paid = Number(summary.lastMonth.paid.toFixed(2));
  summary.lastMonth.due = Number(summary.lastMonth.due.toFixed(2));
  return summary;
}

export async function fetchInvoicesWithMonthlyTotals({ year, month } = {}) {
  const { data } = await axiosClient.get('/api/invoices');
  const list = Array.isArray(data) ? data : [];
  const rows = list.map(mapInvoiceRow);
  let filtered = rows;
  if (year != null && month != null) {
    const y = Number(year);
    const m = Number(month) - 1;
    filtered = rows.filter((r) => {
      const dt = r.createdAtRaw ? new Date(r.createdAtRaw) : (r.createdAt ? new Date(r.createdAt) : null);
      if (!dt || Number.isNaN(dt.getTime())) return false;
      return dt.getFullYear() === y && dt.getMonth() === m;
    });
  }
  const summary = computeMonthlySummary(rows);
  return { rows: filtered, summary };
}

export async function fetchPaidStudentsForInvoice({ year, month, instituteId, campus } = {}) {
  const params = {};
  if (year != null) params.year = year;
  if (month != null) params.month = month;
  if (instituteId != null) params.instituteId = instituteId;
  if (campus) params.campus = campus;
  const { data } = await axiosClient.get('/api/invoices/paid-students', { params });
  const list = Array.isArray(data) ? data : [];
  return list.map(mapPaidStudentRow);
}

export async function generateMonthlyInvoice({ year, month, instituteId, campus } = {}) {
  const body = {};
  if (year != null) body.year = year;
  if (month != null) body.month = month;
  if (instituteId != null) body.instituteId = instituteId;
  if (campus) body.campus = campus;
  const { data } = await axiosClient.post('/api/invoices/generate-monthly', body);
  return data;
}

export async function downloadInvoiceDocument(invoiceId) {
  const { data, headers } = await axiosClient.get(`/api/invoices/${invoiceId}/pdf`, {
    responseType: 'blob',
  });
  const contentDisposition = headers['content-disposition'] || '';
  const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
  const fileName = match?.[1]?.replace(/['"]/g, '') || `invoice-${invoiceId}.txt`;
  const url = window.URL.createObjectURL(new Blob([data], { type: 'text/plain' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.endsWith('.txt') ? fileName : `${fileName.replace(/\.(pdf|doc|docx)$/i, '')}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
