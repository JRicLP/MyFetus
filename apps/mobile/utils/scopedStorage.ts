import AsyncStorage from '@react-native-async-storage/async-storage';

function buildScopedKey(userId: number, key: string): string {
  return `@myFetus:v1:user:${userId}:${key}`;
}

export async function getScopedItem(
  userId: number,
  key: string,
  legacyKey?: string
): Promise<string | null> {
  const scopedKey = buildScopedKey(userId, key);
  const value = await AsyncStorage.getItem(scopedKey);
  if (value !== null || !legacyKey) return value;

  const legacyValue = await AsyncStorage.getItem(legacyKey);
  if (legacyValue === null) return null;

  await AsyncStorage.setItem(scopedKey, legacyValue);
  await AsyncStorage.removeItem(legacyKey);
  return legacyValue;
}

export function setScopedItem(userId: number, key: string, value: string): Promise<void> {
  return AsyncStorage.setItem(buildScopedKey(userId, key), value);
}
