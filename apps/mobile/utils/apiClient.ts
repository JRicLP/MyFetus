import axios from 'axios';
import { getApiBaseUrl } from './api';
import { notifyUnauthorized } from './authEvents';
import { getStoredToken } from './sessionStorage';

// 1 - Cria a base da API. Se não houver variável no .env, usa localhost.
export const api = axios.create({
  baseURL: `${getApiBaseUrl()}/api`,
  timeout: 15000, 
});

// 2 - Intercetor de Pedidos: Injeta o Token JWT em todas as chamadas automaticamente
api.interceptors.request.use(
  async (config) => {
    try {
        const token = await getStoredToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Falha de leitura deixa a requisição sem autenticação.
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 3 -  Intercetor de Respostas: Lida com tokens expirados (opcional)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      notifyUnauthorized();
    }
    return Promise.reject(error);
  }
);
