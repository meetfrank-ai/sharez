import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sharez_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Only treat 401 as "session expired" if the caller actually had a token
    // and the failing request wasn't the auth attempt itself. Otherwise we
    // silently bounce login/register/google-signin attempts back to /login
    // with no visible error and no way to debug.
    const hadToken = !!localStorage.getItem('sharez_token');
    const url = err.config?.url || '';
    const isAuthAttempt = /\/auth\/(login|register|google|forgot-password|reset-password)/.test(url);

    if (err.response?.status === 401 && hadToken && !isAuthAttempt) {
      localStorage.removeItem('sharez_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
