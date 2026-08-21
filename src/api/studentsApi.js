import axiosClient from './axiosClient';
import { fetchInstitutes } from './lookupApi';
import { formatDateDisplay } from '../utils/dateFormat';

function normalizeStudent(student) {
  return {
    studentId: student.studentId ?? student.StudentId,
    instituteId: student.instituteId ?? student.InstituteId,
    courseId: student.courseId ?? student.CourseId,
    fullName: student.fullName ?? student.FullName ?? '',
    email: student.email ?? student.Email ?? '',
    phone: student.phone ?? student.Phone ?? '',
    enrollmentNumber: student.enrollmentNumber ?? student.EnrollmentNumber ?? '',
    enrolmentStatus: student.enrolmentStatus ?? student.EnrolmentStatus ?? '',
    assignment: student.assignment ?? student.Assignment ?? null,
    isActive: student.isActive ?? student.IsActive ?? true,
    createdAt: student.createdAt ?? student.CreatedAt,
  };
}

function formatDisplayDate(value) {
  return formatDateDisplay(value);
}

function mapStudentRow(student, schedule) {
  return {
    id: String(student.studentId),
    studentId: student.studentId,
    fullName: student.fullName,
    enrolmentStatus: student.enrolmentStatus,
    assignment: student.assignment ?? '',
    paymentStatus: schedule?.status || 'Pending',
    instituteNameRef: '',
    courseName: '',
    amountDue: schedule?.amountDue != null ? String(schedule.amountDue) : '',
    amountPaid: schedule?.amountPaid != null ? String(schedule.amountPaid) : '',
    email: student.email,
    phone: student.phone,
    enrollmentNumber: student.enrollmentNumber || '',
    updated: formatDisplayDate(student.createdAt),
    name: student.fullName,
  };
}

export async function fetchStudentRows() {
  const [{ data: students }, { data: schedules }] = await Promise.all([
    axiosClient.get('/api/students'),
    axiosClient.get('/api/schedules'),
  ]);

  const scheduleByStudent = new Map();
  for (const schedule of schedules) {
    const existing = scheduleByStudent.get(schedule.studentId);
    if (!existing || new Date(schedule.dueDate) > new Date(existing.dueDate)) {
      scheduleByStudent.set(schedule.studentId, schedule);
    }
  }

  return students.map((student) => mapStudentRow(student, scheduleByStudent.get(student.studentId)));
}

function normalizeSchedule(schedule) {
  if (!schedule) return null;
  return {
    scheduleId: schedule.scheduleId ?? schedule.ScheduleId,
    studentId: schedule.studentId ?? schedule.StudentId,
   dueDate: schedule.dueDate ?? schedule.DueDate ?? schedule.firstDueDate ?? schedule.FirstDueDate,
    amountDue: schedule.amountDue ?? schedule.AmountDue,
    status: schedule.status ?? schedule.Status ?? 'Pending',
    amountPaid: schedule.amountPaid ?? schedule.AmountPaid,
    notes: schedule.notes ?? schedule.Notes ?? '',
  };
}

function toDateInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function buildStudentForm(student, schedule) {
  const normalizedSchedule = normalizeSchedule(schedule);
  const amountDue = normalizedSchedule?.amountDue ?? '';
  const amountPaid = normalizedSchedule?.amountPaid ?? '';

  return {
    studentId: String(student.studentId),
    scheduleId: normalizedSchedule?.scheduleId ? String(normalizedSchedule.scheduleId) : '',
    fullName: student.fullName,
    enrollmentNumber: student.enrollmentNumber || '',
    enrolmentStatus: student.enrolmentStatus,
    email: student.email,
    phone: student.phone,
    instituteId: student.instituteId ? String(student.instituteId) : '',
    courseId: student.courseId ? String(student.courseId) : '',
    assignment: student.assignment ?? student.Assignment ?? '',
    amountDue: amountDue !== '' ? String(amountDue) : '',
    amountPaid: amountPaid !== '' && amountPaid != null ? String(amountPaid) : '',
    paymentStatus: normalizedSchedule?.status
      || derivePaymentStatus(amountDue, amountPaid),
    dueDate: toDateInputValue(normalizedSchedule?.dueDate),
    notes: normalizedSchedule?.notes || '',
  };
}

async function applyPaymentStatus(scheduleId, amountDue, amountPaidInput) {
  const { status, amountPaid } = resolvePaymentFields(amountDue, amountPaidInput);

  await axiosClient.post(`/api/schedules/${scheduleId}/status`, {
    status,
    amountPaid: status === 'Pending' ? null : (amountPaid ?? 0),
  });

  return status;
}

