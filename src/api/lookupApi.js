import axiosClient from './axiosClient';

/** Public search endpoint — no JWT required. */
export async function fetchInstitutes() {
  const { data } = await axiosClient.get('/api/institutes');
  return data;
}

export async function fetchCoursesByInstitute(instituteId) {
  if (!instituteId) return [];
  const { data } = await axiosClient.get('/api/courses', { params: { instituteId } });
  return data;
}
