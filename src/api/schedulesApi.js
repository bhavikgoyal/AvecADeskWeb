 import axiosClient from './axiosClient';

export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  if (num >= 1_000_000) {
    return `$${(num / 1_000_000).toFixed(num % 1_000_000 === 0 ? 0 : 1)}M`;
  }
  if (num >= 1_000) {
    return `$${(num / 1_000).toFixed(num % 1_000 === 0 ? 0 : 1)}k`;
  }
  return `$${num.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export function formatDisplayDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function toDateInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function extractErrorMessage(err, fallback) {
  const body = err?.response?.data;
  if (typeof body === 'string' && body.trim()) return body;
  if (body?.message) return body.message;
  if (body?.title) return body.title;
  return err?.message || fallback;
}

export async function fetchPaymentSummary() {
  const { data } = await axiosClient.get('/api/schedules/summary');
  return {
    activeStudents: data.activeStudents ?? data.ActiveStudents ?? 0,
    collectedTotal: data.collectedTotal ?? data.CollectedTotal ?? 0,
    outstandingTotal: data.outstandingTotal ?? data.OutstandingTotal ?? 0,
    overdueTotal: data.overdueTotal ?? data.OverdueTotal ?? 0,
    overdueCount: data.overdueCount ?? data.OverdueCount ?? 0,
  };
}

function normalizeSchedule(schedule) {
  return {
    scheduleId: schedule.scheduleId ?? schedule.ScheduleId,
    studentId: schedule.studentId ?? schedule.StudentId,
    dueDate: schedule.dueDate ?? schedule.DueDate,
    amountDue: schedule.amountDue ?? schedule.AmountDue,
    status: schedule.status ?? schedule.Status ?? 'Pending',
    amountPaid: schedule.amountPaid ?? schedule.AmountPaid ?? 0,
    paidAt: schedule.paidAt ?? schedule.PaidAt ?? null,
    notes: schedule.notes ?? schedule.Notes ?? '',
  };
}

export async function fetchScheduleRows(studentId) {
  const params = studentId ? { studentId } : undefined;
  const [{ data: schedules }, { data: students }] = await Promise.all([
    axiosClient.get('/api/schedules', { params }),
    axiosClient.get('/api/students'),
  ]);

  const studentMap = new Map(
    students.map((s) => [s.studentId ?? s.StudentId, s]),
  );

  return schedules.map((raw) => {
    const schedule = normalizeSchedule(raw);
    const student = studentMap.get(schedule.studentId);
    return {
      id: String(schedule.scheduleId),
      ...schedule,
      studentName: student?.fullName ?? student?.FullName ?? `Student #${schedule.studentId}`,
      instituteId: student?.instituteId ?? student?.InstituteId ?? null,
    };
  });
}

export async function createPaymentSchedule({ studentId, dueDate, amountDue, notes, fees, commission }) {
  if (!studentId) throw new Error('Please select a student');
  if (!dueDate) throw new Error('Due date is required');
  const due = Number(amountDue);
  if (Number.isNaN(due) || due < 0) throw new Error('Amount due must be zero or greater');

  try {
    const { data } = await axiosClient.post('/api/schedules', {
      studentId,
      dueDate,
      amountDue,
      notes: notes?.trim() || null,
      fees,
      commission,
    });
    return normalizeSchedule(data);
  } catch (err) {
    throw new Error(extractErrorMessage(err, 'Failed to create payment schedule.'), { cause: err });
  }
}

export async function updatePaymentScheduleStatus(scheduleId, status, amountPaid) {
  try {
    const { data } = await axiosClient.put(`/api/schedules/${scheduleId}/status`, {
      status,
      amountPaid: status === 'Partial' ? amountPaid : null,
    });
    return normalizeSchedule(data);
  } catch (err) {
    throw new Error(extractErrorMessage(err, 'Failed to update schedule status.'), { cause: err });
  }
}


export async function bulkUpdatePaymentScheduleStatus(items) {
  if (!items?.length) throw new Error('Select at least one schedule to update');

  try {
    const { data } = await axiosClient.post('/api/schedules/bulk-status', {
      items: items.map((item) => ({
        scheduleId: item.scheduleId,
        status: item.status,
        amountPaid: item.status === 'Partial' ? item.amountPaid : null,
      })),
    });
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err, 'Failed to update the selected schedules.'), { cause: err });
  }
}
