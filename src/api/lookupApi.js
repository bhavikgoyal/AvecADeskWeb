import axiosClient from './axiosClient';

function normalizeCourse(course) {
  return {
    courseId: course.courseId ?? course.CourseId,
    instituteId: course.instituteId ?? course.InstituteId,
    courseName: course.courseName ?? course.CourseName ?? '',
    CourseCategory: course.CourseCategory ?? course.courseCategory ?? '',
    description: course.description ?? course.Description ?? '',
    fees: course.fees ?? course.Fees ?? null,
    duration: course.duration ?? course.Duration ?? '',
    eligibility: course.eligibility ?? course.Eligibility ?? '',
    isAIFetched: course.isAIFetched ?? course.IsAIFetched ?? false,
    isApproved: course.isApproved ?? course.IsApproved ?? false,
    isActive: course.isActive ?? course.IsActive ?? false,
    createdAt: course.createdAt ?? course.CreatedAt,
    rateType: course.rateType ?? course.RateType ?? '',
    commissionRate: course.commissionRate ?? course.CommissionRate ?? 0,
    campus: course.campus ?? course.Campus ?? '',
    level: course.level ?? course.Level ?? '',
    programLink: course.programLink ?? course.ProgramLink ?? '',
    cricosCode: course.cricosCode ?? course.CricosCode ?? '',
    intake: course.intake ?? course.Intake ?? '',
    englishReq: course.englishReq ?? course.EnglishReq ?? '',
    scholarshipsDetails: course.scholarshipsDetails ?? course.ScholarshipsDetails ?? '',
    programDescription: course.programDescription ?? course.ProgramDescription ?? '',
    addmissionRequirements: course.addmissionRequirements ?? course.AddmissionRequirements ?? '',
    programLogo: course.programLogo ?? course.ProgramLogo ?? '',
    instituteName: course.instituteName ?? course.InstituteName ?? '',
  };
}

/** Public search endpoint — no JWT required. */
export async function fetchInstitutes() {
  const { data } = await axiosClient.get('/api/institutes');
  return data;
}

export async function fetchCoursesByInstitute(instituteId) {
  if (!instituteId) return [];

  //  const { data } = await axiosClient.get('/api/courses/scrapping', {
  //   params: { instituteId },
  // });

  //const { data } = await axiosClient.get('/api/courses', { params: { instituteId } });
  const { data } = await axiosClient.get('/api/courses', { params: { scrappingId: instituteId } });

  const rawCourses = Array.isArray(data)
    ? data
    : (data?.courses ?? data?.Courses ?? []);

  return {
    ...data,
    courses: rawCourses.map((course) => ({
      ...normalizeCourse(course),
      id: String(course.courseId ?? course.CourseId ?? ''),
    })),
  };
}

export async function fetchVendors() {
  const { data } = await axiosClient.get('/api/vendors');
  return data;
}

export async function fetchStudentsLookup() {
  const { data } = await axiosClient.get('/api/students');
  return data.map((s) => ({
    studentId: s.studentId ?? s.StudentId,
    fullName: s.fullName ?? s.FullName ?? '',
  }));
}

export async function fetchInstitutesForReceivables() {
  const { data } = await axiosClient.get('/api/institutes-scrapping/institutenames');
  return data.map((i) => ({
    instituteId: i.scrappingId ?? i.ScrappingId,
    instituteName: i.instituteName ?? i.InstituteName,
  }));
}

export async function fetchInstitutesFromScraping() {
  const { data } = await axiosClient.get('/api/institutes-scrapping/institutenames');
  return data.map((i) => ({
    instituteId: i.scrappingId ?? i.ScrappingId,
    instituteName: i.instituteName ?? i.InstituteName,
  }));
}