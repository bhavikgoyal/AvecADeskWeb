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
  const fileName = match?.[1]?.replace(/['"]/g, '') || `invoice-${invoiceId}.pdf`;
  const url = window.URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
