export const SESSION_USER_KEY = '@myFetus:sessionUser';
export const LEGACY_TOKEN_KEY = 'authToken';
export const LEGACY_USER_KEY = 'userData';

export const SESSION_METADATA_KEYS = [
  SESSION_USER_KEY,
  LEGACY_TOKEN_KEY,
  LEGACY_USER_KEY,
] as const;

export type SessionMetadataRemover = (keys: readonly string[]) => Promise<void>;

export function clearStoredSessionMetadata(remove: SessionMetadataRemover): Promise<void> {
  return remove(SESSION_METADATA_KEYS);
}
