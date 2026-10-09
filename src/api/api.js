export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? '' : 'http://localhost:7099');
export const TOKEN_STORAGE_KEY = 'auth_token';
