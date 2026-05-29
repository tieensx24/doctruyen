import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000,
  validateStatus: () => true,
});

export const isOk = response => response.status >= 200 && response.status < 300;

export default api;
