/**
 * Модерация: объявление из бота попадает в каталог только после одобрения.
 *
 * Панель — обычная веб-страница (../public/admin.html), раздаётся тем же
 * Fastify. Отдельного фронтенд-проекта нет намеренно: страница одна, сборка и
 * деплой ей не нужны, а править её можно прямо на сервере.
 *
 * Вход — один пароль из ADMIN_PASSWORD. Сессии живут в памяти процесса, как и
 * сессии бота: модераторов немного, перелогиниться после рестарта недорого.
 */

import { randomUUID, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ListingStatus } from '@prisma/client';

import { db, listingInclude } from './db.ts';
import { env, optionalBotToken } from './env.ts';
import { TEXT } from './text.ts';

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

/** Токен → когда протухнет. Чистим лениво, при обращении. */
const sessions = new Map<string, number>();

/**
 * Панель смотрит в интернет, поэтому подбор пароля ограничиваем по адресу:
 * пять попыток, дальше пауза. Счётчик в памяти — переживать рестарт ему незачем.
 */
const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

function issueToken(): string {
  const token = randomUUID();
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  return token;
}

function validToken(token: string | undefined): boolean {
  if (!token) return false;
  const expires = sessions.get(token);
  if (!expires) return false;
  if (expires < Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

/** Сравнение постоянного времени: обычное «===» подсказывает длину подбором. */
function passwordMatches(given: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(env.adminPassword);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function bearer(request: FastifyRequest): string | undefined {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) return undefined;
  return header.slice('Bearer '.length);
}

/**
 * Сообщение продавцу об итогах модерации. Шлём напрямую в Telegram, а не через
 * процесс бота: они не связаны между собой, а сообщение — один HTTP-запрос.
 * Продавцов из сида пропускаем: у них нет telegramId, писать некому.
 */
async function notifySeller(
  telegramId: bigint | null,
  lang: keyof typeof TEXT,
  text: string,
): Promise<void> {
  const token = optionalBotToken();
  if (!token || telegramId === null) return;

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: Number(telegramId),
        text,
        parse_mode: 'HTML',
      }),
    });
    if (!response.ok) {
      console.error('Телеграм не принял уведомление:', await response.text());
    }
  } catch (error) {
    // Продавец не узнал об одобрении — неприятно, но решение модератора уже
    // записано, и падать из-за недоступного телеграма API незачем.
    console.error('Не удалось уведомить продавца:', error);
  }
}

const MODERATION_STATUSES: ListingStatus[] = ['pending', 'published', 'rejected', 'archived'];

function parseStatus(value: unknown): ListingStatus {
  return MODERATION_STATUSES.includes(value as ListingStatus)
    ? (value as ListingStatus)
    : 'pending';
}

