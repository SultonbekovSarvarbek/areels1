import { PrismaClient } from '@prisma/client';

export const db = new PrismaClient();

/** Запрос, который сервер отдаёт клиенту: продавец и фото нужны всегда. */
export const listingInclude = {
  seller: true,
  photos: { orderBy: { sortOrder: 'asc' } },
} as const;