export function derivePaymentStatus(amountDue, amountPaidInput) {
  const due = Number(amountDue) || 0;
  const paid = Number(amountPaidInput) || 0;

  if (due === 0) return 'Paid';
  if (paid <= 0) return 'Pending';
  return 'Partial';
}

function resolvePaymentFields(amountDue, amountPaidInput) {
  const due = Number(amountDue) || 0;
  const hasPaidInput = amountPaidInput !== '' && amountPaidInput != null && !Number.isNaN(Number(amountPaidInput));
  const paid = hasPaidInput ? Number(amountPaidInput) : 0;
  const status = derivePaymentStatus(due, paid);

  if (status === 'Pending') {
    return { status: 'Pending', amountPaid: null };
  }

  if (status === 'Partial') {
    return { status: 'Partial', amountPaid: paid };
  }

  return {
    status: 'Paid',
    amountPaid: hasPaidInput ? paid : due,
  };
}

export async function createStudentWithPaymentSchedule(form) {
  const instituteId = Number(form.instituteId);
  const courseId = Number(form.courseId);

  if (!instituteId) {
    throw new Error('Please select an institute');
  }

  if (!courseId) {
    throw new Error('Please select a course');
  }

  if (!form.fullName?.trim()) {
    throw new Error('Full name is required');
  }

  if (!form.phone?.trim()) {
    throw new Error('Phone is required');
  }

  const { data: student } = await axiosClient.post('/api/students', {
    instituteId,
    courseId,
    fullName: form.fullName.trim(),
    email: form.email?.trim() || '',
    phone: form.phone.trim(),
    enrollmentNumber: form.enrollmentNumber?.trim() || null,
    enrolmentStatus: form.enrolmentStatus || 'Interested',
    folderNo: form.FolderNo || null,
    courseStartDate: form.courseStartDate || null,
    courseEndDate: form.courseEndDate || null,
    assignment: form.assignment ?? form.Assignment ?? null,
  });
  return normalizeStudent(student);
}

export async function deleteStudent(studentId) {
  await axiosClient.post(`/api/students/${studentId}`);
}

export async function fetchStudentById(studentId) {
  const { data } = await axiosClient.get(`/api/students/${studentId}`);
  return normalizeStudent(data);
}

export async function fetchStudentWithSchedule(studentId) {
  const [student, { data: schedules }] = await Promise.all([
    fetchStudentById(studentId),
    axiosClient.get('/api/schedules', { params: { studentId } }),
  ]);

  const schedule = schedules.length > 0
    ? schedules.reduce((latest, item) => (
      new Date(item.dueDate) > new Date(latest.dueDate) ? item : latest
    ))
    : null;

  return {
    student,
    schedule: normalizeSchedule(schedule),
    form: buildStudentForm(student, schedule),
  };
}

export async function updateStudentWithPaymentSchedule(studentId, form) {
  if (!form.fullName?.trim()) {
    throw new Error('Full name is required');
  }

  if (!form.phone?.trim()) {
    throw new Error('Phone is required');
  }

  const instituteId = Number(form.instituteId);
  const courseId = Number(form.courseId);

  if (!instituteId) {
    throw new Error('Please select an institute');
  }

  if (!courseId) {
    throw new Error('Please select a course');
  }

  const amountDue = Number(form.amountDue);
  if (Number.isNaN(amountDue) || amountDue < 0) {
    throw new Error('Amount due must be zero or greater');
  }

  if (!form.dueDate) {
    throw new Error('Due date is required');
  }

  // if (!form.scheduleId) {
  //   throw new Error('No payment schedule found for this student.');
  // }

  const existing = await fetchStudentById(studentId);

  await axiosClient.post(`/api/students/${studentId}/enrolment-status`, {
    enrolmentStatus: form.enrolmentStatus || existing.enrolmentStatus,
  });

  const { data: student } = await axiosClient.post(`/api/students/${studentId}`, {
    instituteId,
    courseId,
    fullName: form.fullName.trim(),
    email: form.email?.trim() || '',
    phone: form.phone.trim(),
    enrollmentNumber: form.enrollmentNumber?.trim() || null,
    isActive: existing.isActive,
    assignment: form.assignment ?? form.Assignment ?? existing.assignment ?? existing.Assignment ?? null,
  });

  const { data: schedule } = await axiosClient.post(`/api/schedules/${form.scheduleId}`, {
    studentId: Number(studentId),
    dueDate: form.dueDate,
    amountDue,
    notes: form.notes?.trim() || null,
  });

  const paymentStatus = await applyPaymentStatus(form.scheduleId, amountDue, form.amountPaid);

  return mapStudentRow(student, {
    ...schedule,
    status: paymentStatus,
  });
}

