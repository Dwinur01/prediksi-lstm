import axios from 'axios';

// Update baseURL to point to the PHP API
const api = axios.create({
  baseURL: 'http://localhost/prediksi-lstm/prediksi-lstm/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
