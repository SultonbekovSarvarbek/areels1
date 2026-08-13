/**
 * Телеграм-бот — единственный способ завести объявление: в приложении экрана
 * публикации нет и не планируется, продавцу проще прислать фото в чат.
 *
 * Бот пишет в ту же базу, что читает API, поэтому опубликованное объявление
 * появляется в колоде сразу после перезагрузки каталога в приложении.
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
import { db } from './db.ts';
import { botToken } from './env.ts';
import { hidePlates } from './plate.ts';
import { ensureBucket, uploadPhoto } from './s3.ts';

/**
 * Подписи перечислений намеренно продублированы, а не взяты из src/i18n.ts:
 * тот модуль тянет за собой словари приложения на три языка и типы клиента,
 * а бот говорит только по-русски. Коды при этом общие (src/types.ts), так что
 * рассинхронизироваться могут только подписи, а не данные.
 */
const CITY: Record<City, string> = {
  tashkent: 'Ташкент',
  samarkand: 'Самарканд',
  bukhara: 'Бухара',
  namangan: 'Наманган',
  andijan: 'Андижан',
  fergana: 'Фергана',
  karshi: 'Карши',
  jizzakh: 'Джизак',
  termez: 'Термез',
};

const BODY: Record<BodyType, string> = {
  sedan: 'Седан',
  hatchback: 'Хэтчбек',
  crossover: 'Кроссовер',
  suv: 'Внедорожник',
  minivan: 'Минивэн',
};

const FUEL: Record<Fuel, string> = {
  petrol: 'Бензин',
  gas: 'Газ',
  diesel: 'Дизель',
  hybrid: 'Гибрид',
  electric: 'Электро',
};

const TRANSMISSION: Record<Transmission, string> = {
  auto: 'Автомат',
  manual: 'Механика',
  robot: 'Робот',
  cvt: 'Вариатор',
};

const CONDITION: Record<Condition, string> = {
  excellent: 'Отличное',
  good: 'Хорошее',
  average: 'Среднее',
  needsRepair: 'Требует ремонта',
};

const DRIVE: Record<Drive, string> = {
  fwd: 'Передний',
  rwd: 'Задний',
  awd: 'Полный',
};

const SELLER_TYPE: Record<SellerType, string> = {
  private: 'Частное лицо',
  dealer: 'Автосалон',
};

/**
 * Марки кнопками, а не текстом: в приложении марка — это строка, и фильтр
 * группирует объявления точным совпадением. «шевроле», «Chevrolet» и «CHEVROLET»
 * от разных продавцов расползлись бы по трём кнопкам фильтра.
 *
 * Список — то, что реально ездит по Узбекистану; остальное продавец допишет
 * руками через «Другая марка».
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

/** Цвета — по той же причине, что и марки: в карточке это просто строка. */
const COLORS = [
  'Белый',
  'Чёрный',
  'Серебристый',
  'Серый',
  'Синий',
  'Голубой',
  'Красный',
  'Зелёный',
  'Коричневый',
  'Бежевый',
];

const CANCEL = 'Отмена';
const DONE = 'Готово';
const SKIP = 'Пропустить';
const PUBLISH = 'Опубликовать';
const OTHER_BRAND = 'Другая марка';
const OTHER_COLOR = 'Другой цвет';
const MAX_PHOTOS = 10;

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
  };
}

type BotContext = Context & SessionFlavor<SessionData>;

// ─── Разбор ответов ──────────────────────────────────────────────────────────

function keyboard(labels: string[], perRow: number): Keyboard {
  const kb = new Keyboard();
  labels.forEach((label, i) => {
    kb.text(label);
    if ((i + 1) % perRow === 0) kb.row();
  });
  return kb.row().text(CANCEL).resized();
}

/** Шаг с выбором из перечисления: клавиатура из подписей, ответ — код. */
function choice<T extends string>(labels: Record<T, string>, perRow = 2) {
  const codeByLabel = new Map(
    (Object.entries(labels) as [T, string][]).map(([code, label]) => [label, code]),
  );
  return {
    keyboard: keyboard(Object.values(labels) as string[], perRow),
    parse: (text: string): T | undefined => codeByLabel.get(text.trim()),
  };
}

