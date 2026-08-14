/**
 * Телеграм-бот — единственный способ завести объявление: в приложении экрана
 * публикации нет и не планируется, продавцу проще прислать фото в чат.
 *
 * Бот пишет в ту же базу, что читает API, поэтому опубликованное объявление
 * появляется в колоде сразу после перезагрузки каталога в приложении.
 *
 * Бот говорит на тех же трёх языках, что и приложение (ru/uz/uzc). Тексты —
 * в ./text.ts, выбранный язык хранится у продавца в базе: сессия живёт в памяти
 * процесса и не переживает перезапуск, а переспрашивать язык каждый раз незачем.
 *
 * Переводится только интерфейс. Свободный ввод — марка, модель, цвет, описание,
 * имя — уходит в базу как есть, поэтому «Oq» продавца, заполнявшего анкету
 * по-узбекски, покупатель увидит как «Oq» даже с русским приложением. Значений
 * из перечислений это не касается: они хранятся кодами и переводятся клиентом.
 *
 * Состояние анкеты живёт в памяти процесса (session по умолчанию). Перезапуск
 * бота сбрасывает незаконченные анкеты — для дев-режима с tsx watch это
 * осознанный размен: внешнее хранилище сессий пока не окупается.
 */

import { Bot, GrammyError, HttpError, Keyboard, InlineKeyboard, session, type Context, type SessionFlavor } from 'grammy';

import type {
  BodyType,
  City,
  Condition,
  Drive,
  Fuel,
  SellerType,
  Transmission,
} from '../../src/types.ts';
import type { ListingStatus } from '@prisma/client';

import { db } from './db.ts';
import { botToken } from './env.ts';
import { hidePlates } from './plate.ts';
import { ensureBucket, uploadPhoto } from './s3.ts';
import {
  COLORS,
  LANGS,
  LANG_LABEL,
  LANG_PROMPT,
  TEXT,
  enums,
  type BotText,
  type Lang,
} from './text.ts';

/**
 * Марки кнопками, а не текстом: в приложении марка — это строка, и фильтр
 * группирует объявления точным совпадением. «шевроле», «Chevrolet» и «CHEVROLET»
 * от разных продавцов расползлись бы по трём кнопкам фильтра.
 *
 * Список — то, что реально ездит по Узбекистану; остальное продавец допишет
 * руками через «Другая марка». Переводить список незачем: марки латиницей
 * одинаковы на всех трёх языках.
 */
const BRANDS = [
  'Chevrolet',
  'Ravon',
  'Daewoo',
  'Kia',
  'Hyundai',
  'Toyota',
  'Lada',
  'Nissan',
  'BYD',
  'Changan',
  'Mercedes-Benz',
  'BMW',
  'Volkswagen',
  'Lexus',
  'Honda',
  'Renault',
];

const MAX_PHOTOS = 10;

/**
 * Живой человек на случай, когда бот не помог: отклонённое объявление, чужой
 * номер в чужом объявлении, просьба удалить данные. Только телеграм — звонки
 * поддержка не принимает.
 */
const SUPPORT = { telegram: '@avtolike_manager' };

/** Ключи текстов-строк: по ним узнаём нажатую кнопку. */
type ButtonKey = {
  [K in keyof BotText]: BotText[K] extends string ? K : never;
}[keyof BotText];

/**
 * Кнопку сверяем со всеми языками сразу, а не только с текущим: у продавца,
 * сменившего язык посреди анкеты, в чате остаётся клавиатура на старом языке,
 * и нажатие по ней должно сработать.
 */
function isButton(text: string, key: ButtonKey): boolean {
  return LANGS.some((lang) => TEXT[lang][key] === text);
}

interface Draft {
  brand: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  city: City;
  bodyType: BodyType;
  fuel: Fuel;
  transmission: Transmission;
  drive: Drive;
  engine: number;
  color: string;
  condition: Condition;
  owners: number;
  /** Срок разрешения на тонировку словами продавца; null — тонировки нет. */
  tint: string | null;
  negotiable: boolean;
  description: string;
}

interface Profile {
  phone?: string;
  name?: string;
  type?: SellerType;
}

interface SessionData {
  /** Идентификаторы шагов текущей анкеты. Пустой список — анкета не начата. */
  steps: string[];
  index: number;
  draft: Partial<Draft>;
  photos: string[];
  profile: Profile;
  /** Ждём ли подтверждения публикации вместо ответа на очередной вопрос. */
  confirming: boolean;
  /**
   * Продавец нажал «Другая марка» / «Другой цвет» — текущий шаг ждёт текст,
   * а не нажатие кнопки. Сбрасывается при переходе к следующему вопросу.
   */
  freeInput: boolean;
  lang: Lang;
  /** Ждём выбор языка вместо ответа на текущий вопрос. */
  choosingLang: boolean;
  /** Поднимали ли язык из базы: после перезапуска сессия пустая. */
  langLoaded: boolean;
}

