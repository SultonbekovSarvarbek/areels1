/**
 * Засев базы из заглушки приложения. Импортируем тот же самый модуль, который
 * до сих пор читал клиент, — так каталог в базе гарантированно совпадает с тем,
 * что показывалось раньше, и переключение на API можно сверить один в один.
 *
 * Скрипт идемпотентный: чистит таблицы и заливает заново.
 */

import { CARS } from '../../src/data/cars.ts';
import type { Car } from '../../src/types.ts';
import { db } from './db.ts';

/**
 * В заглушке продавец вписан в каждую машину, и один и тот же человек
 * встречается у нескольких объявлений. В базе это одна строка, ключ — телефон.
 *
 * seller.id из заглушки не переносим: там он проставлен только ради типа Seller,
 * а настоящий идентификатор выдаёт база.
 */
function sellerKey(car: Car): string {
  return car.seller.phone;
}

async function main() {
  // Photo и Listing уедут каскадом за Seller, но чистим явно — понятнее.
  await db.photo.deleteMany();
  await db.listing.deleteMany();
  await db.seller.deleteMany();

  const sellerIdByPhone = new Map<string, string>();

  for (const car of CARS) {
    const key = sellerKey(car);
    if (sellerIdByPhone.has(key)) continue;

    const seller = await db.seller.create({
      data: {
        name: car.seller.name,
        type: car.seller.type,
        phone: car.seller.phone,
        telegramUsername: car.seller.telegram ?? null,
      },
    });
    sellerIdByPhone.set(key, seller.id);
  }

  for (const car of CARS) {
    const sellerId = sellerIdByPhone.get(sellerKey(car));
    if (!sellerId) throw new Error(`Не нашёлся продавец для ${car.id}`);

    await db.listing.create({
      data: {
        brand: car.brand,
        model: car.model,
        year: car.year,
        price: car.price,
        mileage: car.mileage,
        city: car.city,
        bodyType: car.bodyType,
        fuel: car.fuel,
        transmission: car.transmission,
        drive: car.drive,
        engine: car.engine,
        power: car.power,
        color: car.color,
        condition: car.condition,
        owners: car.owners,
        // Демо-каталог модерацию не проходит: он и есть эталон готовой выдачи,
        // а по умолчанию новое объявление теперь ждёт проверки.
        status: 'published',
        tags: car.tags,
        negotiable: car.negotiable,
        description: car.description,
        hot: car.hot ?? false,
        sellerId,
        photos: {
          create: car.photos.map((url, sortOrder) => ({ url, sortOrder })),
        },
      },
    });
  }

  const [sellers, listings, photos] = await Promise.all([
    db.seller.count(),
    db.listing.count(),
    db.photo.count(),
  ]);
  console.log(`Засеяно: продавцов ${sellers}, объявлений ${listings}, фото ${photos}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
