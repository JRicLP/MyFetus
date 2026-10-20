import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { parseSessionUser, SessionUser } from '@/types/session';

const TOKEN_KEY = '@myFetus:sessionToken';
const USER_KEY = '@myFetus:sessionUser';
const LEGACY_TOKEN_KEY = 'authToken';
const LEGACY_USER_KEY = 'userData';

function getWebSessionStorage(): Storage | null {
  return typeof window !== 'undefined' ? window.sessionStorage : null;
}

async function readSecureToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return getWebSessionStorage()?.getItem(TOKEN_KEY) ?? null;
  }

  const SecureStore = await import('expo-secure-store');
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function writeSecureToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    getWebSessionStorage()?.setItem(TOKEN_KEY, token);
    return;
  }

  const SecureStore = await import('expo-secure-store');
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

async function deleteSecureToken(): Promise<void> {
  if (Platform.OS === 'web') {
    getWebSessionStorage()?.removeItem(TOKEN_KEY);
    return;
  }

  const SecureStore = await import('expo-secure-store');
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getStoredToken(): Promise<string | null> {
  const token = await readSecureToken();
  if (token) {
    await AsyncStorage.removeItem(LEGACY_TOKEN_KEY);
    return token;
  }

  const legacyToken = await AsyncStorage.getItem(LEGACY_TOKEN_KEY);
  if (!legacyToken) return null;

  await writeSecureToken(legacyToken);
  await AsyncStorage.removeItem(LEGACY_TOKEN_KEY);
  return legacyToken;
}

export async function getStoredUser(): Promise<SessionUser | null> {
  const stored = await AsyncStorage.getItem(USER_KEY);
  const legacy = stored ? null : await AsyncStorage.getItem(LEGACY_USER_KEY);
  const raw = stored ?? legacy;
  if (!raw) return null;

  try {
    const user = parseSessionUser(JSON.parse(raw));
    if (!user) return null;

    if (legacy) {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      await AsyncStorage.removeItem(LEGACY_USER_KEY);
    }
    return user;
  } catch {
    return null;
  }
}

export async function persistSession(token: string, user: SessionUser): Promise<void> {
  await writeSecureToken(token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  await AsyncStorage.multiRemove([LEGACY_TOKEN_KEY, LEGACY_USER_KEY]);
}

export async function clearStoredSession(): Promise<void> {
  await Promise.all([
    deleteSecureToken(),
    AsyncStorage.multiRemove([USER_KEY, LEGACY_TOKEN_KEY, LEGACY_USER_KEY]),
  ]);
}
