import axios from 'axios';
import { API_BASE_URL } from '../config/apiConfig';
const TOKEN_STORAGE_KEY = 'authToken';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
   'Content-Type': 'application/json'
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;