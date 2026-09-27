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

const STORAGE_KEY = "btb_guest_token";

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
    localStorage.removeItem(STORAGE_KEY);
    setGuestToken(null);
  }, []);

  const createFresh = useCallback(async () => {
    const session = await createGuest({ now: Date.now() });
    localStorage.setItem(STORAGE_KEY, session.token);
    setGuestToken(session.token);
    return session.token;
  }, [createGuest]);

  const ensureGuest = useCallback(async () => {
    const existing = localStorage.getItem(STORAGE_KEY);
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
      localStorage.removeItem(STORAGE_KEY);
      setGuestToken(null);
    }
    return await createFresh();
  }, [convex, createFresh]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const existing = localStorage.getItem(STORAGE_KEY);
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
          localStorage.removeItem(STORAGE_KEY);
          setGuestToken(null);
        }
      } catch {
        // Convex ikke klar / nettverk — behold token; ensureGuest validerer senere
        const existing = localStorage.getItem(STORAGE_KEY);
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