export function registerAdmin(app: FastifyInstance): void {
  /** Без пароля в окружении админка выключена целиком, а не открыта всем. */
  const guardConfigured = async (_request: FastifyRequest, reply: FastifyReply) => {
    if (!env.adminPassword) {
      return reply
        .code(503)
        .send({ error: 'Модерация не настроена: задайте ADMIN_PASSWORD в server/.env' });
    }
  };

  const guardAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!env.adminPassword) {
      return reply.code(503).send({ error: 'Модерация не настроена' });
    }
    if (!validToken(bearer(request))) {
      return reply.code(401).send({ error: 'Нужен вход' });
    }
  };

  // Страница панели. Читаем файл на каждый запрос: он маленький, зато правки
  // видны без перезапуска сервера.
  app.get('/admin', async (_request, reply) => {
    const html = await readFile(new URL('../public/admin.html', import.meta.url), 'utf8');
    return reply.type('text/html; charset=utf-8').send(html);
  });

  app.post<{ Body: { password?: string } }>(
    '/api/admin/login',
    { preHandler: guardConfigured },
    async (request, reply) => {
      const ip = request.ip;
      const lock = attempts.get(ip);

      if (lock && lock.count >= MAX_ATTEMPTS && lock.until > Date.now()) {
        const minutes = Math.ceil((lock.until - Date.now()) / 60000);
        return reply.code(429).send({ error: `Слишком много попыток. Подождите ${minutes} мин.` });
      }

      if (!request.body?.password || !passwordMatches(request.body.password)) {
        const count = (lock?.count ?? 0) + 1;
        attempts.set(ip, { count, until: Date.now() + LOCK_MS });
        return reply.code(401).send({ error: 'Неверный пароль' });
      }

      attempts.delete(ip);
      return { token: issueToken() };
    },
  );

  app.get<{ Querystring: { status?: string } }>(
    '/api/admin/listings',
    { preHandler: guardAuth },
    async (request) => {
      const status = parseStatus(request.query.status);

      const [rows, pending, published, rejected, archived] = await Promise.all([
        db.listing.findMany({
          where: { status },
          include: listingInclude,
          // Ожидающие — с самых старых: очередь, а не лента.
          orderBy: { createdAt: status === 'pending' ? 'asc' : 'desc' },
          take: 100,
        }),
        db.listing.count({ where: { status: 'pending' } }),
        db.listing.count({ where: { status: 'published' } }),
        db.listing.count({ where: { status: 'rejected' } }),
        db.listing.count({ where: { status: 'archived' } }),
      ]);

      return {
        counts: { pending, published, rejected, archived },
        listings: rows.map((row) => ({
          id: row.id,
          brand: row.brand,
          model: row.model,
          year: row.year,
          price: row.price,
          mileage: row.mileage,
          city: row.city,
          bodyType: row.bodyType,
          fuel: row.fuel,
          transmission: row.transmission,
          drive: row.drive,
          engine: row.engine,
          power: row.power,
          color: row.color,
          condition: row.condition,
          owners: row.owners,
          tint: row.tint,
          negotiable: row.negotiable,
          description: row.description,
          status: row.status,
          rejectionReason: row.rejectionReason,
          createdAt: row.createdAt,
          moderatedAt: row.moderatedAt,
          photos: row.photos.map((photo) => photo.url),
          seller: {
            name: row.seller.name,
            phone: row.seller.phone,
            type: row.seller.type,
            telegram: row.seller.telegramUsername,
            lang: row.seller.lang,
          },
        })),
      };
    },
  );

  app.post<{ Params: { id: string } }>(
    '/api/admin/listings/:id/approve',
    { preHandler: guardAuth },
    async (request, reply) => {
      const listing = await db.listing.findUnique({
        where: { id: request.params.id },
        include: { seller: true },
      });
      if (!listing) return reply.code(404).send({ error: 'Объявление не найдено' });

      await db.listing.update({
        where: { id: listing.id },
        data: { status: 'published', rejectionReason: null, moderatedAt: new Date() },
      });

      const title = `${listing.brand} ${listing.model}, ${listing.year}`;
      await notifySeller(
        listing.seller.telegramId,
        listing.seller.lang,
        TEXT[listing.seller.lang].moderationApproved(title),
      );

      return { ok: true };
    },
  );

  app.post<{ Params: { id: string }; Body: { reason?: string } }>(
    '/api/admin/listings/:id/reject',
    { preHandler: guardAuth },
    async (request, reply) => {
      const reason = request.body?.reason?.trim();
      // Причина обязательна: продавец увидит её в боте, и «отклонено без
      // объяснений» гарантирует второй такой же заход по кругу.
      if (!reason) return reply.code(400).send({ error: 'Нужна причина отклонения' });
      if (reason.length > 300) return reply.code(400).send({ error: 'Причина до 300 символов' });

      const listing = await db.listing.findUnique({
        where: { id: request.params.id },
        include: { seller: true },
      });
      if (!listing) return reply.code(404).send({ error: 'Объявление не найдено' });

      await db.listing.update({
        where: { id: listing.id },
        data: { status: 'rejected', rejectionReason: reason, moderatedAt: new Date() },
      });

      const title = `${listing.brand} ${listing.model}, ${listing.year}`;
      await notifySeller(
        listing.seller.telegramId,
        listing.seller.lang,
        TEXT[listing.seller.lang].moderationRejected(title, reason),
      );

      return { ok: true };
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/api/admin/listings/:id',
    { preHandler: guardAuth },
    async (request, reply) => {
      const listing = await db.listing.findUnique({ where: { id: request.params.id } });
      if (!listing) return reply.code(404).send({ error: 'Объявление не найдено' });

      await db.listing.delete({ where: { id: listing.id } });
      return { ok: true };
    },
  );
}
