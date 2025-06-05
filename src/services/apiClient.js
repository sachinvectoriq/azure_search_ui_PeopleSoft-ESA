import axios from 'axios';

const apiClient = axios.create({
  baseURL:
    import.meta.env.VITE_API || 'app-azuresearch-qa-ps-esa.azurewebsites.net',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  },
});

export default apiClient;
