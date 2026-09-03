import axiosClient from './axiosClient';

const PAST_MONTHS = 18;
const FUTURE_MONTHS = 6;
const TOTAL_MONTHS = PAST_MONTHS + FUTURE_MONTHS;

function buildParams({ fromDate, toDate, instituteId, studentId } = {}) {
  const params = {};
  if (fromDate) params.fromDate = fromDate;
  if (toDate) params.toDate = toDate;
  if (instituteId) params.instituteId = instituteId;
  if (studentId) params.studentId = studentId;
  return params;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function ensureDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (value == null || value === '') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function monthKey(value) {
  const date = ensureDate(value);
  if (!date) return '';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

function monthLabel(value) {
  const date = ensureDate(value);
  if (!date) return '';
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).replace(' ', '-');
}

function startOfMonth(value) {
  const date = ensureDate(value) || new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(value) {
  const date = ensureDate(value) || new Date();
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function toIsoDate(value) {
  const date = ensureDate(value);
  if (!date) return '';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** 18 months through current month + 6 future months = 24 columns */
export function buildReceivablesMonthRange(referenceDate = new Date()) {
  const current = startOfMonth(referenceDate);
  const start = new Date(current.getFullYear(), current.getMonth() - (PAST_MONTHS - 1), 1);
  const months = [];

  for (let i = 0; i < TOTAL_MONTHS; i += 1) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    months.push({
      key: monthKey(d),
      label: monthLabel(d),
      year: d.getFullYear(),
      month: d.getMonth(),
      isCurrent: monthKey(d) === monthKey(current),
      isFuture: d > current,
    });
  }

  const lastMonthDate = new Date(
    start.getFullYear(),
    start.getMonth() + TOTAL_MONTHS - 1,
    1,
  );

  return {
    months,
    fromDate: toIsoDate(start),
    toDate: toIsoDate(endOfMonth(lastMonthDate)),
    titleYears: `${months[0].year} - ${months[months.length - 1].year}`,
  };
}

function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.installments)) return payload.installments;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function resolveCollegeName(row) {
  return (
    row.collegeName ||
    row.CollegeName ||
    row.instituteName ||
    row.InstituteName ||
    row.instituteNameRef ||
    'Unknown'
  ).toString().trim() || 'Unknown';
}

function resolveDueDate(row) {
  const raw = row.dueDate || row.DueDate || row.paymentDueDate || row.expectedDate;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function resolveAmount(row) {
  const paid = Number(row.amountPaid ?? row.AmountPaid ?? 0);
  const balance = Number(row.balanceDue ?? row.BalanceDue ?? NaN);
  const due = Number(row.amountDue ?? row.AmountDue ?? NaN);
  const commission = Number(row.commissionAmount ?? row.commission?.amount ?? 0) || 0;
  const bonus = Number(row.bonusAmount ?? row.bonus?.amount ?? 0) || 0;
  const commissionTotal = commission + bonus;

  const status = resolveRawStatus(row);
  if (status === 'paid') {
    if (paid > 0) return paid;
    if (commissionTotal > 0) return commissionTotal;
    if (!Number.isNaN(due)) return due;
    return 0;
  }

  if (!Number.isNaN(balance)) return balance;
  if (!Number.isNaN(due)) return Math.max(due - (paid || 0), 0);
  if (commissionTotal > 0) return commissionTotal;
  return Number(row.amount ?? row.Amount ?? 0) || 0;
}

function resolveRawStatus(row) {
  const raw = (
    row.cellStatus ||
    row.status ||
    row.Status ||
    row.commissionStatus ||
    row.paymentStatus ||
    ''
  )
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '')
    .trim();

  // DB settled/paid statuses: PaidByCollege, PaidByStudent, ConfirmedByCollege, ConfirmedByStudent
  if (
    raw.includes('paid') ||
    raw.includes('confirm') ||
    raw === 'received' ||
    raw === 'settled'
  ) {
    return 'paid';
  }
  if (raw.includes('overdue')) return 'overdue';
  if (raw.includes('anticipat') || raw.includes('pending') || raw === 'partial' || raw.includes('due')) {
    return 'anticipated';
  }
  return raw || '';
}

function resolveCellStatus(row, todayStart) {
  const raw = resolveRawStatus(row);
  // Paid / settled / confirmed must never be remapped to anticipated/overdue
  if (raw === 'paid') return 'paid';
  if (raw === 'overdue') return 'overdue';

  const due = resolveDueDate(row);
  if (due && due < todayStart) return 'overdue';
  return 'anticipated';
}

/**
 * Pivot flat installment / receivable rows into college × month matrix.
 * Amounts are bucketed by status so Paid stays green (Received).
 */
export function buildAnticipatedReceivablesMatrix(rows, range = buildReceivablesMonthRange()) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const monthKeys = new Set(range.months.map((m) => m.key));
  const byCollege = new Map();

  for (const row of asArray(rows)) {
    const due = resolveDueDate(row);
    if (!due) continue;
    const key = monthKey(due);
    if (!monthKeys.has(key)) continue;

    const collegeName = resolveCollegeName(row);
    const amount = resolveAmount(row);
    if (!amount) continue;
    const status = resolveCellStatus(row, todayStart);

    if (!byCollege.has(collegeName)) {
      byCollege.set(collegeName, { collegeName, cells: {} });
    }
    const college = byCollege.get(collegeName);
    if (!college.cells[key]) {
      college.cells[key] = { paid: 0, overdue: 0, anticipated: 0 };
    }
    const bucket = status === 'paid' || status === 'overdue' || status === 'anticipated'
      ? status
      : 'anticipated';
    college.cells[key][bucket] += amount;
  }

  const colleges = Array.from(byCollege.values())
    .map((college) => {
      const cells = {};
      for (const [key, buckets] of Object.entries(college.cells)) {
        const paid = Number(buckets.paid) || 0;
        const overdue = Number(buckets.overdue) || 0;
        const anticipated = Number(buckets.anticipated) || 0;
        const amount = paid + overdue + anticipated;
        if (!amount) continue;

        // Color rule: unpaid first; otherwise Paid/Received (green)
        let status = 'paid';
        if (overdue > 0) status = 'overdue';
        else if (anticipated > 0 && paid === 0) status = 'anticipated';
        else if (anticipated > 0 && paid > 0) {
          // Mixed month: show dominant bucket; prefer paid when paid >= anticipated
          status = paid >= anticipated ? 'paid' : 'anticipated';
        } else {
          status = 'paid';
        }

        cells[key] = { amount, status, paid, overdue, anticipated };
      }
      return { collegeName: college.collegeName, cells };
    })
    .filter((c) => Object.keys(c.cells).length > 0)
    .sort((a, b) => a.collegeName.localeCompare(b.collegeName));

  const totals = {};
  for (const m of range.months) {
    totals[m.key] = colleges.reduce((sum, c) => sum + (Number(c.cells[m.key]?.amount) || 0), 0);
  }

  return {
    title: `Estimated ${range.titleYears}`,
    months: range.months,
    fromDate: range.fromDate,
    toDate: range.toDate,
    colleges,
    totals,
  };
}

/**
 * New Anticipated Receivables API — 24-month college grid.
 * Calls GET /api/receivables/anticipated-receivables (sp_GetAnticipatedReceivablesGrid).
 */
export async function fetchAnticipatedReceivablesMatrix(filters = {}) {
  const range = buildReceivablesMonthRange();
  const params = {
    ...filters,
    fromDate: filters.fromDate || range.fromDate,
    toDate: filters.toDate || range.toDate,
  };

  const { data } = await axiosClient.get('/api/receivables/anticipated-receivables', {
    params: buildParams(params),
  });

  if (data?.months && Array.isArray(data?.colleges)) {
    return {
      title: data.title || `Estimated ${range.titleYears}`,
      months: data.months,
      fromDate: data.fromDate || range.fromDate,
      toDate: data.toDate || range.toDate,
      colleges: data.colleges,
      totals: data.totals || {},
    };
  }

  return buildAnticipatedReceivablesMatrix(data, range);
}
