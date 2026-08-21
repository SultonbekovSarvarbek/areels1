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
import type { ListingStatus, ReportStatus } from '@prisma/client';

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

      const [rows, pending, published, rejected, archived, reports] = await Promise.all([
        db.listing.findMany({
          where: { status },
          include: { ...listingInclude, reports: { where: { status: 'open' } } },
          // Ожидающие — с самых старых: очередь, а не лента.
          orderBy: { createdAt: status === 'pending' ? 'asc' : 'desc' },
          take: 100,
        }),
        db.listing.count({ where: { status: 'pending' } }),
        db.listing.count({ where: { status: 'published' } }),
        db.listing.count({ where: { status: 'rejected' } }),
        db.listing.count({ where: { status: 'archived' } }),
        db.report.count({ where: { status: 'open' } }),
      ]);

      return {
        counts: { pending, published, rejected, archived, reports },
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
          openReports: row.reports.length,
          seller: {
            id: row.seller.id,
            name: row.seller.name,
            phone: row.seller.phone,
            type: row.seller.type,
            telegram: row.seller.telegramUsername,
            lang: row.seller.lang,
            blockedAt: row.seller.blockedAt,
            blockReason: row.seller.blockReason,
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

  // ─── Жалобы ────────────────────────────────────────────────────────────────
  //
  // Отдельная очередь, а не пометка на объявлении: сутки на реакцию мы обещаем
  // в условиях использования, и модератору нужен список, который видно целиком
  // и который заканчивается.

  app.get<{ Querystring: { status?: string } }>(
    '/api/admin/reports',
    { preHandler: guardAuth },
    async (request) => {
      const status = (['open', 'resolved', 'dismissed'] as ReportStatus[]).includes(
        request.query.status as ReportStatus,
      )
        ? (request.query.status as ReportStatus)
        : 'open';

      const rows = await db.report.findMany({
        where: { status },
        // Самые старые сверху: это очередь со сроком, а не лента новостей.
        orderBy: { createdAt: status === 'open' ? 'asc' : 'desc' },
        take: 200,
        include: { listing: { include: listingInclude } },
      });

      return {
        reports: rows.map((row) => ({
          id: row.id,
          reason: row.reason,
          comment: row.comment,
          status: row.status,
          createdAt: row.createdAt,
          resolvedAt: row.resolvedAt,
          resolution: row.resolution,
          listing: {
            id: row.listing.id,
            brand: row.listing.brand,
            model: row.listing.model,
            year: row.listing.year,
            price: row.listing.price,
            city: row.listing.city,
            description: row.listing.description,
            status: row.listing.status,
            photos: row.listing.photos.map((photo) => photo.url),
            seller: {
              id: row.listing.seller.id,
              name: row.listing.seller.name,
              phone: row.listing.seller.phone,
              telegram: row.listing.seller.telegramUsername,
              blockedAt: row.listing.seller.blockedAt,
              blockReason: row.listing.seller.blockReason,
            },
          },
        })),
      };
    },
  );

  /** Жалоба не подтвердилась: объявление остаётся, жалоба закрывается. */
  app.post<{ Params: { id: string } }>(
    '/api/admin/reports/:id/dismiss',
    { preHandler: guardAuth },
    async (request, reply) => {
      const report = await db.report.findUnique({ where: { id: request.params.id } });
      if (!report) return reply.code(404).send({ error: 'Жалоба не найдена' });

      await db.report.update({
        where: { id: report.id },
        data: { status: 'dismissed', resolvedAt: new Date(), resolution: 'не подтвердилась' },
      });
      return { ok: true };
    },
  );

  /**
   * Снять объявление по жалобе. Отдельно от «Отклонить»: там продавец получает
   * причину и может исправить, здесь объявление уходит в архив, а все открытые
   * жалобы на него закрываются одним движением — иначе они висели бы в очереди
   * после того, как вопрос решён.
   */
  app.post<{ Params: { id: string }; Body: { reason?: string } }>(
    '/api/admin/listings/:id/hide',
    { preHandler: guardAuth },
    async (request, reply) => {
      const reason = request.body?.reason?.trim().slice(0, 300) || 'нарушение правил сервиса';

      const listing = await db.listing.findUnique({
        where: { id: request.params.id },
        include: { seller: true },
      });
      if (!listing) return reply.code(404).send({ error: 'Объявление не найдено' });

      await db.$transaction([
        db.listing.update({
          where: { id: listing.id },
          data: { status: 'archived', rejectionReason: reason, moderatedAt: new Date() },
        }),
        db.report.updateMany({
          where: { listingId: listing.id, status: 'open' },
          data: { status: 'resolved', resolvedAt: new Date(), resolution: 'объявление снято' },
        }),
      ]);

      const title = `${listing.brand} ${listing.model}, ${listing.year}`;
      await notifySeller(
        listing.seller.telegramId,
        listing.seller.lang,
        TEXT[listing.seller.lang].moderationRemoved(title, reason),
      );

      return { ok: true };
    },
  );

  /**
   * Бан продавца: его объявления уходят из каталога все разом, бот перестаёт
   * принимать новые. Ровно то, чего требует 1.2 — «ejecting the user who
   * provided the offending content».
   */
  app.post<{ Params: { id: string }; Body: { reason?: string } }>(
    '/api/admin/sellers/:id/block',
    { preHandler: guardAuth },
    async (request, reply) => {
      const reason = request.body?.reason?.trim();
      if (!reason) return reply.code(400).send({ error: 'Нужна причина блокировки' });
      if (reason.length > 300) return reply.code(400).send({ error: 'Причина до 300 символов' });

      const seller = await db.seller.findUnique({ where: { id: request.params.id } });
      if (!seller) return reply.code(404).send({ error: 'Продавец не найден' });

      const now = new Date();
      await db.$transaction([
        db.seller.update({
          where: { id: seller.id },
          data: { blockedAt: now, blockReason: reason },
        }),
        // Объявления забаненного и так не отдаются каталогом, но статус
        // приводим в соответствие: иначе в панели они висят «в каталоге».
        db.listing.updateMany({
          where: { sellerId: seller.id, status: 'published' },
          data: { status: 'archived', rejectionReason: reason, moderatedAt: now },
        }),
        db.report.updateMany({
          where: { listing: { sellerId: seller.id }, status: 'open' },
          data: { status: 'resolved', resolvedAt: now, resolution: 'продавец заблокирован' },
        }),
      ]);

      await notifySeller(
        seller.telegramId,
        seller.lang,
        TEXT[seller.lang].sellerBlocked(reason),
      );

      return { ok: true };
    },
  );

  /** Разбан — на случай ошибки модератора. Объявления придётся одобрить заново. */
  app.post<{ Params: { id: string } }>(
    '/api/admin/sellers/:id/unblock',
    { preHandler: guardAuth },
    async (request, reply) => {
      const seller = await db.seller.findUnique({ where: { id: request.params.id } });
      if (!seller) return reply.code(404).send({ error: 'Продавец не найден' });

      await db.seller.update({
        where: { id: seller.id },
        data: { blockedAt: null, blockReason: null },
      });

      await notifySeller(seller.telegramId, seller.lang, TEXT[seller.lang].sellerUnblocked);

      return { ok: true };
    },
  );
}
