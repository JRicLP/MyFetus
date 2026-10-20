import { api } from '../utils/apiClient';
import { AuthResponse } from '../types/api.types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const authService = {
  // faz o login e retorna o token e os dados do usuário
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/users/login', { email, password });
    return response.data;
  },

  // função utilitária para deslogar (apaga o token do celular)
  logout: async (): Promise<void> => {
    await AsyncStorage.removeItem('authToken');
  }
};