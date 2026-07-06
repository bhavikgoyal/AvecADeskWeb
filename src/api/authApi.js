import axiosClient, { setAuthToken } from './axiosClient';

// const ROLE_BY_ID = {
//   1: 'Admin',
//   2: 'Accounting',
//   3: 'Consultant',
//   4: 'Vendor',
// };


function mapApiUser(apiUser, fallbackEmail = '') {
  return {
    id: String(apiUser?.userId ?? apiUser?.UserId ?? 'api-user'),
    email: apiUser?.email ?? apiUser?.Email ?? fallbackEmail,
    role: apiUser?.userRoleName ?? apiUser?.UserRoleName ?? '',
    roleId: apiUser?.userRoleId ?? apiUser?.UserRoleId,
    name: apiUser?.userName ?? apiUser?.UserName ?? fallbackEmail,
    avatar: '',
  };


  // return {
  //   id: String(apiUser?.userId ?? apiUser?.UserId ?? 'api-user'),
  //   email: apiUser?.email ?? apiUser?.Email ?? fallbackEmail,
  //   role: ROLE_BY_ID[roleId] ?? 'Vendor',
  //   name: apiUser?.userName ?? apiUser?.UserName ?? fallbackEmail,
  //   avatar: '',
  // };
}

function applyAuthResponse(data, fallbackEmail = '') {
  const token = data?.token || data?.Token;
  if (!token) {
    throw new Error('Login succeeded but no token was returned.');
  }

  setAuthToken(token);

  const apiUser = data?.user || data?.User || data;
  return mapApiUser(apiUser, fallbackEmail);
}

export async function loginWithApi(email, password) {
  const { data } = await axiosClient.post('/api/auth/login', { email, password });
  return applyAuthResponse(data, email);
}

export async function sendOtp(phone) {
  const { data } = await axiosClient.post('/api/auth/send-otp', { phone });
  return data;
}

export async function verifyOtpWithApi(phone, otp) {
  const { data } = await axiosClient.post('/api/auth/verify-otp', { phone, otp });
  return applyAuthResponse(data, '');
}

export async function vendorLoginWithApi(vendorCode) {
  const { data } = await axiosClient.post('/api/auth/vendor-login', { vendorCode });
  return applyAuthResponse(data, '');
}

export async function registerStudent(registerData) {
  const { data } = await axiosClient.post(
    '/api/auth/register',
    registerData
  );

  return data;
}

export async function verifyEmail(email, verificationCode) {
  const { data } = await axiosClient.post(
    '/api/auth/verify-email',
    {
      email,
      verificationCode,
    }
  );

  return data;
}