function emptySession(): SessionData {
  return {
    steps: [],
    index: 0,
    draft: {},
    photos: [],
    profile: {},
    confirming: false,
    freeInput: false,
    lang: 'ru',
    choosingLang: false,
    langLoaded: false,
  };
}

type BotContext = Context & SessionFlavor<SessionData>;

// ─── Разбор ответов ──────────────────────────────────────────────────────────

function keyboard(labels: string[], perRow: number, lang: Lang): Keyboard {
  const kb = new Keyboard();
  labels.forEach((label, i) => {
    kb.text(label);
    if ((i + 1) % perRow === 0) kb.row();
  });
  return kb.row().text(TEXT[lang].cancel).resized();
}

/**
 * Шаг с выбором из перечисления: клавиатура из подписей, ответ — код. Подписи
 * берём из словарей приложения, ответ разбираем по всем языкам сразу.
 */
function choice<T extends string>(pick: (lang: Lang) => Record<T, string>, perRow = 2) {
  return {
    keyboard: (lang: Lang) => keyboard(Object.values(pick(lang)) as string[], perRow, lang),
    parse: (text: string): T | undefined => {
      const needle = text.trim();
      for (const lang of LANGS) {
        const found = (Object.entries(pick(lang)) as [T, string][]).find(
          ([, label]) => label === needle,
        );
        if (found) return found[0];
      }
      return undefined;
    },
  };
}

const textKeyboard = (lang: Lang) => new Keyboard().text(TEXT[lang].cancel).resized();
const skipKeyboard = (lang: Lang) =>
  new Keyboard().text(TEXT[lang].skip).row().text(TEXT[lang].cancel).resized();

/** Языки подписаны на себе же — выбирающему ещё нечего переводить. */
const langKeyboard = new Keyboard()
  .text(LANG_LABEL.ru)
  .row()
  .text(LANG_LABEL.uz)
  .row()
  .text(LANG_LABEL.uzc)
  .resized();

function parseLang(text: string): Lang | undefined {
  const needle = text.trim();
  return LANGS.find((lang) => LANG_LABEL[lang] === needle);
}

/**
 * Числа продавцы пишут как удобно: «12 500», «12500$», «1,6». Приводим к числу
 * сами — переспрашивать из-за пробела значит терять человека на середине анкеты.
 */
