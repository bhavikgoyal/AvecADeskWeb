import axiosClient from './axiosClient';

export async function fetchDesignations() {
  const { data } = await axiosClient.get('/api/designations');
  return (data ?? []).map((raw) => ({
    id: raw.designationId ?? raw.DesignationId,
    name: raw.designationName ?? raw.DesignationName ?? '',
  }));
}
