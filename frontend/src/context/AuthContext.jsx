import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    localStorage.setItem('user', JSON.stringify(data));
    setUser(data);
  }, []);

  const can = useCallback((resource, action) => {
    if (!user) return false;
    if (user.role === 'superadmin') return true;
    const perms = user.permissions || {};
    return action ? !!(perms[resource] && perms[resource][action]) : !!perms[resource];
  }, [user]);

  const isSuperAdmin = user?.role === 'superadmin';

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser, can, isSuperAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
