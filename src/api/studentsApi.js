import axiosClient from './axiosClient';

function formatDisplayDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function mapStudentRow(student, schedule) {
  return {
    id: String(student.studentId),
    studentId: student.studentId,
    fullName: student.fullName,
    enrolmentStatus: student.enrolmentStatus,
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

  const amountDue = Number(form.amountDue);
  if (!amountDue || amountDue <= 0) {
    throw new Error('Amount due must be greater than zero');
  }

  if (!form.dueDate) {
    throw new Error('Due date is required');
  }

  const { data: student } = await axiosClient.post('/api/students', {
    instituteId,
    courseId,
    fullName: form.fullName.trim(),
    email: form.email?.trim() || '',
    phone: form.phone.trim(),
    enrollmentNumber: form.enrollmentNumber?.trim() || null,
    enrolmentStatus: form.enrolmentStatus || 'Interested',
  });

  const { data: schedule } = await axiosClient.post('/api/schedules', {
    studentId: student.studentId,
    dueDate: form.dueDate,
    amountDue,
    notes: form.notes?.trim() || null,
  });

  const amountPaid = Number(form.amountPaid || 0);
  const paymentStatus = form.paymentStatus || 'Pending';

  if (paymentStatus !== 'Pending' || amountPaid > 0) {
    await axiosClient.put(`/api/schedules/${schedule.scheduleId}/status`, {
      status: paymentStatus,
      amountPaid: amountPaid > 0 ? amountPaid : null,
    });
  }

  return mapStudentRow(student, {
    ...schedule,
    status: paymentStatus,
    amountPaid: amountPaid > 0 ? amountPaid : schedule.amountPaid,
  });
}
