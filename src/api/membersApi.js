import axiosClient from './axiosClient';

export const getMembers = async () => {
  const { data } = await axiosClient.get('/api/Members/Users_List');
  return data;
};

// Users_List carries every user's base64 avatar (several MB), so screens that only need it for
// lookups (card detail) share one recent response instead of downloading it on every open.
const MEMBERS_CACHE_TTL_MS = 2 * 60 * 1000;
let membersCache = { data: null, fetchedAt: 0, pending: null };

export const clearMembersCache = () => {
  membersCache = { data: null, fetchedAt: 0, pending: null };
};

export const getMembersCached = () => {
  if (membersCache.data && Date.now() - membersCache.fetchedAt < MEMBERS_CACHE_TTL_MS) {
    return Promise.resolve(membersCache.data);
  }
  if (!membersCache.pending) {
    membersCache.pending = getMembers()
      .then((data) => {
        membersCache = { data, fetchedAt: Date.now(), pending: null };
        return data;
      })
      .catch((err) => {
        membersCache.pending = null;
        throw err;
      });
  }
  return membersCache.pending;
};

export const deleteMember = async (userId) => {
  clearMembersCache();
  try {
    const { data } = await axiosClient.post(`/api/Members/delete/${userId}`);
    return { success: true, data };
  } catch (err) {
    return { success: false, message: err.message || 'Delete failed' };
  }
};

export const resignMember = async (userId) => {
  clearMembersCache();
  try {
    const { data } = await axiosClient.post(`/api/Members/Resign/${userId}`);
    return { success: true, data };
  } catch (err) {
    return { success: false, message: err.message || 'Failed to mark member as resigned' };
  }
};

export const createMember = async (memberData) => {
  clearMembersCache();
  const { data } = await axiosClient.post('/api/Members/create', memberData);
  return data;
};

export const updateMember = async (memberData) => {
  clearMembersCache();
  const { data } = await axiosClient.post('/api/Members/update', memberData);
  return data;
};

export const getAllBoards = async () => {
  const { data } = await axiosClient.get('/api/Board/all');
  return Array.isArray(data) ? data : [];
};

export const getMemberBoardAccess = async (userId) => {
  const { data } = await axiosClient.get(`/api/Members/${userId}/board-access`);
  return Array.isArray(data) ? data : [];
};

export const getRoles = async () => {
  const { data } = await axiosClient.get('/api/UserRole/roles');
  return data;
};

export const getCompanies = async () => {
  const { data } = await axiosClient.get('/api/UserRole/companies');
  return data;
};