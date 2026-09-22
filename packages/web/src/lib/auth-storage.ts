import type { UserDto } from '@wyzetalk/db/types';

/**
 * Session lives in localStorage: good enough for an internal tool with a single
 * short-lived access token, and it survives a page reload during a demo.
 */
const STORAGE_KEY = 'wyzetalk.session';

export type Session = {
  token: string;
  user: UserDto;
};

export function readSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const { token, user } = parsed as Partial<Session>;
    if (typeof token !== 'string' || !token || !user) return null;

    return { token, user };
  } catch {
    // Corrupt or unavailable storage is not worth crashing the app over.
    return null;
  }
}

export function writeSession(session: Session): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
