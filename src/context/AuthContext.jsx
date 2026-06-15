import { useEffect, useMemo, useState } from 'react';
import { clearAuthSession, getAuthToken } from '../api/axiosClient';
import { STORAGE_KEY } from '../constants/auth';
import { AuthContext } from './auth-context';

function readStoredUser() {
  try {
    const savedUser = localStorage.getItem(STORAGE_KEY);
    const token = getAuthToken();
    if (savedUser && !token) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return savedUser ? JSON.parse(savedUser) : null;
  } catch (error) {
    console.error('Failed to parse saved user:', error);
    clearAuthSession();
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

  useEffect(() => {
    if (user && !getAuthToken()) {
      setUser(null);
      clearAuthSession();
    }
  }, [user]);

  const login = (userData) => {
    const safeUser = { ...userData };
    delete safeUser.password;
    setUser(safeUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeUser));
  };

  const logout = () => {
    setUser(null);
    clearAuthSession();
  };

  const value = useMemo(() => ({ user, login, logout }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
