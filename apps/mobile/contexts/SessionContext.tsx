import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { SessionUser } from '@/types/session';
import { subscribeToUnauthorized } from '@/utils/authEvents';
import {
  clearStoredSession,
  getStoredToken,
  getStoredUser,
  persistSession,
} from '@/utils/sessionStorage';

type SessionContextValue = {
  user: SessionUser | null;
  isLoading: boolean;
  signIn: (token: string, user: SessionUser) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const signOut = useCallback(async () => {
    setUser(null);
    await clearStoredSession();
  }, []);

  const signIn = useCallback(async (token: string, nextUser: SessionUser) => {
    await persistSession(token, nextUser);
    setUser(nextUser);
  }, []);

  useEffect(() => {
    let active = true;

    const hydrateSession = async () => {
      try {
        const [token, storedUser] = await Promise.all([getStoredToken(), getStoredUser()]);
        if (!active) return;
        if (token && storedUser) {
          setUser(storedUser);
          return;
        }
        await clearStoredSession();
      } catch {
        await clearStoredSession().catch(() => undefined);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void hydrateSession();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => subscribeToUnauthorized(() => void signOut()), [signOut]);

  const value = useMemo(
    () => ({ user, isLoading, signIn, signOut }),
    [user, isLoading, signIn, signOut]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession deve ser usado dentro de SessionProvider');
  return value;
}
