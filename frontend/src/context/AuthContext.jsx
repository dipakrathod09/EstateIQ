import React, { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('estateiq_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('estateiq_access_token');
    if (token) {
      client.get('/auth/me/')
        .then((res) => {
          setUser(res.data);
          localStorage.setItem('estateiq_user', JSON.stringify(res.data));
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const res = await client.post('/auth/login/', { username, password });
    const { access, refresh, user: userData } = res.data;
    localStorage.setItem('estateiq_access_token', access);
    localStorage.setItem('estateiq_refresh_token', refresh);
    localStorage.setItem('estateiq_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const register = async (formData) => {
    const res = await client.post('/auth/register/', formData);
    const { access, refresh, user: userData } = res.data;
    localStorage.setItem('estateiq_access_token', access);
    localStorage.setItem('estateiq_refresh_token', refresh);
    localStorage.setItem('estateiq_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('estateiq_access_token');
    localStorage.removeItem('estateiq_refresh_token');
    localStorage.removeItem('estateiq_user');
    setUser(null);
  };

  const updatePreferences = async (prefData) => {
    await client.patch('/auth/preferences/', prefData);
    const meRes = await client.get('/auth/me/');
    setUser(meRes.data);
    localStorage.setItem('estateiq_user', JSON.stringify(meRes.data));
    return meRes.data;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updatePreferences }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
