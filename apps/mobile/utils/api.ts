import Constants from 'expo-constants';
import { Platform } from 'react-native';

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
