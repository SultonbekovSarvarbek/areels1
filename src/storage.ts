import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlockedSeller, Filters, Offer, User, emptyFilters } from './types';
import { ThemeName } from './theme';
import { Lang } from './i18n';

const PREFIX = 'avtolike:';

const KEYS = {
  liked: `${PREFIX}liked`,
  passed: `${PREFIX}passed`,
  filters: `${PREFIX}filters`,
  theme: `${PREFIX}theme`,
  lang: `${PREFIX}lang`,
  user: `${PREFIX}user`,
  offers: `${PREFIX}offers`,
  consent: `${PREFIX}consent`,
  device: `${PREFIX}device`,
  blockedSellers: `${PREFIX}blockedSellers`,
  reported: `${PREFIX}reported`,
};

/** Префикс до переименования приложения: у тестировщиков данные лежат ещё под ним. */
const OLD_PREFIX = 'automatch:';
const oldKey = (key: string) => OLD_PREFIX + key.slice(PREFIX.length);

/** Ключи выпиленных функций — чистим один раз при загрузке. */
const LEGACY_KEYS = ['automatch:testDrive'];

/**
 * Читает новый ключ, а если его нет — забирает значение со старого и переносит.
 * Миграция живёт внутри чтения, а не отдельным шагом на старте: провайдеры темы,
 * языка и сессии грузятся параллельно, и порядок между ними не гарантирован.
 */
async function getItem(key: string): Promise<string | null> {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value !== null) return value;

    const legacy = await AsyncStorage.getItem(oldKey(key));
    if (legacy === null) return null;

    await AsyncStorage.setItem(key, legacy);
    await AsyncStorage.removeItem(oldKey(key));
    return legacy;
  } catch {
    return null;
  }
}

async function readIds(key: string): Promise<string[]> {
  try {
    const raw = await getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

async function writeIds(key: string, ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // Локальное хранилище недоступно — работаем только в памяти.
  }
}

export interface StoredState {
  liked: string[];
  passed: string[];
  filters: Filters;
}

export async function loadState(): Promise<StoredState> {
  AsyncStorage.multiRemove(LEGACY_KEYS).catch(() => {
    // Не смогли подчистить — не повод ломать загрузку.
  });

  const [liked, passed, filtersRaw] = await Promise.all([
    readIds(KEYS.liked),
    readIds(KEYS.passed),
    getItem(KEYS.filters),
  ]);

  let filters = emptyFilters;
  if (filtersRaw) {
    try {
      filters = { ...emptyFilters, ...JSON.parse(filtersRaw) };
    } catch {
      filters = emptyFilters;
    }
  }

  return { liked, passed, filters };
}

export const saveLiked = (ids: string[]) => writeIds(KEYS.liked, ids);
export const savePassed = (ids: string[]) => writeIds(KEYS.passed, ids);

/** null — пользователь тему не выбирал, значит идём за системной. */
export async function loadTheme(): Promise<ThemeName | null> {
  const raw = await getItem(KEYS.theme);
  return raw === 'dark' || raw === 'light' ? raw : null;
}

export async function loadLang(): Promise<Lang | null> {
  const raw = await getItem(KEYS.lang);
  return raw === 'ru' || raw === 'uz' || raw === 'uzc' ? raw : null;
}

export async function saveLang(lang: Lang): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.lang, lang);
  } catch {
    // игнорируем
  }
}

export async function saveTheme(name: ThemeName): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.theme, name);
  } catch {
    // Не сохранилось — тема доживёт до перезапуска и сбросится на системную.
  }
}

async function readJson<T>(key: string, guard: (v: unknown) => v is T): Promise<T | null> {
  try {
    const raw = await getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return guard(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

const isUser = (v: unknown): v is User =>
  !!v && typeof v === 'object' && typeof (v as User).phone === 'string';

const isOffers = (v: unknown): v is Offer[] =>
  Array.isArray(v) && v.every((o) => o && typeof o.carId === 'string' && typeof o.price === 'number');

export const loadUser = () => readJson(KEYS.user, isUser);
export const loadOffers = async () => (await readJson(KEYS.offers, isOffers)) ?? [];

export async function saveUser(user: User | null): Promise<void> {
  try {
    if (user) await AsyncStorage.setItem(KEYS.user, JSON.stringify(user));
    else await AsyncStorage.removeItem(KEYS.user);
  } catch {
    // игнорируем
  }
}

export async function saveOffers(offers: Offer[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.offers, JSON.stringify(offers));
  } catch {
    // игнорируем
  }
}

// ─── Согласие с условиями ───────────────────────────────────────────────────

/**
 * Версия принятых условий. Меняем её, когда правки в legal.ts затрагивают
 * правила поведения, — тогда согласие спросят заново. Косметические правки
 * версию не двигают, иначе экран будет всплывать после каждой опечатки.
 */
export const CONSENT_VERSION = '1';

/** Принял ли пользователь текущую версию условий. */
export async function loadConsent(): Promise<boolean> {
  return (await getItem(KEYS.consent)) === CONSENT_VERSION;
}

export async function saveConsent(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.consent, CONSENT_VERSION);
  } catch {
    // Не записалось — согласие спросят при следующем запуске. Не страшно.
  }
}

// ─── Жалобы и блокировки ────────────────────────────────────────────────────

/**
 * Идентификатор устройства для жалоб. Аккаунта у покупателя нет, а серверу
 * нужно отличать двадцать жалоб от двадцати человек от двадцати нажатий одного.
 * Случайная строка, ни с чем не связанная и никуда, кроме поля deviceId в
 * жалобе, не уходящая.
 */
export async function loadDeviceId(): Promise<string> {
  const saved = await getItem(KEYS.device);
  if (saved) return saved;

  const generated = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  try {
    await AsyncStorage.setItem(KEYS.device, generated);
  } catch {
    // Не сохранился — на следующем запуске выпишем новый. Хуже только тем,
    // что одно устройство сможет пожаловаться на объявление дважды.
  }
  return generated;
}

const isBlockedSellers = (v: unknown): v is BlockedSeller[] =>
  Array.isArray(v) &&
  v.every((s) => s && typeof s.id === 'string' && typeof s.name === 'string');

/** Заблокированные продавцы — с именами, чтобы список в профиле был читаемым. */
export const loadBlockedSellers = async () =>
  (await readJson(KEYS.blockedSellers, isBlockedSellers)) ?? [];

export async function saveBlockedSellers(sellers: BlockedSeller[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.blockedSellers, JSON.stringify(sellers));
  } catch {
    // Не сохранилось — блокировка доживёт до перезапуска.
  }
}

/** Объявления, на которые это устройство уже пожаловалось: их прячем сразу. */
export const loadReported = () => readIds(KEYS.reported);
export const saveReported = (ids: string[]) => writeIds(KEYS.reported, ids);

export async function saveFilters(filters: Filters): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.filters, JSON.stringify(filters));
  } catch {
    // игнорируем
  }
}

export async function clearAll(): Promise<void> {
  try {
    const keys = Object.values(KEYS);
    await AsyncStorage.multiRemove([...keys, ...keys.map(oldKey)]);
  } catch {
    // игнорируем
  }
}
