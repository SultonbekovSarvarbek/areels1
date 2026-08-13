import Fastify from 'fastify';

import { db, listingInclude } from './db.ts';
import { env } from './env.ts';
import { toCar, type ListingRow } from './mapper.ts';

const app = Fastify({ logger: true });

/**
 * Каталог отдаётся целиком, без пагинации и серверной фильтрации, — так решено
 * осознанно. Колода на клиенте кольцевая (SwipeDeck), а счётчик в шторке
 * фильтров считается синхронно в рендере: обе вещи требуют весь список на руках.
 * Примерно до пары тысяч объявлений это дешевле, дальше понадобится и то и другое.
 *
 * Объявления без фото не отдаём: клиент индексирует photos[0] без проверки.
 */
async function publishedCars(): Promise<ListingRow[]> {
  const rows = await db.listing.findMany({
    where: { status: 'published', photos: { some: {} } },
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
    where: { id: request.params.id, status: 'published' },
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
