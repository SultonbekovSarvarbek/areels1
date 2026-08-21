/**
 * Таксономия хранится кодами, а не подписями: значения показываются на трёх
 * языках, и русский текст в данных сделал бы перевод невозможным.
 */
export type BodyType =
  | 'sedan'
  | 'hatchback'
  | 'crossover'
  | 'suv'
  | 'minivan'
  | 'coupe'
  | 'wagon'
  | 'cabrio'
  | 'pickup'
  | 'other';
export type Fuel = 'petrol' | 'gas' | 'diesel' | 'hybrid' | 'electric';
/**
 * Коробка — только механика и автомат: продавец в анкете путает робот с
 * вариатором чаще, чем покупатель их различает. Всё остальное — «Другая».
 */
export type Transmission = 'manual' | 'auto' | 'other';
export type Drive = 'fwd' | 'rwd' | 'awd';
export type SellerType = 'private' | 'dealer';
/** Состояние машины — то, что вынесено на карточку вместо коробки передач. */
export type Condition = 'excellent' | 'good' | 'average' | 'needsRepair';
export type City =
  | 'tashkent'
  | 'samarkand'
  | 'bukhara'
  | 'namangan'
  | 'andijan'
  | 'fergana'
  | 'karshi'
  | 'jizzakh'
  | 'termez';

export type SwipeDirection = 'left' | 'right';

/**
 * Причины жалобы на объявление. Коды те же, что в схеме базы
 * (server/prisma/schema.prisma, enum ReportReason): сервер принимает именно их,
 * а подписи на трёх языках живут в i18n.
 */
export type ReportReason =
  | 'fraud'
  | 'notForSale'
  | 'wrongInfo'
  | 'foreignPhotos'
  | 'offensive'
  | 'spam'
  | 'other';

/**
 * Заблокированный продавец. Имя храним рядом с идентификатором, а не достаём из
 * каталога: объявления заблокированного из каталога как раз и вычищены, и
 * список в профиле показывал бы одни идентификаторы.
 */
export interface BlockedSeller {
  id: string;
  name: string;
}

/** Порядок кнопок в шторке жалобы — от самого частого к «Другое». */
export const REPORT_REASONS: ReportReason[] = [
  'fraud',
  'notForSale',
  'wrongInfo',
  'foreignPhotos',
  'offensive',
  'spam',
  'other',
];

export interface Seller {
  /**
   * Идентификатор продавца в базе. Нужен для локальной блокировки: заблокировав
   * продавца, покупатель перестаёт видеть все его объявления, а не одно
   * (src/ModerationContext.tsx).
   */
  id: string;
  name: string;
  type: SellerType;
  /** Номер в формате E.164, без пробелов: +998901234567 */
  phone: string;
  /** Username без «@». Необязателен — телеграм есть не у всех. */
  telegram?: string;
}

export interface Car {
  id: string;
  brand: string;
  model: string;
  year: number;
  /** Цена в долларах США */
  price: number;
  /** Пробег в километрах */
  mileage: number;
  city: City;
  bodyType: BodyType;
  fuel: Fuel;
  transmission: Transmission;
  drive: Drive;
  /** Объём двигателя в литрах */
  engine: number;
  /** Мощность, л.с. Необязательна: бот её не спрашивает. */
  power?: number;
  color: string;
  condition: Condition;
  /** Сколько было владельцев по техпаспорту. Необязательно: у объявлений,
   *  заведённых до появления поля, его нет. */
  owners?: number;
  photos: string[];
  tags: string[];
  /** Готов ли продавец торговаться */
  negotiable: boolean;
  description: string;
  seller: Seller;
  /** Выгодное предложение — показываем экран «Мэтч» */
  hot?: boolean;
}

export interface User {
  /** E.164, без пробелов. Он же идентификатор аккаунта. */
  phone: string;
  name: string;
  /** ISO-строка, чтобы переживала JSON.stringify без потерь. */
  signedUpAt: string;
}

export interface Offer {
  id: string;
  carId: string;
  /** Предложенная цена в долларах США */
  price: number;
  comment?: string;
  createdAt: string;
  /** Пока единственный статус: ответить продавцу нечем, бэкенда нет. */
  status: 'sent';
}

export interface Filters {
  brands: string[];
  bodyTypes: BodyType[];
  transmissions: Transmission[];
  maxPrice: number | null;
  minYear: number | null;
}

export const emptyFilters: Filters = {
  brands: [],
  bodyTypes: [],
  transmissions: [],
  maxPrice: null,
  minYear: null,
};
