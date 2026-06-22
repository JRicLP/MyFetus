import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const AUTH_TOKEN_KEY = 'authToken';

function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function getDevServerHost(): string | undefined {
  // On Expo Go / dev builds this usually contains something like "192.168.0.10:19000"
  const anyConstants: any = Constants as any;
  const hostUri: string | undefined =
    Constants.expoConfig?.hostUri ??
    anyConstants?.expoConfig?.hostUri ??
    anyConstants?.manifest2?.extra?.expoClient?.hostUri ??
    anyConstants?.manifest?.debuggerHost ??
    anyConstants?.manifest?.hostUri;

  return hostUri?.split(':')[0];
}

export function getApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return stripTrailingSlash(envUrl.trim());
  }

  if (Platform.OS === 'web') {
    return 'http://localhost:3000';
  }

  const host = getDevServerHost();
  if (host) {
    return `http://${host}:3000`;
  }

  // Fallbacks when host can't be inferred.
  if (Platform.OS === 'android') {
    // Android emulator host loopback
    return 'http://10.0.2.2:3000';
  }

  return 'http://localhost:3000';
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

/**
 * Wrapper de `fetch` que anexa o token salvo no login (`AUTH_TOKEN_KEY`) como
 * `Authorization: Bearer <token>`. Use no lugar de `fetch` em toda chamada às
 * rotas da API — a maioria exige `authenticateToken` e responde 401 sem isso.
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);

  const headers = new Headers(options.headers as HeadersInit | undefined);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, { ...options, headers });
}
