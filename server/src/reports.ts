/**
 * Жалобы на объявления — публичная часть.
 *
 * Требование App Store 1.2: у пользователя должен быть способ пожаловаться на
 * оскорбительный контент, а у нас — снять такой контент в течение суток.
 * Отсюда две вещи, которых не было раньше:
 *
 *  - POST /api/reports принимает жалобу без всякой авторизации. Покупатель в
 *    приложении не регистрируется вовсе, и требовать вход ради жалобы значило бы
 *    не получить ни одной.
 *  - При накоплении порога жалоб объявление само уходит из каталога обратно в
 *    очередь модерации. Сутки — это верхняя граница, а не расписание: пока
 *    модератор спит, оскорбительное объявление уже никому не показывается.
 *
 * Анонимность взамен требует защиты от накрутки: одно устройство — одна жалоба
 * на объявление (уникальный индекс в схеме) плюс потолок на адрес.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ReportReason } from '@prisma/client';

import { db } from './db.ts';
import { optionalBotToken, env } from './env.ts';

/**
 * Сколько разных устройств должны пожаловаться, чтобы объявление ушло из
 * каталога само. Три, а не одно: одной кнопкой конкурент снимал бы чужие
 * объявления пачками. Оскорбительный контент столько жалоб собирает быстро.
 */
const AUTO_HIDE_AT = 3;

/** Потолок на адрес: столько жалоб с одного IP за час. */
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000;

const REASONS: ReportReason[] = [
  'fraud',
  'notForSale',
  'wrongInfo',
  'foreignPhotos',
  'offensive',
  'spam',
  'other',
];

/** Адрес → отметки времени жалоб внутри окна. В памяти: переживать рестарт незачем. */
const recent = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((at) => now - at < RATE_WINDOW_MS);
  hits.push(now);
  recent.set(ip, hits);
  return hits.length > RATE_LIMIT;
}

/**
 * Сообщение модератору в телеграм. Ждать, пока он откроет панель, нельзя:
 * сутки на реакцию мы обещаем в условиях использования, а панель никто не
 * держит открытой. Без MODERATOR_CHAT_ID жалоба всё равно сохранится — просто
 * молча, и будет видна в /admin.
 */
async function notifyModerator(text: string): Promise<void> {
  const token = optionalBotToken();
  const chatId = env.moderatorChatId;
  if (!token || !chatId) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
  } catch (error) {
    // Жалоба уже в базе — не уведомить о ней неприятно, но не фатально.
    console.error('Не удалось уведомить модератора о жалобе:', error);
  }
}

interface ReportBody {
  listingId?: string;
  reason?: string;
  comment?: string;
  deviceId?: string;
}

export function registerReports(app: FastifyInstance): void {
  app.post<{ Body: ReportBody }>('/api/reports', async (request: FastifyRequest<{ Body: ReportBody }>, reply) => {
    const body = request.body ?? {};
    const listingId = typeof body.listingId === 'string' ? body.listingId : '';
    const deviceId = typeof body.deviceId === 'string' ? body.deviceId.slice(0, 64) : '';
    const reason = body.reason as ReportReason;
    const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 500) : '';

    if (!listingId || !deviceId) {
      return reply.code(400).send({ error: 'Нужны listingId и deviceId' });
    }
    if (!REASONS.includes(reason)) {
      return reply.code(400).send({ error: 'Неизвестная причина жалобы' });
    }
    if (rateLimited(request.ip)) {
      return reply.code(429).send({ error: 'Слишком много жалоб, попробуйте позже' });
    }

    const listing = await db.listing.findUnique({
      where: { id: listingId },
      include: { seller: true },
    });
    if (!listing) return reply.code(404).send({ error: 'Объявление не найдено' });

    // Повторная жалоба того же устройства обновляет старую, а не плодит новую:
    // передумал с причиной — считается последняя, вес остаётся прежним.
    await db.report.upsert({
      where: { listingId_deviceId: { listingId, deviceId } },
      update: { reason, comment: comment || null, status: 'open', resolvedAt: null },
      create: { listingId, deviceId, reason, comment: comment || null },
    });

    const open = await db.report.count({ where: { listingId, status: 'open' } });

    // Порог пройден — снимаем с показа немедленно и возвращаем в очередь: так
    // модератор увидит объявление там же, где смотрит новые, а покупатели уже
    // не увидят нигде.
    const hidden = open >= AUTO_HIDE_AT && listing.status === 'published';
    if (hidden) {
      await db.listing.update({
        where: { id: listingId },
        data: { status: 'pending', moderatedAt: null },
      });
    }

    const title = `${listing.brand} ${listing.model}, ${listing.year}`;
    await notifyModerator(
      [
        hidden ? '🚫 <b>Объявление снято по жалобам</b>' : '⚠️ <b>Жалоба на объявление</b>',
        `${title} — ${listing.seller.name}, ${listing.seller.phone}`,
        `Причина: ${reason}${comment ? `\nКомментарий: ${comment}` : ''}`,
        `Открытых жалоб: ${open}`,
        `Разобрать: ${env.publicUrl}/admin`,
      ].join('\n'),
    );

    return { ok: true, hidden };
  });
}
