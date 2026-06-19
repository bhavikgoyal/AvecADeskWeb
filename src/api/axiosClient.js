import axios from 'axios';
import { API_BASE_URL, TOKEN_STORAGE_KEY } from './api';
import { STORAGE_KEY } from '../constants/auth';

export function getAuthToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export function clearAuthSession() {
  setAuthToken(null);
  localStorage.removeItem(STORAGE_KEY);
}

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

axiosClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthSession();
      const onLoginPage = window.location.pathname === '/login';
      if (!onLoginPage) {
        window.location.assign('/login?session=expired');
      }
    }

    const message =
      extractApiErrorMessage(error.response?.data) ||
      error.message ||
      'Request failed';
    return Promise.reject(new Error(message));
  },
);

function extractApiErrorMessage(data) {
  if (!data) return null;
  if (typeof data === 'string') return data;
  if (data.message) return data.message;
  if (data.title && data.errors) {
    const details = Object.values(data.errors).flat().join(' ');
    return details ? `${data.title} ${details}` : data.title;
  }
  if (data.title) return data.title;
  return null;
}

export default axiosClient;
