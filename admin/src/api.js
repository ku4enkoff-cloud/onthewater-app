import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // FormData: не задавать Content-Type — браузер подставит multipart/form-data с boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
    delete config.headers['content-type'];
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/panel/';
    }
    return Promise.reject(err);
  }
);

export default api;

export function getToken() {
  return localStorage.getItem('admin_token');
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('admin_user') || 'null');
  } catch {
    return null;
  }
}

export function setAuth(token, user) {
  localStorage.setItem('admin_token', token);
  localStorage.setItem('admin_user', JSON.stringify(user));
}

export function logout() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
}