const textKeyboard = new Keyboard().text(CANCEL).resized();
const skipKeyboard = new Keyboard().text(SKIP).row().text(CANCEL).resized();

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
  prompt: string;
  keyboard: Keyboard;
  apply: (text: string, s: SessionData) => StepReply;
}

/**
 * Шаг «выберите кнопкой или напишите своё». Список никогда не полон — марок и
 * цветов больше, чем помещается на клавиатуру, — но кнопки задают канонические
 * написания для частых значений, а свободный ввод остаётся запасным выходом.
 */
function openChoice(config: {
  prompt: string;
  options: string[];
  perRow: number;
  otherLabel: string;
  otherPrompt: string;
  /** Проверка того, что продавец написал руками. */
  validate: (value: string) => string | null;
  assign: (value: string, s: SessionData) => void;
}): Step {
  return {
    prompt: config.prompt,
    keyboard: keyboard([...config.options, config.otherLabel], config.perRow),
    apply: (text, s) => {
      if (!s.freeInput) {
        if (text === config.otherLabel) {
          s.freeInput = true;
          return { text: config.otherPrompt, keyboard: textKeyboard };
        }
        if (!config.options.includes(text)) {
          return `Выберите кнопкой или нажмите «${config.otherLabel}».`;
        }
        config.assign(text, s);
        return null;
      }

      const value = normalizeName(text);
      const error = config.validate(value);
      if (error) return error;

      config.assign(value, s);
      return null;
    },
  };
}

const cityChoice = choice(CITY, 3);
const bodyChoice = choice(BODY);
const fuelChoice = choice(FUEL, 3);
const transmissionChoice = choice(TRANSMISSION);
const driveChoice = choice(DRIVE, 3);
const conditionChoice = choice(CONDITION);
const sellerTypeChoice = choice(SELLER_TYPE);
const yesNo = choice({ yes: 'Торг уместен', no: 'Цена фиксированная' } as const, 1);

const CURRENT_YEAR = new Date().getFullYear();

