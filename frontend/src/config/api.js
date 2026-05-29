import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

export const apiClient = axios.create({
    baseURL: API_BASE,
    timeout: 120000, // 2 minuti per estrazioni lunghe
    headers: { 'Content-Type': 'application/json' }
});

apiClient.interceptors.response.use(
    response => response,
    error => {
        const message = error.response?.data?.error || error.message;
        return Promise.reject(new Error(message));
    }
);