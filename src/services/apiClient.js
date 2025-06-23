import axios from 'axios';

const apiClient = axios.create({
  baseURL:
    import.meta.env.VITE_API ||
    'https://green-sand-0888f430f.6.azurestaticapps.net/',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  },
});

export default apiClient;