const STEPS: Record<string, Step> = {
  phone: {
    prompt: 'Ваш номер телефона — по нему покупатели будут звонить.\nНажмите кнопку или напишите номер вручную.',
    keyboard: new Keyboard().requestContact('Отправить мой номер').row().text(CANCEL).resized(),
    apply: (text, s) => {
      const phone = parsePhone(text);
      if (!phone) return 'Не похоже на номер. Пример: +998 90 123 45 67';
      s.profile.phone = phone;
      return null;
    },
  },
  name: {
    prompt: 'Как вас зовут? Имя увидит покупатель в карточке.',
    keyboard: textKeyboard,
    apply: (text, s) => {
      const name = text.trim();
      if (name.length < 2 || name.length > 40) return 'Имя от 2 до 40 символов.';
      s.profile.name = name;
      return null;
    },
  },
  sellerType: {
    prompt: 'Вы частное лицо или автосалон?',
    keyboard: sellerTypeChoice.keyboard,
    apply: (text, s) => {
      const type = sellerTypeChoice.parse(text);
      if (!type) return 'Выберите вариант кнопкой.';
      s.profile.type = type;
      return null;
    },
  },

  brand: openChoice({
    prompt: 'Марка автомобиля',
    options: BRANDS,
    perRow: 3,
    otherLabel: OTHER_BRAND,
    otherPrompt: 'Напишите марку. Например: Opel',
    validate: (value) => (value.length < 2 || value.length > 30 ? 'Марка от 2 до 30 символов.' : null),
    assign: (value, s) => {
      s.draft.brand = value;
    },
  }),
  model: {
    prompt: 'Модель. Например: Malibu 2',
    keyboard: textKeyboard,
    apply: (text, s) => {
      const model = text.trim().replace(/\s+/g, ' ');
      if (model.length < 1 || model.length > 30) return 'Модель до 30 символов.';
      s.draft.model = model;
      return null;
    },
  },
  year: {
    prompt: 'Год выпуска',
    keyboard: textKeyboard,
    apply: (text, s) => {
      const year = parseNumber(text, 1950, CURRENT_YEAR + 1);
      if (!year) return `Год от 1950 до ${CURRENT_YEAR + 1}.`;
      s.draft.year = year;
      return null;
    },
  },
  price: {
    prompt: 'Цена в долларах США. Только число, например: 18500',
    keyboard: textKeyboard,
    apply: (text, s) => {
      const price = parseNumber(text, 100, 1_000_000);
      if (!price) return 'Цена от 100 до 1 000 000 $.';
      s.draft.price = price;
      return null;
    },
  },
  mileage: {
    prompt: 'Пробег в километрах',
    keyboard: textKeyboard,
    apply: (text, s) => {
      const mileage = parseNumber(text, 0, 1_500_000);
      if (mileage === undefined) return 'Пробег от 0 до 1 500 000 км.';
      s.draft.mileage = mileage;
      return null;
    },
  },
  owners: {
    /**
     * Кнопки — только частые ответы, а редкое «7» продавец допишет текстом:
     * parseNumber одинаково разбирает и нажатие кнопки, и ручной ввод.
     */
    prompt: 'Сколько было владельцев по техпаспорту?',
    keyboard: keyboard(['1', '2', '3', '4', '5'], 5),
    apply: (text, s) => {
      const owners = parseNumber(text, 1, 20);
      if (!owners) return 'Число владельцев от 1 до 20.';
      s.draft.owners = owners;
      return null;
    },
  },
  condition: {
    prompt: 'Состояние машины',
    keyboard: conditionChoice.keyboard,
    apply: (text, s) => {
      const condition = conditionChoice.parse(text);
      if (!condition) return 'Выберите состояние кнопкой.';
      s.draft.condition = condition;
      return null;
    },
  },
  city: {
    prompt: 'Город',
    keyboard: cityChoice.keyboard,
    apply: (text, s) => {
      const city = cityChoice.parse(text);
      if (!city) return 'Выберите город кнопкой.';
      s.draft.city = city;
      return null;
    },
  },
  bodyType: {
    prompt: 'Тип кузова',
    keyboard: bodyChoice.keyboard,
    apply: (text, s) => {
      const bodyType = bodyChoice.parse(text);
      if (!bodyType) return 'Выберите кузов кнопкой.';
      s.draft.bodyType = bodyType;
      return null;
    },
  },
  fuel: {
    prompt: 'Топливо',
    keyboard: fuelChoice.keyboard,
    apply: (text, s) => {
      const fuel = fuelChoice.parse(text);
      if (!fuel) return 'Выберите топливо кнопкой.';
      s.draft.fuel = fuel;
      return null;
    },
  },
  transmission: {
    prompt: 'Коробка передач',
    keyboard: transmissionChoice.keyboard,
    apply: (text, s) => {
      const transmission = transmissionChoice.parse(text);
      if (!transmission) return 'Выберите коробку кнопкой.';
      s.draft.transmission = transmission;
      return null;
    },
  },
  drive: {
    prompt: 'Привод',
    keyboard: driveChoice.keyboard,
    apply: (text, s) => {
      const drive = driveChoice.parse(text);
      if (!drive) return 'Выберите привод кнопкой.';
      s.draft.drive = drive;
      return null;
    },
  },
  engine: {
    prompt: 'Объём двигателя в литрах. Например: 1.5\nДля электромобиля напишите 0',
    keyboard: textKeyboard,
    apply: (text, s) => {
      const engine = parseNumber(text, 0, 8, true);
      if (engine === undefined) return 'Объём от 0 до 8 литров.';
      s.draft.engine = engine;
      return null;
    },
  },
  color: openChoice({
    prompt: 'Цвет',
    options: COLORS,
    perRow: 3,
    otherLabel: OTHER_COLOR,
    otherPrompt: 'Напишите цвет. Например: Тёмно-синий',
    validate: (value) => (value.length < 3 || value.length > 20 ? 'Цвет от 3 до 20 символов.' : null),
    assign: (value, s) => {
      s.draft.color = value;
    },
  }),
  negotiable: {
    prompt: 'Торг возможен?',
    keyboard: yesNo.keyboard,
    apply: (text, s) => {
      const answer = yesNo.parse(text);
      if (!answer) return 'Выберите вариант кнопкой.';
      s.draft.negotiable = answer === 'yes';
      return null;
    },
  },
  description: {
    prompt: 'Опишите машину: состояние, что менялось, комплектация.',
    keyboard: skipKeyboard,
    apply: (text, s) => {
      const description = text.trim() === SKIP ? '' : text.trim();
      if (description.length > 1000) return 'Описание до 1000 символов.';
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
    prompt:
      `Пришлите фото машины (до ${MAX_PHOTOS} штук). Первое станет обложкой.\n` +
      `Госномер на фото закроем сами.\nКогда закончите — нажмите «${DONE}».`,
    keyboard: new Keyboard().text(DONE).row().text(CANCEL).resized(),
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
  await ctx.reply(step.prompt, { reply_markup: step.keyboard });
}

function money(value: number): string {
  return `${value.toLocaleString('ru-RU')} $`;
}

/** 1 владелец, 2 владельца, 5 владельцев. */
function owners(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} владелец`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} владельца`;
  return `${n} владельцев`;
}

function summary(s: SessionData): string {
  const d = s.draft as Draft;
  return [
    `<b>${d.brand} ${d.model}, ${d.year}</b>`,
    `${money(d.price)}${d.negotiable ? ' (торг)' : ''}`,
    `${d.mileage.toLocaleString('ru-RU')} км · ${CONDITION[d.condition]} · ${CITY[d.city]}`,
    `${BODY[d.bodyType]} · ${FUEL[d.fuel]} · ${TRANSMISSION[d.transmission]} · ${DRIVE[d.drive]}`,
    `${d.engine} л · ${d.color} · ${owners(d.owners)}`,
    d.description ? `\n${d.description}` : '',
    `\nФото: ${s.photos.length}`,
    `Продавец: ${s.profile.name}, ${s.profile.phone}`,
  ]
    .filter(Boolean)
    .join('\n');
}

const confirmKeyboard = new Keyboard().text(PUBLISH).row().text(CANCEL).resized();

async function showConfirm(ctx: BotContext): Promise<void> {
  ctx.session.confirming = true;
  await ctx.reply(summary(ctx.session), {
    parse_mode: 'HTML',
    reply_markup: confirmKeyboard,
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
  const { profile } = ctx.session;
  // Профиль переживает отмену: спрашивать имя и телефон каждый раз незачем.
  Object.assign(ctx.session, emptySession(), { profile });
}

const menuKeyboard = new Keyboard()
  .text('Разместить объявление')
  .row()
  .text('Мои объявления')
  .resized();

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
  };

  // upsert по telegramId: второй раз тот же продавец не должен раздваиваться,
  // а имя и телефон могли обновиться с прошлого объявления.
  const seller = await db.seller.upsert({
    where: { telegramId },
    update: {
      name: sellerData.name,
      type: sellerData.type,
      phone: sellerData.phone,
      telegramUsername: sellerData.telegramUsername,
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
      tags: [],
      negotiable: d.negotiable,
      description: d.description,
      photos: { create: s.photos.map((url, sortOrder) => ({ url, sortOrder })) },
    },
  });

  reset(ctx);
  await ctx.reply(
    `Объявление опубликовано и уже в приложении.\nНомер: <code>${listing.id}</code>`,
    { parse_mode: 'HTML', reply_markup: menuKeyboard },
  );
}

// ─── Мои объявления ──────────────────────────────────────────────────────────

function listingKeyboard(id: string, archived: boolean): InlineKeyboard {
  return new InlineKeyboard()
    .text(archived ? 'Вернуть в показ' : 'Снять с показа', `${archived ? 'pub' : 'arc'}:${id}`)
    .text('Удалить', `del:${id}`);
}

async function showMyListings(ctx: BotContext): Promise<void> {
  const telegramId = BigInt(ctx.from!.id);
  const listings = await db.listing.findMany({
    where: { seller: { telegramId } },
    orderBy: { createdAt: 'desc' },
    include: { photos: { orderBy: { sortOrder: 'asc' }, take: 1 } },
  });

  if (listings.length === 0) {
    await ctx.reply('У вас пока нет объявлений.', { reply_markup: menuKeyboard });
    return;
  }

  for (const listing of listings) {
    const archived = listing.status === 'archived';
    const title = `<b>${listing.brand} ${listing.model}, ${listing.year}</b>\n${money(listing.price)}${
      archived ? '\n<i>снято с показа</i>' : ''
    }`;
    await ctx.reply(title, {
      parse_mode: 'HTML',
      reply_markup: listingKeyboard(listing.id, archived),
    });
  }
}

// ─── Бот ─────────────────────────────────────────────────────────────────────

const bot = new Bot<BotContext>(botToken());

bot.use(session({ initial: emptySession }));

bot.command('start', async (ctx) => {
  reset(ctx);
  await ctx.reply(
    'Это бот AvtoLike. Здесь размещают объявления, которые покупатели листают в приложении свайпами.',
    { reply_markup: menuKeyboard },
  );
});

bot.command('cancel', async (ctx) => {
  reset(ctx);
  await ctx.reply('Анкета отменена.', { reply_markup: menuKeyboard });
});

bot.command('my', showMyListings);

/** Начало анкеты: профиль спрашиваем только у незнакомого продавца. */
async function startForm(ctx: BotContext): Promise<void> {
  const known = await db.seller.findUnique({ where: { telegramId: BigInt(ctx.from!.id) } });
  if (known) {
    ctx.session.profile = { phone: known.phone, name: known.name, type: known.type };
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
    await ctx.reply('Не удалось разобрать номер, напишите его текстом.');
    return;
  }

  ctx.session.profile.phone = phone;
  await advance(ctx);
});

