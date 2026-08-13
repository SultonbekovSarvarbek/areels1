/**
 * Хранилище фотографий. Локально это MinIO, в проде — любой S3: протокол один,
 * меняются только переменные окружения (см. server/.env).
 *
 * Ссылки на фото клиент грузит обычным <Image>, без подписи и заголовков,
 * поэтому бакет делаем публичным на чтение, а имена объектов — случайными:
 * угадать чужой ключ нельзя, а листинг бакета политика не разрешает.
 */

import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';

import { env } from './env.ts';

/**
 * forcePathStyle обязателен: MinIO живёт на localhost:9000 и адресует бакет
 * путём (/listings/...), а не поддоменом (listings.localhost), как настоящий S3.
 */
const s3 = new S3Client({
  endpoint: env.s3.endpoint,
  region: env.s3.region,
  forcePathStyle: true,
  credentials: {
    accessKeyId: env.s3.accessKey,
    secretAccessKey: env.s3.secretKey,
  },
});

function publicReadPolicy(bucket: string): string {
  return JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${bucket}/*`],
      },
    ],
  });
}

/**
 * Вызывается один раз на старте бота. Если бакета нет — создаём: иначе первая
 * же публикация упала бы на загрузке фото, уже собрав с продавца всю анкету.
 */
export async function ensureBucket(): Promise<void> {
  const Bucket = env.s3.bucket;

  try {
    await s3.send(new HeadBucketCommand({ Bucket }));
  } catch {
    // HeadBucket не различает «нет бакета» и «нет прав» кодом ошибки одинаково
    // на всех реализациях, поэтому просто пробуем создать и падаем, если и это
    // не вышло, — тогда причина будет видна в сообщении.
    await s3.send(new CreateBucketCommand({ Bucket }));
  }

  await s3.send(new PutBucketPolicyCommand({ Bucket, Policy: publicReadPolicy(Bucket) }));
}

/**
 * Кладёт файл в бакет и возвращает публичную ссылку — ровно то, что уходит
 * в Photo.url и дальше в клиент.
 */
export async function uploadPhoto(body: Uint8Array, contentType = 'image/jpeg'): Promise<string> {
  const key = `${randomUUID()}.jpg`;

  await s3.send(
    new PutObjectCommand({
      Bucket: env.s3.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      // Фото объявления не меняется: раз загруженный ключ можно кэшировать долго.
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );

  return `${env.s3.publicUrl.replace(/\/$/, '')}/${key}`;
}
