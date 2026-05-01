import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
});

client.interceptors.response.use(
  (response) => {
    const { code, message, data } = response.data;
    if (code !== 200) {
      return Promise.reject(new Error(message));
    }
    return data;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default client;
