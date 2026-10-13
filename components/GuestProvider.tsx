"use client";

import { useConvex, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

const STORAGE_KEY = "nextround_guest_token";
const LEGACY_STORAGE_KEY = "BtB_guest_token";

function readStoredToken(): string | null {
  const current = localStorage.getItem(STORAGE_KEY);
  if (current) return current;
  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (legacy) {
    localStorage.setItem(STORAGE_KEY, legacy);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return legacy;
  }
  return null;
}

function clearStoredToken() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

type GuestContextValue = {
  guestToken: string | null;
  ready: boolean;
  ensureGuest: () => Promise<string>;
  clearGuest: () => void;
};

const GuestContext = createContext<GuestContextValue | null>(null);

export function GuestProvider({ children }: { children: ReactNode }) {
  const convex = useConvex();
  const createGuest = useMutation(api.guestSessions.create);
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const clearGuest = useCallback(() => {
    clearStoredToken();
    setGuestToken(null);
  }, []);

  const createFresh = useCallback(async () => {
    const session = await createGuest({ now: Date.now() });
    localStorage.setItem(STORAGE_KEY, session.token);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    setGuestToken(session.token);
    return session.token;
  }, [createGuest]);

  const ensureGuest = useCallback(async () => {
    const existing = readStoredToken();
    if (existing) {
      const session = await convex.query(api.guestSessions.getByToken, {
        token: existing,
        now: Date.now(),
      });
      // Gyldig uclaimet økt — gjenbruk
      if (session && !session.claimed) {
        setGuestToken(existing);
        return existing;
      }
      // Utløpt, slettet eller claimet — start på nytt
      clearStoredToken();
      setGuestToken(null);
    }
    return await createFresh();
  }, [convex, createFresh]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const existing = readStoredToken();
        if (!existing) {
          if (!cancelled) setReady(true);
          return;
        }
        const session = await convex.query(api.guestSessions.getByToken, {
          token: existing,
          now: Date.now(),
        });
        if (cancelled) return;
        if (session && !session.claimed) {
          setGuestToken(existing);
        } else {
          clearStoredToken();
          setGuestToken(null);
        }
      } catch {
        // Convex ikke klar / nettverk — behold token; ensureGuest validerer senere
        const existing = readStoredToken();
        if (existing && !cancelled) setGuestToken(existing);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [convex]);

  return (
    <GuestContext.Provider
      value={{ guestToken, ready, ensureGuest, clearGuest }}
    >
      {children}
    </GuestContext.Provider>
  );
}

export function useGuest() {
  const ctx = useContext(GuestContext);
  if (!ctx) throw new Error("useGuest must be used within GuestProvider");
  return ctx;
}
