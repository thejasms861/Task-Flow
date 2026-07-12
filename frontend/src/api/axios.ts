import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

export const clientSocketId = crypto.randomUUID();

const isProd = import.meta.env.PROD;
const fallbackProdUrl = 'https://taskflow-backend-cj9v.onrender.com/api';

const apiClient = axios.create({
    // Force the correct backend URL in production to prevent user misconfiguration
    baseURL: isProd ? fallbackProdUrl : (import.meta.env.VITE_API_URL || '/api'),
    headers: {
        'Content-Type': 'application/json',
        'X-Socket-ID': clientSocketId
    }
});

apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config as any;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshed = await useAuthStore.getState().refreshTokenFn();
                if (refreshed) {
                    const token = localStorage.getItem('access_token');
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return apiClient(originalRequest);
                }
            } catch (err) {
                useAuthStore.getState().logout();
                return Promise.reject(err);
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;
