import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_BASE_URL) {
  throw new Error('EXPO_PUBLIC_API_URL não configurada');
}

type ApiOptions = RequestInit & {
  auth?: boolean;
};

export async function apiFetch(path: string, options: ApiOptions = {}) {
  const token = await AsyncStorage.getItem('authToken');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (options.auth !== false && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || `Erro na API: ${response.status}`);
  }

  return data;
}