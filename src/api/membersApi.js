import axiosClient from './axiosClient';

export const getMembers = async () => {
  const { data } = await axiosClient.get('/api/Members/Users_List');
  return data;
};

export const deleteMember = async (userId) => {
  try {
    const { data } = await axiosClient.post(`/api/Members/delete/${userId}`);
    return { success: true, data };
  } catch (err) {
    return { success: false, message: err.message || 'Delete failed' };
  }
};

export const resignMember = async (userId) => {
  try {
    const { data } = await axiosClient.patch(`/api/Members/Resign/${userId}`);
    return { success: true, data };
  } catch (err) {
    return { success: false, message: err.message || 'Failed to mark member as resigned' };
  }
};

export const createMember = async (memberData) => {
  const { data } = await axiosClient.post('/api/Members/create', memberData);
  return data;
};

export const updateMember = async (memberData) => {
  const { data } = await axiosClient.post('/api/Members/update', memberData);
  return data;
};

export const getRoles = async () => {
  const { data } = await axiosClient.get('/api/UserRole/roles');
  return data;
};

export const getCompanies = async () => {
  const { data } = await axiosClient.get('/api/UserRole/companies');
  return data;
};