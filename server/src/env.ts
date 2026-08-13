/**
 * Переменные окружения читаются в одном месте и падают на старте, а не в тот
 * момент, когда до них впервые дошло исполнение.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Не задана переменная окружения ${name} (см. server/.env)`);
  return value;
}

export const env = {
  databaseUrl: required('DATABASE_URL'),

  apiPort: Number(process.env.API_PORT ?? 3000),
  apiHost: process.env.API_HOST ?? '0.0.0.0',

  s3: {
    endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    region: process.env.S3_REGION ?? 'us-east-1',
    bucket: process.env.S3_BUCKET ?? 'listings',
    accessKey: process.env.S3_ACCESS_KEY ?? 'minioadmin',
    secretKey: process.env.S3_SECRET_KEY ?? 'minioadmin',
    publicUrl: process.env.S3_PUBLIC_URL ?? 'http://localhost:9000/listings',
  },
};

/** Токен бота нужен только боту — API поднимается и без него. */
export function botToken(): string {
  return required('BOT_TOKEN');
}
