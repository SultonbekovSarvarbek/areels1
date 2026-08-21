/**
 * Инструменты покупателя против плохих объявлений: жалоба и блокировка продавца.
 *
 * Обе штуки требует App Store 1.2, и обе устроены так, чтобы работать без
 * аккаунта — покупатель в AvtoLike не регистрируется вовсе:
 *
 *  - жалоба уходит на сервер с идентификатором устройства и попадает в очередь
 *    модерации (server/src/reports.ts);
 *  - блокировка продавца живёт целиком на устройстве. Серверу она не нужна:
 *    «мне неприятен этот человек» — не то же самое, что «он нарушает правила»,
 *    и превращать первое во второе за спиной пользователя неправильно.
 *
 * И жалоба, и блокировка действуют немедленно, ещё до ответа сервера: человек
 * нажал «Пожаловаться» — объявление обязано исчезнуть сейчас, а не после того,
 * как модератор проснётся.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { BlockedSeller, Car, ReportReason } from './types';
import { sendReport } from './api/client';
import {
  loadBlockedSellers,
  loadDeviceId,
  loadReported,
  saveBlockedSellers,
  saveReported,
} from './storage';

interface ModerationValue {
  /** Скрыть машину из выдачи: заблокирован продавец или на неё пожаловались. */
  isHidden: (car: Car) => boolean;
  blockedSellers: BlockedSeller[];
  isBlocked: (sellerId: string) => boolean;
  blockSeller: (seller: BlockedSeller) => void;
  unblockSeller: (sellerId: string) => void;
  /** Уже жаловались с этого устройства — второй раз спрашивать причину незачем. */
  isReported: (carId: string) => boolean;
  report: (carId: string, reason: ReportReason, comment: string) => Promise<void>;
}

const ModerationCtx = createContext<ModerationValue | null>(null);

export function ModerationProvider({ children }: { children: React.ReactNode }) {
  const [blocked, setBlocked] = useState<BlockedSeller[]>([]);
  const [reported, setReported] = useState<string[]>([]);
  const [deviceId, setDeviceId] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([loadBlockedSellers(), loadReported(), loadDeviceId()]).then(([b, r, id]) => {
      if (!active) return;
      setBlocked(b);
      setReported(r);
      setDeviceId(id);
    });
    return () => {
      active = false;
    };
  }, []);

  const blockSeller = useCallback((seller: BlockedSeller) => {
    setBlocked((current) => {
      if (current.some((s) => s.id === seller.id)) return current;
      const next = [...current, seller];
      saveBlockedSellers(next);
      return next;
    });
  }, []);

  const unblockSeller = useCallback((sellerId: string) => {
    setBlocked((current) => {
      const next = current.filter((s) => s.id !== sellerId);
      saveBlockedSellers(next);
      return next;
    });
  }, []);

  /**
   * Прячем объявление сразу и только потом отправляем жалобу. Если сеть
   * подведёт, вызывающий покажет ошибку, но объявление всё равно останется
   * скрытым: показывать его снова человеку, который на него пожаловался, —
   * худшее из возможных поведений.
   */
  const report = useCallback(
    async (carId: string, reason: ReportReason, comment: string) => {
      setReported((current) => {
        if (current.includes(carId)) return current;
        const next = [...current, carId];
        saveReported(next);
        return next;
      });

      await sendReport({
        listingId: carId,
        reason,
        comment,
        // deviceId может ещё не приехать из хранилища, если пожаловались в
        // первые же миллисекунды: тогда читаем его прямо здесь.
        deviceId: deviceId || (await loadDeviceId()),
      });
    },
    [deviceId],
  );

  const value = useMemo<ModerationValue>(() => {
    const blockedSet = new Set(blocked.map((s) => s.id));
    const reportedSet = new Set(reported);
    return {
      isHidden: (car) => blockedSet.has(car.seller.id) || reportedSet.has(car.id),
      blockedSellers: blocked,
      isBlocked: (sellerId) => blockedSet.has(sellerId),
      blockSeller,
      unblockSeller,
      isReported: (carId) => reportedSet.has(carId),
      report,
    };
  }, [blocked, reported, blockSeller, unblockSeller, report]);

  return <ModerationCtx.Provider value={value}>{children}</ModerationCtx.Provider>;
}

export function useModeration(): ModerationValue {
  const value = useContext(ModerationCtx);
  if (!value) throw new Error('useModeration вызван вне ModerationProvider');
  return value;
}
