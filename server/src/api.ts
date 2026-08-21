import Fastify from 'fastify';

import { registerAdmin } from './admin.ts';
import { registerReports } from './reports.ts';
import { db, listingInclude } from './db.ts';
import { env } from './env.ts';
import { toCar, type ListingRow } from './mapper.ts';

const app = Fastify({ logger: true });

// Модерация: панель и её API живут на том же сервере, что и каталог.
registerAdmin(app);

// Жалобы от покупателей — публичный роут, без авторизации.
registerReports(app);

/**
 * Каталог отдаётся целиком, без пагинации и серверной фильтрации, — так решено
 * осознанно. Колода на клиенте кольцевая (SwipeDeck), а счётчик в шторке
 * фильтров считается синхронно в рендере: обе вещи требуют весь список на руках.
 * Примерно до пары тысяч объявлений это дешевле, дальше понадобится и то и другое.
 *
 * Объявления без фото не отдаём: клиент индексирует photos[0] без проверки.
 *
 * status: 'published' — это ещё и граница модерации: всё, что пришло из бота,
 * лежит в pending и в каталог не попадает, пока его не одобрят в /admin.
 *
 * Забаненный продавец исчезает из каталога целиком, вместе со всеми своими
 * объявлениями, — не по одному объявлению за раз. Этого требует 1.2: нарушителя
 * нужно отлучить от сервиса, а не только снять конкретное объявление.
 */
async function publishedCars(): Promise<ListingRow[]> {
  const rows = await db.listing.findMany({
    where: { status: 'published', photos: { some: {} }, seller: { blockedAt: null } },
    include: listingInclude,
    orderBy: { createdAt: 'desc' },
  });
  return rows as ListingRow[];
}

app.get('/api/health', async () => {
  await db.$queryRaw`SELECT 1`;
  return { ok: true };
});

app.get('/api/cars', async () => {
  const rows = await publishedCars();
  return rows.map(toCar);
});

app.get<{ Params: { id: string } }>('/api/cars/:id', async (request, reply) => {
  const row = await db.listing.findFirst({
    where: { id: request.params.id, status: 'published', seller: { blockedAt: null } },
    include: listingInclude,
  });

  if (!row || row.photos.length === 0) {
    return reply.code(404).send({ error: 'Объявление не найдено' });
  }

  return toCar(row as ListingRow);
});

try {
  await app.listen({ port: env.apiPort, host: env.apiHost });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
