import { Car, ReportReason } from '../types';

/**
 * Адрес бэкенда. Expo штатно прокидывает в бандл переменные с префиксом
 * EXPO_PUBLIC_, поэтому expo-constants и extra в app.json не нужны.
 *
 * Симулятор ходит на localhost нормально. Для физического телефона в .env
 * нужен LAN-адрес машины — localhost там указывает на сам телефон.
 */
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

/** Сервер живёт локально, но сеть всё равно может подвиснуть — не ждём вечно. */
const TIMEOUT_MS = 10000;

export class ApiError extends Error {}

async function get<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${BASE_URL}${path}`, { signal: controller.signal });
    if (!response.ok) throw new ApiError(`${path}: HTTP ${response.status}`);
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    // AbortError и сетевые сбои приводим к одному типу — вызывающему коду
    // важно лишь то, что каталог получить не удалось.
    throw new ApiError(error instanceof Error ? error.message : String(error));
  } finally {
    clearTimeout(timer);
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) throw new ApiError(`${path}: HTTP ${response.status}`);
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(error instanceof Error ? error.message : String(error));
  } finally {
    clearTimeout(timer);
  }
}

/** Весь опубликованный каталог. Фильтрация и колода живут на клиенте. */
export function fetchCars(): Promise<Car[]> {
  return get<Car[]>('/api/cars');
}

export interface ReportInput {
  listingId: string;
  reason: ReportReason;
  comment: string;
  /** Случайная строка из хранилища — вместо аккаунта, которого у покупателя нет. */
  deviceId: string;
}

/**
 * Жалоба на объявление. Авторизация не нужна: каталог смотрят без регистрации,
 * и требовать вход ради жалобы значило бы не получить ни одной.
 *
 * hidden в ответе — объявление уже ушло из каталога, набрав порог жалоб.
 * Клиенту это ничего не меняет (он прячет объявление у себя в любом случае),
 * но пригодится в логах, когда будем разбирать накрутку.
 */
export function sendReport(input: ReportInput): Promise<{ ok: true; hidden: boolean }> {
  return post('/api/reports', input);
}
