import { createContext, useContext, useState, useEffect } from 'react';
import { api, setToken } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = sessionStorage.getItem('ams_token');
    if (!saved) { setLoading(false); return; }

    setToken(saved);
    api.get('/auth/me')
      .then((d) => { if (d.success) setUser(d.user); })
      .catch(() => { setToken(null); sessionStorage.removeItem('ams_token'); })
      .finally(() => setLoading(false));
  }, []);

  const login = (userData, token) => {
    setToken(token);
    sessionStorage.setItem('ams_token', token);
    setUser(userData);
  };

  const logout = () => {
    setToken(null);
    sessionStorage.removeItem('ams_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
