import axiosClient from './axiosClient';

export function formatCurrency(amount) {
  const num = Number(amount) || 0;

  return num.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  });
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

export async function createPaymentSchedule({
  studentId,
  totalCourseFee,
  noOfInstallments,
  frequency,
  firstDueDate,
}) {
  if (!studentId) {
    throw new Error("Please select a student");
  }

  try {
    const { data } = await axiosClient.post(
      "/api/schedules/CreatePaymentSchedule",
      {
        studentId,
        totalCourseFee,
        noOfInstallments,
        frequency,
        firstDueDate,
      }
    );

    return data;
  } catch (err) {
    throw new Error(
      extractErrorMessage(err, "Failed to create payment schedule."),
      { cause: err }
    );
  }
}

export async function updatePaymentScheduleStatus(scheduleId, status, amountPaid) {
  try {
    const { data } = await axiosClient.post(`/api/schedules/${scheduleId}/status`, {
      status,
      amountPaid: status === 'Partial' ? amountPaid : null,
    });
    return normalizeSchedule(data);
  } catch (err) {
    throw new Error(extractErrorMessage(err, 'Failed to update schedule status.'), { cause: err });
  }
}

export async function createStudentPaymentInstallment(request) {
  try {
    const { data } = await axiosClient.post(
      "/api/schedules/CreateStudentPaymentInstallment",
      request
    );

    return data;
  } catch (err) {
    throw new Error(
      extractErrorMessage(err, "Failed to create student payment installment."),
      { cause: err }
    );
  }
}

export async function createStudentCommission(request) {
  try {
    const { data } = await axiosClient.post(
      "/api/schedules/CreateStudentCommission",
      request
    );

    return data;
  } catch (err) {
    throw new Error(
      extractErrorMessage(err, "Failed to create student commission."),
      { cause: err }
    );
  }
}

export async function createStudentCommissionDetail(request) {
  try {
    const { data } = await axiosClient.post(
      "/api/schedules/CreateStudentCommissionDetail",
      request
    );

    return data;
  } catch (err) {
    throw new Error(
      extractErrorMessage(err, "Failed to create student commission detail."),
      { cause: err }
    );
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


export async function fetchStudentPaymentScheduleList(studentId, isNextMonth = false) {
  try {
    const params = {};
    if (studentId) {
      params.studentId = studentId;
    }

    if (isNextMonth) {
      params.isNextMonth = true;
    }

    const { data } = await axiosClient.get(
      "/api/schedules/GetStudentPaymentScheduleList",
      { params }
    );

    return data.map((item) => ({
      studentCreatedAt: (item.studentCreatedAt ?? item.StudentCreatedAt ?? item.createdAt ?? item.CreatedAt ?? null) ? String(item.studentCreatedAt ?? item.StudentCreatedAt ?? item.createdAt ?? item.CreatedAt) : null,
      scheduleId: item.scheduleId ?? item.ScheduleId,
      studentId: item.studentId ?? item.StudentId,
      studentName: item.studentName ?? item.StudentName,
      instituteName: item.instituteName ?? item.InstituteName,
      courseName: item.courseName ?? item.CourseName,
      totalCourseFee: item.totalCourseFee ?? item.TotalCourseFee,
      noOfInstallments: item.noOfInstallments ?? item.NoOfInstallments,
      frequency: item.frequency ?? item.Frequency,
      firstDueDate: item.firstDueDate ?? item.FirstDueDate,
      totalInstallments: item.totalInstallments ?? item.TotalInstallments,
      paidInstallments: item.paidInstallments ?? item.PaidInstallments,
      pendingInstallments: item.pendingInstallments ?? item.PendingInstallments,
      collectedAmount: item.collectedAmount ?? item.CollectedAmount,
      balanceAmount: item.balanceAmount ?? item.BalanceAmount,
      installmentAmount: item.installmentAmount ?? item.InstallmentAmount,
      nextDueDate: item.nextDueDate ?? item.NextDueDate,
      paymentStatus: item.paymentStatus ?? item.PaymentStatus,
    }));
  } catch (err) {
    throw new Error(
      extractErrorMessage(err, "Failed to fetch payment schedule list."),
      { cause: err }
    );
  }
}

export async function updateStudentPaymentSchedule(request) {
  try {
    const { data } = await axiosClient.post(
      "/api/schedules/UpdateStudentPaymentSchedule",
      request
    );

    return {
      scheduleId: data.scheduleId ?? data.ScheduleId,
      commissionId: data.commissionId ?? data.CommissionId,
    };
  } catch (err) {
    throw new Error(
      extractErrorMessage(err, "Failed to update payment schedule."),
      { cause: err }
    );
  }
}

export async function fetchStudentCourseCompleteList(studentId) {
  try {
    const params = {};
    if (studentId) params.studentId = studentId;

    const { data } = await axiosClient.get(
      '/api/schedules/GetStudentCourseCompleteList',
      { params }
    );

    return (data || []).map((item) => ({
      scheduleId: item.scheduleId ?? item.ScheduleId,
      studentId: item.studentId ?? item.StudentId,
      studentName: item.studentName ?? item.StudentName,
      studentCreatedAt: (item.studentCreatedAt ?? item.StudentCreatedAt ?? item.createdAt ?? item.CreatedAt) ? String(item.studentCreatedAt ?? item.StudentCreatedAt ?? item.createdAt ?? item.CreatedAt) : null,
      courseStartDate: item.courseStartDate ?? item.CourseStartDate,
      courseEndDate: item.courseEndDate ?? item.CourseEndDate,
      instituteName: item.instituteName ?? item.InstituteName,
      courseName: item.courseName ?? item.CourseName,
      totalCourseFee: item.totalCourseFee ?? item.TotalCourseFee ?? 0,
      noOfInstallments: item.noOfInstallments ?? item.NoOfInstallments ?? 0,
      frequency: item.frequency ?? item.Frequency,
      firstDueDate: item.firstDueDate ?? item.FirstDueDate,
      totalInstallments: item.totalInstallments ?? item.TotalInstallments ?? 0,
      paidInstallments: item.paidInstallments ?? item.PaidInstallments ?? 0,
      pendingInstallments: item.pendingInstallments ?? item.PendingInstallments ?? 0,
      collectedAmount: item.collectedAmount ?? item.CollectedAmount ?? 0,
      balanceAmount: item.balanceAmount ?? item.BalanceAmount ?? 0,
      installmentAmount: item.installmentAmount ?? item.InstallmentAmount ?? 0,
      nextDueDate: item.nextDueDate ?? item.NextDueDate,
      paymentStatus: item.paymentStatus ?? item.PaymentStatus,
    }));
  } catch (err) {
    throw new Error(
      extractErrorMessage(err, 'Failed to fetch course complete list.'),
      { cause: err }
    );
  }
}