function parseNumber(text: string, min: number, max: number, float = false): number | undefined {
  const cleaned = text.replace(/[\s_'`$]/g, '').replace(',', '.');
  const value = float ? Number.parseFloat(cleaned) : Number.parseInt(cleaned, 10);
  if (!Number.isFinite(value) || value < min || value > max) return undefined;
  return float ? Math.round(value * 10) / 10 : value;
}

/**
 * Телефон приводим к E.164 без пробелов — в этом виде его ждёт клиент
 * (src/types.ts) и на него завязан ключ продавца в сиде.
 */
function parsePhone(text: string): string | undefined {
  const digits = text.replace(/\D/g, '');
  if (digits.length === 9) return `+998${digits}`; // местный номер без кода страны
  if (digits.length === 12 && digits.startsWith('998')) return `+${digits}`;
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  return undefined;
}

/**
 * Марка попадает в фильтры приложения как строка и группируется точным
 * совпадением: «chevrolet» и «Chevrolet» стали бы двумя разными марками.
 */
function normalizeName(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ─── Шаги анкеты ─────────────────────────────────────────────────────────────

/**
 * Ответ шага: null — принято, идём дальше. Иначе остаёмся на этом же вопросе и
 * пишем продавцу, что не так (или чего теперь ждём — как после «Другая марка»).
 */
type StepReply = string | { text: string; keyboard: Keyboard } | null;

interface Step {
  prompt: (lang: Lang) => string;
  keyboard: (lang: Lang) => Keyboard;
  apply: (text: string, s: SessionData) => StepReply;
}

/**
 * Шаг «выберите кнопкой или напишите своё». Список никогда не полон — марок и
 * цветов больше, чем помещается на клавиатуру, — но кнопки задают канонические
 * написания для частых значений, а свободный ввод остаётся запасным выходом.
 */
function openChoice(config: {
  prompt: (lang: Lang) => string;
  options: (lang: Lang) => string[];
  perRow: number;
  otherLabel: ButtonKey;
  otherPrompt: (lang: Lang) => string;
  /** Проверка того, что продавец написал руками. */
  validate: (value: string, lang: Lang) => string | null;
  assign: (value: string, s: SessionData) => void;
}): Step {
  return {
    prompt: config.prompt,
    keyboard: (lang) =>
      keyboard([...config.options(lang), TEXT[lang][config.otherLabel]], config.perRow, lang),
    apply: (text, s) => {
      const { lang } = s;
      if (!s.freeInput) {
        if (isButton(text, config.otherLabel)) {
          s.freeInput = true;
          return { text: config.otherPrompt(lang), keyboard: textKeyboard(lang) };
        }
        // Кнопки принимаем на любом языке: список цветов у каждого свой.
        if (!LANGS.some((l) => config.options(l).includes(text))) {
          return TEXT[lang].chooseOrOther(TEXT[lang][config.otherLabel]);
        }
        config.assign(text, s);
        return null;
      }

      const value = normalizeName(text);
      const error = config.validate(value, lang);
      if (error) return error;

      config.assign(value, s);
      return null;
    },
  };
}

const cityChoice = choice<City>((lang) => enums(lang).city, 3);
const bodyChoice = choice<BodyType>((lang) => enums(lang).bodyType);
const fuelChoice = choice<Fuel>((lang) => enums(lang).fuel, 3);
const transmissionChoice = choice<Transmission>((lang) => enums(lang).transmission);
const driveChoice = choice<Drive>((lang) => enums(lang).drive, 3);
const conditionChoice = choice<Condition>((lang) => enums(lang).condition);
const sellerTypeChoice = choice<SellerType>((lang) => enums(lang).sellerType);

const negotiableChoice = {
  keyboard: (lang: Lang) => keyboard([TEXT[lang].bargainYes, TEXT[lang].bargainNo], 1, lang),
  parse: (text: string): boolean | undefined => {
    if (isButton(text, 'bargainYes')) return true;
    if (isButton(text, 'bargainNo')) return false;
    return undefined;
  },
};

const CURRENT_YEAR = new Date().getFullYear();

const STEPS: Record<string, Step> = {
  phone: {
    prompt: (lang) => TEXT[lang].askPhone,
    keyboard: (lang) =>
      new Keyboard().requestContact(TEXT[lang].shareContact).row().text(TEXT[lang].cancel).resized(),
    apply: (text, s) => {
      const phone = parsePhone(text);
      if (!phone) return TEXT[s.lang].errPhone;
      s.profile.phone = phone;
      return null;
    },
  },
  name: {
    prompt: (lang) => TEXT[lang].askName,
    keyboard: textKeyboard,
    apply: (text, s) => {
      const name = text.trim();
      if (name.length < 2 || name.length > 40) return TEXT[s.lang].errName;
      s.profile.name = name;
      return null;
    },
  },
  sellerType: {
    prompt: (lang) => TEXT[lang].askSellerType,
    keyboard: sellerTypeChoice.keyboard,
    apply: (text, s) => {
      const type = sellerTypeChoice.parse(text);
      if (!type) return TEXT[s.lang].chooseButton;
      s.profile.type = type;
      return null;
    },
  },

  brand: openChoice({
    prompt: (lang) => TEXT[lang].askBrand,
    options: () => BRANDS,
    perRow: 3,
    otherLabel: 'otherBrand',
    otherPrompt: (lang) => TEXT[lang].askBrandFree,
    validate: (value, lang) => (value.length < 2 || value.length > 30 ? TEXT[lang].errBrand : null),
    assign: (value, s) => {
      s.draft.brand = value;
    },
  }),
  model: {
    prompt: (lang) => TEXT[lang].askModel,
    keyboard: textKeyboard,
    apply: (text, s) => {
      const model = text.trim().replace(/\s+/g, ' ');
      if (model.length < 1 || model.length > 30) return TEXT[s.lang].errModel;
      s.draft.model = model;
      return null;
    },
  },
  year: {
    prompt: (lang) => TEXT[lang].askYear,
    keyboard: textKeyboard,
    apply: (text, s) => {
      const year = parseNumber(text, 1950, CURRENT_YEAR + 1);
      if (!year) return TEXT[s.lang].errYear(CURRENT_YEAR + 1);
      s.draft.year = year;
      return null;
    },
  },
  price: {
    prompt: (lang) => TEXT[lang].askPrice,
    keyboard: textKeyboard,
    apply: (text, s) => {
      const price = parseNumber(text, 100, 1_000_000);
      if (!price) return TEXT[s.lang].errPrice;
      s.draft.price = price;
      return null;
    },
  },
  mileage: {
    prompt: (lang) => TEXT[lang].askMileage,
    keyboard: textKeyboard,
    apply: (text, s) => {
      const mileage = parseNumber(text, 0, 1_500_000);
      if (mileage === undefined) return TEXT[s.lang].errMileage;
      s.draft.mileage = mileage;
      return null;
    },
  },
  owners: {
    /**
     * Кнопки — только частые ответы, а редкое «7» продавец допишет текстом:
     * parseNumber одинаково разбирает и нажатие кнопки, и ручной ввод.
     * «4+» уходит в базу четвёркой — точное число после четвёртого владельца
     * покупателя уже не интересует.
     */
    prompt: (lang) => TEXT[lang].askOwners,
    keyboard: (lang) => keyboard(['1', '2', '3', '4+'], 4, lang),
    apply: (text, s) => {
      const owners = parseNumber(text, 1, 20);
      if (!owners) return TEXT[s.lang].errOwners;
      s.draft.owners = owners;
      return null;
    },
  },
  condition: {
    prompt: (lang) => TEXT[lang].askCondition,
    keyboard: conditionChoice.keyboard,
    apply: (text, s) => {
      const condition = conditionChoice.parse(text);
      if (!condition) return TEXT[s.lang].chooseButton;
      s.draft.condition = condition;
      return null;
    },
  },
  city: {
    prompt: (lang) => TEXT[lang].askCity,
    keyboard: cityChoice.keyboard,
    apply: (text, s) => {
      const city = cityChoice.parse(text);
      if (!city) return TEXT[s.lang].chooseButton;
      s.draft.city = city;
      return null;
    },
  },
  bodyType: {
    prompt: (lang) => TEXT[lang].askBody,
    keyboard: bodyChoice.keyboard,
    apply: (text, s) => {
      const bodyType = bodyChoice.parse(text);
      if (!bodyType) return TEXT[s.lang].chooseButton;
      s.draft.bodyType = bodyType;
      return null;
    },
  },
  fuel: {
    prompt: (lang) => TEXT[lang].askFuel,
    keyboard: fuelChoice.keyboard,
    apply: (text, s) => {
      const fuel = fuelChoice.parse(text);
      if (!fuel) return TEXT[s.lang].chooseButton;
      s.draft.fuel = fuel;
      return null;
    },
  },
  transmission: {
    prompt: (lang) => TEXT[lang].askTransmission,
    keyboard: transmissionChoice.keyboard,
    apply: (text, s) => {
      const transmission = transmissionChoice.parse(text);
      if (!transmission) return TEXT[s.lang].chooseButton;
      s.draft.transmission = transmission;
      return null;
    },
  },
  drive: {
    prompt: (lang) => TEXT[lang].askDrive,
    keyboard: driveChoice.keyboard,
    apply: (text, s) => {
      const drive = driveChoice.parse(text);
      if (!drive) return TEXT[s.lang].chooseButton;
      s.draft.drive = drive;
      return null;
    },
  },
  engine: {
    prompt: (lang) => TEXT[lang].askEngine,
    keyboard: textKeyboard,
    apply: (text, s) => {
      const engine = parseNumber(text, 0, 8, true);
      if (engine === undefined) return TEXT[s.lang].errEngine;
      s.draft.engine = engine;
      return null;
    },
  },
  color: openChoice({
    prompt: (lang) => TEXT[lang].askColor,
    options: (lang) => COLORS[lang],
    perRow: 3,
    otherLabel: 'otherColor',
    otherPrompt: (lang) => TEXT[lang].askColorFree,
    validate: (value, lang) => (value.length < 3 || value.length > 20 ? TEXT[lang].errColor : null),
    assign: (value, s) => {
      s.draft.color = value;
    },
  }),
  /**
   * «Нет» закрывает вопрос сразу, «Есть» переводит шаг в свободный ввод: дальше
   * спрашиваем срок разрешения — покупателю важно не то, какая плёнка стоит,
   * а до какого месяца с ней можно ездить. Срок принимаем текстом, а не датой:
   * продавец помнит его как «до марта» или «до конца года», и переспрашивать
   * ради формата значит терять человека на середине анкеты.
   */
  tint: {
    prompt: (lang) => TEXT[lang].askTint,
    keyboard: (lang) => keyboard([TEXT[lang].tintYes, TEXT[lang].tintNo], 2, lang),
    apply: (text, s) => {
      const { lang } = s;

      if (!s.freeInput) {
        if (isButton(text, 'tintNo')) {
          s.draft.tint = null;
          return null;
        }
        if (isButton(text, 'tintYes')) {
          s.freeInput = true;
          return { text: TEXT[lang].askTintFree, keyboard: textKeyboard(lang) };
        }
        return TEXT[lang].chooseButton;
      }

      const value = text.trim().replace(/\s+/g, ' ');
      if (value.length < 2 || value.length > 100) return TEXT[lang].errTint;
      s.draft.tint = value;
      return null;
    },
  },
  negotiable: {
    prompt: (lang) => TEXT[lang].askNegotiable,
    keyboard: negotiableChoice.keyboard,
    apply: (text, s) => {
      const answer = negotiableChoice.parse(text);
      if (answer === undefined) return TEXT[s.lang].chooseButton;
      s.draft.negotiable = answer;
      return null;
    },
  },
  description: {
    prompt: (lang) => TEXT[lang].askDescription,
    keyboard: skipKeyboard,
    apply: (text, s) => {
      const description = isButton(text.trim(), 'skip') ? '' : text.trim();
      if (description.length > 1000) return TEXT[s.lang].errDescription;
      s.draft.description = description;
      return null;
    },
  },

  /**
   * Фото — единственный шаг, который принимает не текст. Он остаётся в списке,
   * чтобы движок анкеты знал, где мы находимся, но apply тут не вызывается:
   * фотографии ловит отдельный обработчик, а текстом принимается только «Готово».
   */
  photos: {
    prompt: (lang) => TEXT[lang].askPhotos(MAX_PHOTOS, TEXT[lang].done),
    keyboard: (lang) => new Keyboard().text(TEXT[lang].done).row().text(TEXT[lang].cancel).resized(),
    apply: () => null,
  },
};

const CAR_STEPS = [
  'brand',
  'model',
  'year',
  'price',
  'mileage',
  'owners',
  'condition',
  'city',
  'bodyType',
  'fuel',
  'transmission',
  'drive',
  'engine',
  'color',
  'tint',
  'negotiable',
  'description',
  'photos',
];
const PROFILE_STEPS = ['phone', 'name', 'sellerType'];

// ─── Движок анкеты ───────────────────────────────────────────────────────────

function currentStep(s: SessionData): Step | undefined {
  const id = s.steps[s.index];
  return id ? STEPS[id] : undefined;
}

function currentStepId(s: SessionData): string | undefined {
  return s.steps[s.index];
}

async function askCurrent(ctx: BotContext): Promise<void> {
  const step = currentStep(ctx.session);
  if (!step) return;
  const { lang } = ctx.session;
  await ctx.reply(step.prompt(lang), { reply_markup: step.keyboard(lang) });
}

function money(value: number): string {
  return `${value.toLocaleString('ru-RU')} $`;
}

function summary(s: SessionData): string {
  const d = s.draft as Draft;
  const t = TEXT[s.lang];
  const e = enums(s.lang);
  return [
    `<b>${d.brand} ${d.model}, ${d.year}</b>`,
    `${money(d.price)}${d.negotiable ? ` (${t.summaryBargain})` : ''}`,
    `${d.mileage.toLocaleString('ru-RU')} ${t.unitKm} · ${e.condition[d.condition]} · ${e.city[d.city]}`,
    `${e.bodyType[d.bodyType]} · ${e.fuel[d.fuel]} · ${e.transmission[d.transmission]} · ${e.drive[d.drive]}`,
    `${d.engine} ${t.unitL} · ${d.color} · ${t.owners(d.owners)}`,
    `${t.summaryTint}: ${d.tint ?? t.tintNo}`,
    d.description ? `\n${d.description}` : '',
    `\n${t.summaryPhotos}: ${s.photos.length}`,
    `${t.summarySeller}: ${s.profile.name}, ${s.profile.phone}`,
  ]
    .filter(Boolean)
    .join('\n');
}

const confirmKeyboard = (lang: Lang) =>
  new Keyboard().text(TEXT[lang].publish).row().text(TEXT[lang].cancel).resized();

async function showConfirm(ctx: BotContext): Promise<void> {
  ctx.session.confirming = true;
  await ctx.reply(summary(ctx.session), {
    parse_mode: 'HTML',
    reply_markup: confirmKeyboard(ctx.session.lang),
  });
}

/** Переходит к следующему вопросу, а после последнего — к подтверждению. */
async function advance(ctx: BotContext): Promise<void> {
  ctx.session.index += 1;
  ctx.session.freeInput = false;
  if (ctx.session.index >= ctx.session.steps.length) {
    await showConfirm(ctx);
    return;
  }
  await askCurrent(ctx);
}

function reset(ctx: BotContext): void {
  const { profile, lang, langLoaded } = ctx.session;
  // Профиль и язык переживают отмену: спрашивать их каждый раз незачем.
  Object.assign(ctx.session, emptySession(), { profile, lang, langLoaded });
}

/**
 * Язык — третьей кнопкой, а не только командой /lang: команду видно лишь в
 * списке за синей кнопкой телеграма, и продавец, которому бот отвечает на чужом
 * языке, туда не полезет.
 */
const menuKeyboard = (lang: Lang) =>
  new Keyboard()
    .text(TEXT[lang].menuNew)
    .row()
    .text(TEXT[lang].menuMy)
    .row()
    .text(TEXT[lang].menuLang)
    .text(TEXT[lang].menuSupport)
    .resized();

/** Контакт поддержки: хэндлом в тексте и кнопкой, ведущей прямо в чат. */
async function showSupport(ctx: BotContext): Promise<void> {
  const { lang } = ctx.session;
  await ctx.reply(TEXT[lang].supportText(SUPPORT.telegram), {
    reply_markup: new InlineKeyboard().url(
      TEXT[lang].supportWrite,
      `https://t.me/${SUPPORT.telegram.slice(1)}`,
    ),
  });
}

// ─── Язык ────────────────────────────────────────────────────────────────────

async function askLang(ctx: BotContext): Promise<void> {
  ctx.session.choosingLang = true;
  await ctx.reply(LANG_PROMPT, { reply_markup: langKeyboard });
}

/**
 * Язык в базе — источник правды: сессия обнуляется при перезапуске бота, и без
 * записи знакомый продавец каждый раз снова получал бы русский интерфейс.
 */
async function saveLang(telegramId: bigint, lang: Lang): Promise<void> {
  // updateMany, а не update: продавца может ещё не быть — строка заводится
  // только при первой публикации, а язык выбирается раньше.
  await db.seller.updateMany({ where: { telegramId }, data: { lang } });
}

// ─── Публикация ──────────────────────────────────────────────────────────────

async function publish(ctx: BotContext): Promise<void> {
  const s = ctx.session;
  const d = s.draft as Draft;
  const telegramId = BigInt(ctx.from!.id);

  const sellerData = {
    telegramId,
    name: s.profile.name!,
    type: s.profile.type!,
    phone: s.profile.phone!,
    telegramUsername: ctx.from!.username ?? null,
    lang: s.lang,
  };

  // upsert по telegramId: второй раз тот же продавец не должен раздваиваться,
  // а имя, телефон и язык могли обновиться с прошлого объявления.
  const seller = await db.seller.upsert({
    where: { telegramId },
    update: {
      name: sellerData.name,
      type: sellerData.type,
      phone: sellerData.phone,
      telegramUsername: sellerData.telegramUsername,
      lang: sellerData.lang,
    },
    create: sellerData,
  });

  const listing = await db.listing.create({
    data: {
      sellerId: seller.id,
      brand: d.brand,
      model: d.model,
      year: d.year,
      price: d.price,
      mileage: d.mileage,
      city: d.city,
      bodyType: d.bodyType,
      fuel: d.fuel,
      transmission: d.transmission,
      drive: d.drive,
      engine: d.engine,
      color: d.color,
      condition: d.condition,
      owners: d.owners,
      tint: d.tint,
      tags: [],
      negotiable: d.negotiable,
      description: d.description,
      photos: { create: s.photos.map((url, sortOrder) => ({ url, sortOrder })) },
    },
  });

  const { lang } = s;
  reset(ctx);
  await ctx.reply(TEXT[lang].published(listing.id), {
    parse_mode: 'HTML',
    reply_markup: menuKeyboard(lang),
  });
}

// ─── Мои объявления ──────────────────────────────────────────────────────────

function listingKeyboard(id: string, status: ListingStatus, lang: Lang): InlineKeyboard {
  const kb = new InlineKeyboard();

  // Снимать с показа и возвращать можно только то, что модерацию уже прошло:
  // объявление на проверке в каталоге и так не показано, а отклонённое —
  // тем более. Им остаётся одно действие: удалить.
  if (status === 'published' || status === 'archived') {
    const archived = status === 'archived';
    kb.text(archived ? TEXT[lang].btnShow : TEXT[lang].btnHide, `${archived ? 'pub' : 'arc'}:${id}`);
  }

  return kb.text(TEXT[lang].btnDelete, `del:${id}`);
}

/** Приписка под ценой: чем объявление сейчас является для продавца. */
function statusNote(
  status: ListingStatus,
  rejectionReason: string | null,
  lang: Lang,
): string {
  if (status === 'archived') return TEXT[lang].myArchived;
  if (status === 'pending') return TEXT[lang].myPending;
  if (status === 'rejected') return TEXT[lang].myRejected(rejectionReason ?? '—');
  return '';
}

async function showMyListings(ctx: BotContext): Promise<void> {
  const { lang } = ctx.session;
  const telegramId = BigInt(ctx.from!.id);
  const listings = await db.listing.findMany({
    where: { seller: { telegramId } },
    orderBy: { createdAt: 'desc' },
    include: { photos: { orderBy: { sortOrder: 'asc' }, take: 1 } },
  });

  if (listings.length === 0) {
    await ctx.reply(TEXT[lang].myEmpty, { reply_markup: menuKeyboard(lang) });
    return;
  }

  for (const listing of listings) {
    const note = statusNote(listing.status, listing.rejectionReason, lang);
    const title = `<b>${listing.brand} ${listing.model}, ${listing.year}</b>\n${money(listing.price)}${
      note ? `\n<i>${note}</i>` : ''
    }`;
    await ctx.reply(title, {
      parse_mode: 'HTML',
      reply_markup: listingKeyboard(listing.id, listing.status, lang),
    });
  }
}

// ─── Бот ─────────────────────────────────────────────────────────────────────

const bot = new Bot<BotContext>(botToken());

bot.use(session({ initial: emptySession }));

/** Язык знакомого продавца поднимаем из базы один раз на сессию. */
bot.use(async (ctx, next) => {
  const s = ctx.session;
  if (!s.langLoaded && ctx.from) {
    const seller = await db.seller.findUnique({
      where: { telegramId: BigInt(ctx.from.id) },
      select: { lang: true },
    });
    if (seller) s.lang = seller.lang;
    s.langLoaded = true;
  }
  await next();
});

bot.command('start', async (ctx) => {
  reset(ctx);

  const known = await db.seller.findUnique({
    where: { telegramId: BigInt(ctx.from!.id) },
    select: { lang: true },
  });

  // Незнакомого продавца сперва спрашиваем о языке: на каком показывать
  // приветствие и меню, мы ещё не знаем.
  if (!known) {
    await askLang(ctx);
    return;
  }

  ctx.session.lang = known.lang;
  await ctx.reply(TEXT[known.lang].start, { reply_markup: menuKeyboard(known.lang) });
});

bot.command('lang', askLang);

/** Поддержка доступна и посреди анкеты: шаг от этого не сбивается. */
bot.command('support', showSupport);

bot.command('cancel', async (ctx) => {
  reset(ctx);
  await ctx.reply(TEXT[ctx.session.lang].formCancelled, {
    reply_markup: menuKeyboard(ctx.session.lang),
  });
});

bot.command('my', showMyListings);

/** Начало анкеты: профиль спрашиваем только у незнакомого продавца. */
async function startForm(ctx: BotContext): Promise<void> {
  const known = await db.seller.findUnique({ where: { telegramId: BigInt(ctx.from!.id) } });
  if (known) {
    ctx.session.profile = { phone: known.phone, name: known.name, type: known.type };
    ctx.session.lang = known.lang;
  }

  ctx.session.steps = [...(known ? [] : PROFILE_STEPS), ...CAR_STEPS];
  ctx.session.index = 0;
  ctx.session.draft = {};
  ctx.session.photos = [];
  ctx.session.confirming = false;
  ctx.session.freeInput = false;

  await askCurrent(ctx);
}

bot.command('new', startForm);

/** Контакт приходит отдельным типом сообщения — принимаем его на шаге телефона. */
bot.on('message:contact', async (ctx) => {
  if (currentStepId(ctx.session) !== 'phone') return;

  const phone = parsePhone(ctx.message.contact.phone_number);
  if (!phone) {
    await ctx.reply(TEXT[ctx.session.lang].errPhone);
    return;
  }

  ctx.session.profile.phone = phone;
  await advance(ctx);
});

bot.on('message:photo', async (ctx) => {
  const s = ctx.session;
  const t = TEXT[s.lang];

  if (currentStepId(s) !== 'photos') {
    await ctx.reply(t.photoWrongStep(t.menuNew));
    return;
  }

  if (s.photos.length >= MAX_PHOTOS) {
    await ctx.reply(t.photoTooMany(MAX_PHOTOS, t.done));
    return;
  }

  // Телеграм присылает несколько размеров одной картинки; последний — самый большой.
  const photo = ctx.message.photo[ctx.message.photo.length - 1];
  const file = await ctx.api.getFile(photo.file_id);
  if (!file.file_path) {
    await ctx.reply(t.photoNoFile);
    return;
  }

  const response = await fetch(
    `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`,
  );
  if (!response.ok) {
    await ctx.reply(t.photoDownloadFailed);
    return;
  }

  // Госномер замазываем до загрузки: в хранилище не должно быть оригинала,
  // ссылка на который потом уедет в приложение как есть.
  const photoBytes = await hidePlates(new Uint8Array(await response.arrayBuffer()));
  const url = await uploadPhoto(photoBytes);
  s.photos.push(url);

  // Фото, присланное уже после «Готово», — обычное дело: показываем сводку
  // заново, иначе продавец подтвердит публикацию по устаревшему числу фото.
  if (s.confirming) {
    await showConfirm(ctx);
    return;
  }

  // Альбом приходит пачкой отдельных сообщений — отвечаем коротко на каждое.
  await ctx.reply(t.photoAccepted(s.photos.length, MAX_PHOTOS));
});

bot.on('message:text', async (ctx) => {
  const s = ctx.session;
  const text = ctx.message.text.trim();

  if (s.choosingLang) {
    const lang = parseLang(text);
    if (!lang) {
      await ctx.reply(LANG_PROMPT, { reply_markup: langKeyboard });
      return;
    }

    s.lang = lang;
    s.choosingLang = false;
    await saveLang(BigInt(ctx.from.id), lang);
    await ctx.reply(TEXT[lang].langChanged, { reply_markup: menuKeyboard(lang) });

    // Язык могли сменить посреди анкеты — повторяем текущий вопрос на новом.
    if (currentStepId(s)) await askCurrent(ctx);
    else await ctx.reply(TEXT[lang].start, { reply_markup: menuKeyboard(lang) });
    return;
  }

  const t = TEXT[s.lang];

  if (isButton(text, 'cancel')) {
    reset(ctx);
    await ctx.reply(t.cancelled, { reply_markup: menuKeyboard(s.lang) });
    return;
  }

  if (s.confirming) {
    if (!isButton(text, 'publish')) {
      await ctx.reply(t.confirmHint(t.publish, t.cancel));
      return;
    }
    await publish(ctx);
    return;
  }

  const stepId = currentStepId(s);

  if (!stepId) {
    if (isButton(text, 'menuNew')) {
      await startForm(ctx);
      return;
    }
    if (isButton(text, 'menuMy')) {
      await showMyListings(ctx);
      return;
    }
    if (isButton(text, 'menuLang')) {
      await askLang(ctx);
      return;
    }
    if (isButton(text, 'menuSupport')) {
      await showSupport(ctx);
      return;
    }
    await ctx.reply(t.chooseAction, { reply_markup: menuKeyboard(s.lang) });
    return;
  }

  if (stepId === 'photos') {
    if (!isButton(text, 'done')) {
      await ctx.reply(t.photoOrDone(t.done));
      return;
    }
    if (s.photos.length === 0) {
      // Без фото объявление не выдаётся API (см. api.ts) — до базы его не пускаем.
      await ctx.reply(t.photoNeedOne);
      return;
    }
    await showConfirm(ctx);
    return;
  }

  const reply = STEPS[stepId]!.apply(text, s);
  if (reply) {
    const { text: message, keyboard: markup } =
      typeof reply === 'string' ? { text: reply, keyboard: undefined } : reply;
    await ctx.reply(message, markup ? { reply_markup: markup } : undefined);
    return;
  }

  await advance(ctx);
});

bot.on('callback_query:data', async (ctx) => {
  const { lang } = ctx.session;
  const [action, id] = ctx.callbackQuery.data.split(':');
  if (!id) {
    await ctx.answerCallbackQuery();
    return;
  }

  // Кнопка живёт в чате вечно, поэтому владельца проверяем на каждое нажатие,
  // а не полагаемся на то, что сообщение показано своему продавцу.
  const listing = await db.listing.findFirst({
    where: { id, seller: { telegramId: BigInt(ctx.from.id) } },
  });

  if (!listing) {
    await ctx.answerCallbackQuery(TEXT[lang].cbNotFound);
    return;
  }

  if (action === 'del') {
    await db.listing.delete({ where: { id } });
    await ctx.answerCallbackQuery(TEXT[lang].cbDeleted);
    await ctx.editMessageText(TEXT[lang].cbListingDeleted);
    return;
  }

  if (action === 'arc' || action === 'pub') {
    const status = action === 'arc' ? 'archived' : 'published';
    await db.listing.update({ where: { id }, data: { status } });
    await ctx.answerCallbackQuery(action === 'arc' ? TEXT[lang].cbHidden : TEXT[lang].cbShown);
    await ctx.editMessageReplyMarkup({
      reply_markup: listingKeyboard(id, status, lang),
    });
    return;
  }

  await ctx.answerCallbackQuery();
});

/**
 * Без обработчика ошибок grammy валит процесс на любой сетевой сбое телеграма.
 * Продавцу при этом важно понимать, что анкета не потерялась.
 */
bot.catch(async ({ ctx, error }) => {
  if (error instanceof GrammyError) console.error('Телеграм отклонил запрос:', error.description);
  else if (error instanceof HttpError) console.error('Не достучались до телеграма:', error);
  else console.error('Ошибка в обработчике:', error);

  try {
    await ctx.reply(TEXT[ctx.session?.lang ?? 'ru'].genericError);
  } catch {
    // Ответить не вышло — значит связи нет совсем, писать в лог второй раз незачем.
  }
});

await ensureBucket();

/**
 * Список команд телеграм показывает по языку своего интерфейса, а не по
 * выбранному в боте, и узбекскую кириллицу отдельным кодом не различает:
 * поэтому вариантов два — русский по умолчанию и узбекский латиницей.
 */
const commands = (lang: Lang) => [
  { command: 'new', description: TEXT[lang].cmdNew },
  { command: 'my', description: TEXT[lang].cmdMy },
  { command: 'lang', description: TEXT[lang].cmdLang },
  { command: 'support', description: TEXT[lang].cmdSupport },
  { command: 'cancel', description: TEXT[lang].cmdCancel },
];

await bot.api.setMyCommands(commands('ru'));
await bot.api.setMyCommands(commands('uz'), { language_code: 'uz' });

console.log('Бот запущен');
await bot.start();
