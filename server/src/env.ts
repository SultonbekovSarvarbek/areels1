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

  /**
   * Пароль от админки. Пустой — модерация недоступна: роуты отвечают 503, а не
   * пускают всех подряд. Так забытая переменная не открывает панель наружу.
   */
  adminPassword: process.env.ADMIN_PASSWORD ?? '',

  /**
   * Куда бот пишет о новых жалобах. Без неё жалобы всё равно сохраняются и
   * видны в /admin — теряется только скорость реакции, а сутки на неё мы
   * обещаем в условиях использования.
   */
  moderatorChatId: process.env.MODERATOR_CHAT_ID ?? '',

  /** Адрес сервера снаружи — нужен, чтобы дать в уведомлении ссылку на панель. */
  publicUrl: process.env.PUBLIC_URL ?? 'https://yodda.online',
};

/** Токен бота нужен только боту — API поднимается и без него. */
export function botToken(): string {
  return required('BOT_TOKEN');
}

/**
 * Тот же токен нужен API, чтобы написать продавцу об итогах модерации. Здесь он
 * необязателен: без него объявление всё равно одобрится, просто молча.
 */
export function optionalBotToken(): string | null {
  return process.env.BOT_TOKEN ?? null;
}