export async function fetchEnrolmentRows() {
  const [{ data: students }, institutes] = await Promise.all([
    axiosClient.get('/api/students'),
    fetchInstitutes(),
  ]);

  const instituteMap = new Map(
    institutes.map((item) => [item.instituteId, item.instituteName]),
  );

  return students.map((raw) => {
    const student = normalizeStudent(raw);
    return {
      id: String(student.studentId),
      studentId: student.studentId,
      fullName: student.fullName,
      enrolmentStatus: student.enrolmentStatus,
      instituteNameRef: instituteMap.get(student.instituteId) || '',
      email: student.email,
      phone: student.phone,
      enrollmentNumber: student.enrollmentNumber,
      instituteId: student.instituteId,
      courseId: student.courseId,
      name: student.fullName,
    };
  });
}

export async function fetchAllStudents() {
  const { data } = await axiosClient.get('/api/students/all');
  return data;
}

export async function updateStudentEnrolment(studentId, form) {
  if (!studentId) {
    throw new Error('Please select a student');
  }

  if (!form.fullName?.trim()) {
    throw new Error('Full name is required');
  }

  if (!form.phone?.trim()) {
    throw new Error('Phone is required');
  }

  const existing = await fetchStudentById(studentId);

  await axiosClient.post(`/api/students/${studentId}/enrolment-status`, {
    enrolmentStatus: form.enrolmentStatus || existing.enrolmentStatus,
  });

  const { data: updated } = await axiosClient.post(`/api/students/${studentId}`, {
    instituteId: existing.instituteId,
    courseId: existing.courseId,
    fullName: form.fullName.trim(),
    email: form.email?.trim() || '',
    phone: form.phone.trim(),
    enrollmentNumber: existing.enrollmentNumber || null,
    isActive: existing.isActive,
  });

  return normalizeStudent(updated);
}
export async function fetchStudentPaymentDetail(studentId) {
  const { data } = await axiosClient.get(
    `/api/students/GetStudentPaymentDetail/${studentId}`
  );

  return {
    studentId: data.studentId ?? data.StudentId,

    instituteId: data.instituteId ?? data.InstituteId,
    instituteName: data.instituteName ?? data.InstituteName,

    courseId: data.courseId ?? data.CourseId,
    courseName: data.courseName ?? data.CourseName,
    campus: data.campus ?? data.Campus,

    fullName: data.fullName ?? data.FullName,
    email: data.email ?? data.Email,
    phone: data.phone ?? data.Phone,
    folderNo: data.folderNo ?? data.FolderNo,
    assignment: data.assignment ?? data.Assignment ?? null,

    courseStartDate: data.courseStartDate ?? data.CourseStartDate,
    courseEndDate: data.courseEndDate ?? data.CourseEndDate,
    commissionAmount: data.commissionAmount ?? data.CommissionAmount,
    gstAmount: data.gstAmount ?? data.GSTAmount,
    bonusAmount: data.bonusAmount ?? data.BonusAmount,
    dueDate: data.dueDate ?? data.DueDate,
    remark: data.remark ?? data.Remark,

    scheduleId: data.scheduleId ?? data.ScheduleId,
    firstDueDate: data.firstDueDate ?? data.FirstDueDate,
    totalCourseFee: data.totalCourseFee ?? data.TotalCourseFee,
    noOfInstallments: data.noOfInstallments ?? data.NoOfInstallments,
    frequency: data.frequency ?? data.Frequency,

    commissionId: data.commissionId ?? data.CommissionId,
    commissionPercentage: data.commissionPercentage ?? data.CommissionPercentage,
    gstPercentage: data.gstPercentage ?? data.GSTPercentage,
    bonusType: data.bonusType ?? data.BonusType,
    bonusOption: data.bonusOption ?? data.BonusOption,

  studentPaymentList: (data.studentPaymentList ?? data.StudentPaymentList ?? []).map(item => ({ ...item, status: item.paymentStatus ?? item.PaymentStatus ?? "Pending", originalStatus: item.paymentStatus ?? item.PaymentStatus ?? null })),

      commissionHistory: (data.commissionHistory ?? data.CommissionHistory ?? []).map(item => 
      ({ ...item, commissionHistoryOriginalStatus: item.commissionStatus ?? item.CommissionStatus ?? null })),
  
  };
}