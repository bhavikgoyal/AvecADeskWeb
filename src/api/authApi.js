import axiosClient, { setAuthToken } from './axiosClient';

const ROLE_BY_ID = {
  1: 'Admin',
  2: 'Accounting',
  3: 'Consultant',
  4: 'Vendor',
};

export async function loginWithApi(email, password) {
  const { data } = await axiosClient.post('/api/auth/login', { email, password });

  const token = data?.token || data?.Token;
  if (!token) {
    throw new Error('Login succeeded but no token was returned.');
  }

  setAuthToken(token);

  const apiUser = data?.user || data?.User;
  const roleId = apiUser?.userRoleId ?? apiUser?.UserRoleId;

  return {
    id: String(apiUser?.userId ?? apiUser?.UserId ?? 'api-user'),
    email: apiUser?.email ?? apiUser?.Email ?? email,
    role: ROLE_BY_ID[roleId] ?? 'Admin',
    name: apiUser?.userName ?? apiUser?.UserName ?? email,
    avatar: '',
  };
}