bot.on('message:photo', async (ctx) => {
  const s = ctx.session;
  if (currentStepId(s) !== 'photos') {
    await ctx.reply('Фото нужны на последнем шаге анкеты. Нажмите «Разместить объявление».');
    return;
  }

  if (s.photos.length >= MAX_PHOTOS) {
    await ctx.reply(`Больше ${MAX_PHOTOS} фото не поместится. Нажмите «${DONE}».`);
    return;
  }

  // Телеграм присылает несколько размеров одной картинки; последний — самый большой.
  const photo = ctx.message.photo[ctx.message.photo.length - 1];
  const file = await ctx.api.getFile(photo.file_id);
  if (!file.file_path) {
    await ctx.reply('Телеграм не отдал файл, пришлите фото ещё раз.');
    return;
  }

  const response = await fetch(
    `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`,
  );
  if (!response.ok) {
    await ctx.reply('Не удалось скачать фото, пришлите его ещё раз.');
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
  await ctx.reply(`Фото ${s.photos.length} из ${MAX_PHOTOS} принято.`);
});

bot.on('message:text', async (ctx) => {
  const s = ctx.session;
  const text = ctx.message.text.trim();

  if (text === CANCEL) {
    reset(ctx);
    await ctx.reply('Отменено.', { reply_markup: menuKeyboard });
    return;
  }

  if (s.confirming) {
    if (text !== PUBLISH) {
      await ctx.reply(`Нажмите «${PUBLISH}» или «${CANCEL}».`);
      return;
    }
    await publish(ctx);
    return;
  }

  const stepId = currentStepId(s);

  if (!stepId) {
    if (text === 'Разместить объявление') {
      await startForm(ctx);
      return;
    }
    if (text === 'Мои объявления') {
      await showMyListings(ctx);
      return;
    }
    await ctx.reply('Выберите действие кнопкой ниже.', { reply_markup: menuKeyboard });
    return;
  }

  if (stepId === 'photos') {
    if (text !== DONE) {
      await ctx.reply(`Пришлите фото или нажмите «${DONE}».`);
      return;
    }
    if (s.photos.length === 0) {
      // Без фото объявление не выдаётся API (см. api.ts) — до базы его не пускаем.
      await ctx.reply('Нужна хотя бы одна фотография.');
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
    await ctx.answerCallbackQuery('Объявление не найдено');
    return;
  }

  if (action === 'del') {
    await db.listing.delete({ where: { id } });
    await ctx.answerCallbackQuery('Удалено');
    await ctx.editMessageText('Объявление удалено.');
    return;
  }

  if (action === 'arc' || action === 'pub') {
    const status = action === 'arc' ? 'archived' : 'published';
    await db.listing.update({ where: { id }, data: { status } });
    await ctx.answerCallbackQuery(action === 'arc' ? 'Снято с показа' : 'Вернули в показ');
    await ctx.editMessageReplyMarkup({
      reply_markup: listingKeyboard(id, status === 'archived'),
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
    await ctx.reply('Что-то пошло не так. Повторите последнее действие.');
  } catch {
    // Ответить не вышло — значит связи нет совсем, писать в лог второй раз незачем.
  }
});

await ensureBucket();

await bot.api.setMyCommands([
  { command: 'new', description: 'Разместить объявление' },
  { command: 'my', description: 'Мои объявления' },
  { command: 'cancel', description: 'Отменить анкету' },
]);

console.log('Бот запущен');
await bot.start();
