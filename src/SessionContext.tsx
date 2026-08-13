import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { Offer, User } from './types';
import { loadOffers, loadUser, saveOffers, saveUser } from './storage';

interface SessionValue {
  user: User | null;
  offers: Offer[];
  signIn: (phone: string, name: string) => void;
  signOut: () => void;
  /** Новое предложение по машине заменяет прежнее — торг ведётся одной ценой. */
  makeOffer: (carId: string, price: number, comment?: string) => void;
  offerFor: (carId: string) => Offer | undefined;
}

const SessionCtx = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);

  useEffect(() => {
    loadUser().then(setUser);
    loadOffers().then(setOffers);
  }, []);

  const signIn = useCallback((phone: string, name: string) => {
    const next: User = { phone, name, signedUpAt: new Date().toISOString() };
    setUser(next);
    saveUser(next);
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    setOffers([]);
    saveUser(null);
    saveOffers([]);
  }, []);

  const makeOffer = useCallback((carId: string, price: number, comment?: string) => {
    setOffers((current) => {
      const offer: Offer = {
        id: `${carId}-${Date.now()}`,
        carId,
        price,
        comment: comment?.trim() || undefined,
        createdAt: new Date().toISOString(),
        status: 'sent',
      };
      const next = [offer, ...current.filter((o) => o.carId !== carId)];
      saveOffers(next);
      return next;
    });
  }, []);

  const offerFor = useCallback((carId: string) => offers.find((o) => o.carId === carId), [offers]);

  const value = useMemo<SessionValue>(
    () => ({ user, offers, signIn, signOut, makeOffer, offerFor }),
    [user, offers, signIn, signOut, makeOffer, offerFor],
  );

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error('useSession вызван вне SessionProvider');
  return ctx;
}
