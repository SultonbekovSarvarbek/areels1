/**
 * Перевод строки базы в объект Car — ровно тот контракт, который ждёт клиент
 * (../../src/types.ts). Здесь легко сломать приложение молча, поэтому по пунктам:
 *
 * - Перечисления отдаём кодами. Клиент переводит их через Record<City, string>
 *   и подобные (src/i18n.ts), незнакомый код отрендерится как undefined.
 * - photos обязан быть непустым: клиент индексирует car.photos[0] без проверки
 *   (CarCard.tsx, LikesScreen.tsx, ProfileScreen.tsx).
 * - telegram — username без «@», клиент подставляет его в https://t.me/...
 * - power и hot необязательны, поэтому кладём поля, только когда они есть:
 *   у объявлений из бота мощности нет, клиент в этом случае показывает
 *   один объём двигателя (src/utils/format.ts).
 */

import type { Car, Seller } from '../../src/types.ts';
import type { Listing, Photo, Seller as SellerRow } from '@prisma/client';

export type ListingRow = Listing & { seller: SellerRow; photos: Photo[] };

function toSeller(row: SellerRow): Seller {
  return {
    name: row.name,
    type: row.type,
    phone: row.phone,
    ...(row.telegramUsername ? { telegram: row.telegramUsername } : {}),
  };
}

export function toCar(row: ListingRow): Car {
  return {
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
    color: row.color,
    condition: row.condition,
    photos: row.photos.map((p) => p.url),
    tags: row.tags,
    negotiable: row.negotiable,
    description: row.description,
    seller: toSeller(row.seller),
    ...(row.power === null ? {} : { power: row.power }),
    ...(row.owners === null ? {} : { owners: row.owners }),
    ...(row.hot ? { hot: true as const } : {}),
  };
}
