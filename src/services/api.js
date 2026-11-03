import axios from 'axios';

// Alamat API diatur lewat .env (VITE_API_URL). Nilai bawaan mengikuti struktur folder XAMPP saat ini.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost/prediksi-lstm/prediksi-lstm/api',
  headers: { 'Content-Type': 'application/json' },
});

// TODO(Antigravity, T-01): server menerbitkan & memverifikasi token; klien sudah mengirim header Authorization.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error?.response?.status === 401 && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!location.pathname.startsWith('/login') && location.pathname !== '/') location.assign('/login');
    }
    return Promise.reject(error);
  }
);

/** Pesan galat jaringan/server berbahasa Indonesia. */
export const apiErrorMessage = (e, fallback = 'Terjadi kesalahan.') => {
  if (e?.response?.data?.message) return e.response.data.message;
  if (e?.code === 'ERR_NETWORK' || !e?.response) return 'Server tidak terjangkau. Pastikan Apache dan MySQL (XAMPP) menyala.';
  return fallback;
};

export default api;
