import { useState, useEffect, createContext, useContext } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sharez_token');
    if (token) {
      api.get('/auth/me')
        .then((res) => setUser(res.data))
        .catch(() => localStorage.removeItem('sharez_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('sharez_token', res.data.access_token);
    const me = await api.get('/auth/me');
    setUser(me.data);
  };

  const register = async (email, password, displayName) => {
    const res = await api.post('/auth/register', {
      email,
      password,
      display_name: displayName,
    });
    localStorage.setItem('sharez_token', res.data.access_token);
    const me = await api.get('/auth/me');
    setUser(me.data);
  };

  const logout = () => {
    localStorage.removeItem('sharez_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
