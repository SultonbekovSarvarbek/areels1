/**
 * Тексты бота на трёх языках приложения.
 *
 * Подписи перечислений берём из словарей приложения (../../src/i18n.ts), а не
 * дублируем здесь: коды общие (../../src/types.ts), а узбекские формулировки там
 * уже выверены. Раньше бот говорил только по-русски, и дубль был дешевле импорта —
 * теперь дубль означал бы три языка подписей в двух местах сразу.
 *
 * Модуль клиента сюда тянется безопасно: i18n.ts не импортирует ничего, кроме
 * типов, и в рантайме это просто объекты со строками.
 */

import { dictionaries, type Lang } from '../../src/i18n.ts';

export type { Lang };

export const LANGS: Lang[] = ['ru', 'uz', 'uzc'];

/** Подписи кнопок выбора языка — на своём языке, без перевода. */
export const LANG_LABEL: Record<Lang, string> = {
  ru: 'Русский',
  uz: "O'zbekcha",
  uzc: 'Ўзбекча',
};

/** Первый вопрос незнакомому продавцу: языка мы ещё не знаем, поэтому все три. */
export const LANG_PROMPT = 'Выберите язык / Tilni tanlang / Тилни танланг';

/** Подписи перечислений: города, кузов, топливо, коробка, привод, состояние. */
export const enums = (lang: Lang) => dictionaries[lang];

/**
 * Цвета — кнопки на языке продавца. В базу уходит выбранная подпись как есть:
 * color в карточке приложения не переводится, поэтому «Oq» узбекского продавца
 * покупатель с русским интерфейсом увидит именно как «Oq». Это осознанно —
 * свободный ввод (цвет, модель, описание) остаётся на языке того, кто его писал.
 */
export const COLORS: Record<Lang, string[]> = {
  ru: [
    'Белый',
    'Чёрный',
    'Серебристый',
    'Серый',
    'Синий',
    'Голубой',
    'Красный',
    'Вишнёвый',
    'Зелёный',
    'Оливковый',
    'Коричневый',
    'Бежевый',
    'Золотистый',
    'Жёлтый',
    'Апельсин',
    'Бронзовый',
    'Бирюзовый',
    'Фиолетовый',
    'Розовый',
    'Асфальт',
    'Сафари',
    'Магнолия',
    'Матовый',
    'Хамелеон',
  ],
  uz: [
    'Oq',
    'Qora',
    'Kumushrang',
    'Kulrang',
    "Ko'k",
    'Moviy',
    'Qizil',
    'Olcharang',
    'Yashil',
    'Zaytun',
    'Jigarrang',
    'Bej',
    'Oltinrang',
    'Sariq',
    'Apelsin',
    'Bronza',
    'Firuza',
    'Binafsha',
    'Pushti',
    'Asfalt',
    'Safari',
    'Magnoliya',
    'Mat',
    'Xameleon',
  ],
  uzc: [
    'Оқ',
    'Қора',
    'Кумушранг',
    'Кулранг',
    'Кўк',
    'Мовий',
    'Қизил',
    'Олчаранг',
    'Яшил',
    'Зайтун',
    'Жигарранг',
    'Беж',
    'Олтинранг',
    'Сариқ',
    'Апелсин',
    'Бронза',
    'Фируза',
    'Бинафша',
    'Пушти',
    'Асфалт',
    'Сафари',
    'Магнолия',
    'Мат',
    'Хамелеон',
  ],
};

interface BotText {
  // Меню и общие кнопки
  start: string;
  menuNew: string;
  menuMy: string;
  menuLang: string;
  menuSupport: string;
  /** Контакты живого человека: телефон и телеграм подставляются из бота. */
  supportText: (phone: string, telegram: string) => string;
  supportWrite: string;
  cancel: string;
  done: string;
  skip: string;
  publish: string;
  otherBrand: string;
  otherColor: string;
  shareContact: string;
  langChanged: string;
  formCancelled: string;
  cancelled: string;
  chooseAction: string;
  chooseButton: string;
  chooseOrOther: (other: string) => string;
  confirmHint: (publish: string, cancel: string) => string;
  genericError: string;

  // Вопросы анкеты и ответы на неверный ввод
  askPhone: string;
  errPhone: string;
  askName: string;
  errName: string;
  askSellerType: string;
  askBrand: string;
  askBrandFree: string;
  errBrand: string;
  askModel: string;
  errModel: string;
  askYear: string;
  errYear: (max: number) => string;
  askPrice: string;
  errPrice: string;
  askMileage: string;
  errMileage: string;
  askOwners: string;
  errOwners: string;
  askCondition: string;
  askCity: string;
  askBody: string;
  askFuel: string;
  askTransmission: string;
  askDrive: string;
  askEngine: string;
  errEngine: string;
  askColor: string;
  askColorFree: string;
  errColor: string;
  askTint: string;
  tintYes: string;
  tintNo: string;
  askTintFree: string;
  errTint: string;
  askNegotiable: string;
  bargainYes: string;
  bargainNo: string;
  askDescription: string;
  errDescription: string;

  // Фото
  askPhotos: (max: number, done: string) => string;
  photoAccepted: (n: number, max: number) => string;
  photoTooMany: (max: number, done: string) => string;
  photoNeedOne: string;
  photoOrDone: (done: string) => string;
  photoWrongStep: (menuNew: string) => string;
  photoNoFile: string;
  photoDownloadFailed: string;

  // Сводка и публикация
  summaryBargain: string;
  summaryTint: string;
  summaryPhotos: string;
  summarySeller: string;
  owners: (n: number) => string;
  unitKm: string;
  unitL: string;
  published: (id: string) => string;
  /** Итоги модерации — их шлёт API, а не бот: одобряют из админки. */
  moderationApproved: (title: string) => string;
  moderationRejected: (title: string, reason: string) => string;

  // Мои объявления
  myEmpty: string;
  myArchived: string;
  myPending: string;
  myRejected: (reason: string) => string;
  btnHide: string;
  btnShow: string;
  btnDelete: string;
  cbNotFound: string;
  cbDeleted: string;
  cbListingDeleted: string;
  cbHidden: string;
  cbShown: string;

  // Описания команд в меню телеграма
  cmdNew: string;
  cmdMy: string;
  cmdCancel: string;
  cmdLang: string;
  cmdSupport: string;
}

/** Русские склонения: 1 владелец, 2 владельца, 5 владельцев. */
const ownersRu = (n: number): string => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} владелец`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} владельца`;
  return `${n} владельцев`;
};

const ru: BotText = {
  start:
    'Это бот AvtoLike. Здесь размещают объявления, которые покупатели листают в приложении свайпами.',
  menuNew: 'Разместить объявление',
  menuMy: 'Мои объявления',
  menuLang: '🌐 Язык',
  menuSupport: '💬 Поддержка',
  supportText: (phone, telegram) =>
    'Поддержка AvtoLike.\n\n' +
    `Телефон: ${phone}\nTelegram: ${telegram}\n\n` +
    'Напишите, если что-то не работает, объявление отклонили не по делу или нужно удалить свои данные.',
  supportWrite: 'Написать в Telegram',
  cancel: 'Отмена',
  done: 'Готово',
  skip: 'Пропустить',
  publish: 'Опубликовать',
  otherBrand: 'Другая марка',
  otherColor: 'Другой цвет',
  shareContact: 'Отправить мой номер',
  langChanged: 'Язык изменён.',
  formCancelled: 'Анкета отменена.',
  cancelled: 'Отменено.',
  chooseAction: 'Выберите действие кнопкой ниже.',
  chooseButton: 'Выберите вариант кнопкой.',
  chooseOrOther: (other) => `Выберите кнопкой или нажмите «${other}».`,
  confirmHint: (publish, cancel) => `Нажмите «${publish}» или «${cancel}».`,
  genericError: 'Что-то пошло не так. Повторите последнее действие.',

  askPhone:
    'Ваш номер телефона — по нему покупатели будут звонить.\nНажмите кнопку или напишите номер вручную.',
  errPhone: 'Не похоже на номер. Пример: +998 90 123 45 67',
  askName: 'Как вас зовут? Имя увидит покупатель в карточке.',
  errName: 'Имя от 2 до 40 символов.',
  askSellerType: 'Вы частное лицо или автосалон?',
  askBrand: 'Марка автомобиля',
  askBrandFree: 'Напишите марку. Например: Opel',
  errBrand: 'Марка от 2 до 30 символов.',
  askModel: 'Модель. Например: Malibu 2',
  errModel: 'Модель до 30 символов.',
  askYear: 'Год выпуска',
  errYear: (max) => `Год от 1950 до ${max}.`,
  askPrice: 'Цена в долларах США. Только число, например: 18500',
  errPrice: 'Цена от 100 до 1 000 000 $.',
  askMileage: 'Пробег в километрах',
  errMileage: 'Пробег от 0 до 1 500 000 км.',
  askOwners: 'Сколько было владельцев по техпаспорту?',
  errOwners: 'Число владельцев от 1 до 20.',
  askCondition: 'Состояние машины',
  askCity: 'Город',
  askBody: 'Тип кузова',
  askFuel: 'Топливо',
  askTransmission: 'Коробка передач',
  askDrive: 'Привод',
  askEngine: 'Объём двигателя в литрах. Например: 1.5\nДля электромобиля напишите 0',
  errEngine: 'Объём от 0 до 8 литров.',
  askColor: 'Цвет',
  askColorFree: 'Напишите цвет. Например: Тёмно-синий',
  errColor: 'Цвет от 3 до 20 символов.',
  askTint: 'Тонировка есть?',
  tintYes: 'Есть',
  tintNo: 'Нет',
  askTintFree: 'До какого срока действует разрешение на тонировку? Например: до марта 2027',
  errTint: 'Напишите срок от 2 до 100 символов. Например: до марта 2027',
  askNegotiable: 'Торг возможен?',
  bargainYes: 'Торг уместен',
  bargainNo: 'Цена фиксированная',
  askDescription: 'Опишите машину: состояние, что менялось, комплектация.',
  errDescription: 'Описание до 1000 символов.',

  askPhotos: (max, done) =>
    `Пришлите фото машины (до ${max} штук). Первое станет обложкой.\n` +
    `Госномер на фото закроем сами.\nКогда закончите — нажмите «${done}».`,
  photoAccepted: (n, max) => `Фото ${n} из ${max} принято.`,
  photoTooMany: (max, done) => `Больше ${max} фото не поместится. Нажмите «${done}».`,
  photoNeedOne: 'Нужна хотя бы одна фотография.',
  photoOrDone: (done) => `Пришлите фото или нажмите «${done}».`,
  photoWrongStep: (menuNew) => `Фото нужны на последнем шаге анкеты. Нажмите «${menuNew}».`,
  photoNoFile: 'Телеграм не отдал файл, пришлите фото ещё раз.',
  photoDownloadFailed: 'Не удалось скачать фото, пришлите его ещё раз.',

  summaryBargain: 'торг',
  summaryTint: 'Тонировка',
  summaryPhotos: 'Фото',
  summarySeller: 'Продавец',
  owners: ownersRu,
  unitKm: 'км',
  unitL: 'л',
  published: (id) =>
    `Объявление отправлено на проверку. Как только модератор его одобрит, оно появится в приложении — мы напишем.\nНомер: <code>${id}</code>`,
  moderationApproved: (title) => `✅ <b>${title}</b> — объявление одобрено и уже в приложении.`,
  moderationRejected: (title, reason) =>
    `❌ <b>${title}</b> — объявление отклонено.\nПричина: ${reason}\n\nИсправьте и разместите заново.`,

  myEmpty: 'У вас пока нет объявлений.',
  myArchived: 'снято с показа',
  myPending: 'на проверке',
  myRejected: (reason) => `отклонено: ${reason}`,
  btnHide: 'Снять с показа',
  btnShow: 'Вернуть в показ',
  btnDelete: 'Удалить',
  cbNotFound: 'Объявление не найдено',
  cbDeleted: 'Удалено',
  cbListingDeleted: 'Объявление удалено.',
  cbHidden: 'Снято с показа',
  cbShown: 'Вернули в показ',

  cmdNew: 'Разместить объявление',
  cmdMy: 'Мои объявления',
  cmdCancel: 'Отменить анкету',
  cmdLang: 'Сменить язык',
  cmdSupport: 'Поддержка',
};

const uz: BotText = {
  start:
    "Bu AvtoLike boti. Bu yerda e'lon joylashtiriladi, xaridorlar esa ularni ilovada surib ko'radi.",
  menuNew: "E'lon joylashtirish",
  menuMy: "Mening e'lonlarim",
  menuLang: '🌐 Til',
  menuSupport: "💬 Qo'llab-quvvatlash",
  supportText: (phone, telegram) =>
    "AvtoLike qo'llab-quvvatlash xizmati.\n\n" +
    `Telefon: ${phone}\nTelegram: ${telegram}\n\n` +
    "Biror narsa ishlamasa, e'lon noo'rin rad etilsa yoki ma'lumotlaringizni o'chirish kerak bo'lsa — yozing.",
  supportWrite: 'Telegramga yozish',
  cancel: 'Bekor qilish',
  done: 'Tayyor',
  skip: "O'tkazish",
  publish: 'Chop etish',
  otherBrand: 'Boshqa marka',
  otherColor: 'Boshqa rang',
  shareContact: 'Raqamimni yuborish',
  langChanged: "Til o'zgartirildi.",
  formCancelled: "So'rovnoma bekor qilindi.",
  cancelled: 'Bekor qilindi.',
  chooseAction: 'Quyidagi tugma orqali amalni tanlang.',
  chooseButton: 'Variantni tugma orqali tanlang.',
  chooseOrOther: (other) => `Tugma orqali tanlang yoki «${other}» tugmasini bosing.`,
  confirmHint: (publish, cancel) => `«${publish}» yoki «${cancel}» tugmasini bosing.`,
  genericError: "Nimadir noto'g'ri ketdi. Oxirgi amalni takrorlang.",

  askPhone:
    "Telefon raqamingiz — xaridorlar shu raqamga qo'ng'iroq qiladi.\nTugmani bosing yoki raqamni qo'lda yozing.",
  errPhone: "Raqamga o'xshamaydi. Masalan: +998 90 123 45 67",
  askName: "Ismingiz nima? Ismni xaridor kartochkada ko'radi.",
  errName: 'Ism 2 tadan 40 tagacha belgi.',
  askSellerType: 'Siz xususiy shaxsmisiz yoki avtosalonmi?',
  askBrand: 'Avtomobil markasi',
  askBrandFree: 'Markani yozing. Masalan: Opel',
  errBrand: 'Marka 2 tadan 30 tagacha belgi.',
  askModel: 'Model. Masalan: Malibu 2',
  errModel: 'Model 30 tagacha belgi.',
  askYear: 'Ishlab chiqarilgan yili',
  errYear: (max) => `Yil 1950 dan ${max} gacha.`,
  askPrice: 'Narx AQSH dollarida. Faqat raqam, masalan: 18500',
  errPrice: 'Narx 100 dan 1 000 000 $ gacha.',
  askMileage: 'Yurgan masofa, kilometrda',
  errMileage: 'Masofa 0 dan 1 500 000 km gacha.',
  askOwners: "Texpasport bo'yicha nechta egasi bo'lgan?",
  errOwners: 'Egalar soni 1 dan 20 gacha.',
  askCondition: 'Mashinaning holati',
  askCity: 'Shahar',
  askBody: 'Kuzov turi',
  askFuel: "Yoqilg'i",
  askTransmission: 'Uzatmalar qutisi',
  askDrive: 'Yuritma',
  askEngine: 'Dvigatel hajmi, litrda. Masalan: 1.5\nElektromobil uchun 0 deb yozing',
  errEngine: 'Hajm 0 dan 8 litrgacha.',
  askColor: 'Rang',
  askColorFree: "Rangni yozing. Masalan: To'q ko'k",
  errColor: 'Rang 3 tadan 20 tagacha belgi.',
  askTint: 'Tonirovka bormi?',
  tintYes: 'Bor',
  tintNo: "Yo'q",
  askTintFree: "Tonirovkaga ruxsatnoma qachongacha amal qiladi? Masalan: 2027-yil martgacha",
  errTint: "Muddatni 2 tadan 100 tagacha belgi bilan yozing. Masalan: 2027-yil martgacha",
  askNegotiable: 'Savdolashish mumkinmi?',
  bargainYes: "Savdolashsa bo'ladi",
  bargainNo: "Narx qat'iy",
  askDescription: 'Mashinani tavsiflang: holati, nima almashtirilgan, jihozlari.',
  errDescription: 'Tavsif 1000 tagacha belgi.',

  askPhotos: (max, done) =>
    `Mashina rasmlarini yuboring (${max} tagacha). Birinchisi muqova bo'ladi.\n` +
    `Davlat raqamini o'zimiz yopamiz.\nTugatgach — «${done}» tugmasini bosing.`,
  photoAccepted: (n, max) => `${max} tadan ${n} ta rasm qabul qilindi.`,
  photoTooMany: (max, done) => `${max} tadan ortiq rasm sig'maydi. «${done}» tugmasini bosing.`,
  photoNeedOne: 'Kamida bitta rasm kerak.',
  photoOrDone: (done) => `Rasm yuboring yoki «${done}» tugmasini bosing.`,
  photoWrongStep: (menuNew) =>
    `Rasmlar so'rovnomaning oxirgi bosqichida kerak. «${menuNew}» tugmasini bosing.`,
  photoNoFile: 'Telegram faylni bermadi, rasmni yana yuboring.',
  photoDownloadFailed: 'Rasmni yuklab bo’lmadi, uni yana yuboring.',

  summaryBargain: 'savdolashsa bo’ladi',
  summaryTint: 'Tonirovka',
  summaryPhotos: 'Rasmlar',
  summarySeller: 'Sotuvchi',
  owners: (n) => `${n} ta egasi`,
  unitKm: 'km',
  unitL: 'l',
  published: (id) =>
    `E'lon tekshiruvga yuborildi. Moderator tasdiqlashi bilan u ilovada paydo bo'ladi — biz yozamiz.\nRaqami: <code>${id}</code>`,
  moderationApproved: (title) => `✅ <b>${title}</b> — e'lon tasdiqlandi va ilovada ko'rinmoqda.`,
  moderationRejected: (title, reason) =>
    `❌ <b>${title}</b> — e'lon rad etildi.\nSababi: ${reason}\n\nTuzatib, qaytadan joylashtiring.`,

  myEmpty: "Sizda hali e'lonlar yo'q.",
  myArchived: "ko'rsatuvdan olingan",
  myPending: 'tekshiruvda',
  myRejected: (reason) => `rad etilgan: ${reason}`,
  btnHide: "Ko'rsatuvdan olish",
  btnShow: "Ko'rsatuvga qaytarish",
  btnDelete: "O'chirish",
  cbNotFound: "E'lon topilmadi",
  cbDeleted: "O'chirildi",
  cbListingDeleted: "E'lon o'chirildi.",
  cbHidden: "Ko'rsatuvdan olindi",
  cbShown: "Ko'rsatuvga qaytarildi",

  cmdNew: "E'lon joylashtirish",
  cmdMy: "Mening e'lonlarim",
  cmdCancel: "So'rovnomani bekor qilish",
  cmdLang: "Tilni o'zgartirish",
  cmdSupport: "Qo'llab-quvvatlash",
};

const uzc: BotText = {
  start:
    'Бу AvtoLike боти. Бу ерда эълон жойлаштирилади, харидорлар эса уларни иловада суриб кўради.',
  menuNew: 'Эълон жойлаштириш',
  menuMy: 'Менинг эълонларим',
  menuLang: '🌐 Тил',
  menuSupport: '💬 Қўллаб-қувватлаш',
  supportText: (phone, telegram) =>
    'AvtoLike қўллаб-қувватлаш хизмати.\n\n' +
    `Телефон: ${phone}\nTelegram: ${telegram}\n\n` +
    'Бирор нарса ишламаса, эълон ноўрин рад этилса ёки маълумотларингизни ўчириш керак бўлса — ёзинг.',
  supportWrite: 'Телеграмга ёзиш',
  cancel: 'Бекор қилиш',
  done: 'Тайёр',
  skip: 'Ўтказиш',
  publish: 'Чоп этиш',
  otherBrand: 'Бошқа марка',
  otherColor: 'Бошқа ранг',
  shareContact: 'Рақамимни юбориш',
  langChanged: 'Тил ўзгартирилди.',
  formCancelled: 'Сўровнома бекор қилинди.',
  cancelled: 'Бекор қилинди.',
  chooseAction: 'Қуйидаги тугма орқали амални танланг.',
  chooseButton: 'Вариантни тугма орқали танланг.',
  chooseOrOther: (other) => `Тугма орқали танланг ёки «${other}» тугмасини босинг.`,
  confirmHint: (publish, cancel) => `«${publish}» ёки «${cancel}» тугмасини босинг.`,
  genericError: 'Нимадир нотўғри кетди. Охирги амални такрорланг.',

  askPhone:
    'Телефон рақамингиз — харидорлар шу рақамга қўнғироқ қилади.\nТугмани босинг ёки рақамни қўлда ёзинг.',
  errPhone: 'Рақамга ўхшамайди. Масалан: +998 90 123 45 67',
  askName: 'Исмингиз нима? Исмни харидор карточкада кўради.',
  errName: 'Исм 2 тадан 40 тагача белги.',
  askSellerType: 'Сиз хусусий шахсмисиз ёки автосалонми?',
  askBrand: 'Автомобил маркаси',
  askBrandFree: 'Маркани ёзинг. Масалан: Opel',
  errBrand: 'Марка 2 тадан 30 тагача белги.',
  askModel: 'Модел. Масалан: Malibu 2',
  errModel: 'Модел 30 тагача белги.',
  askYear: 'Ишлаб чиқарилган йили',
  errYear: (max) => `Йил 1950 дан ${max} гача.`,
  askPrice: 'Нарх АҚШ долларида. Фақат рақам, масалан: 18500',
  errPrice: 'Нарх 100 дан 1 000 000 $ гача.',
  askMileage: 'Юрган масофа, километрда',
  errMileage: 'Масофа 0 дан 1 500 000 км гача.',
  askOwners: 'Техпаспорт бўйича нечта эгаси бўлган?',
  errOwners: 'Эгалар сони 1 дан 20 гача.',
  askCondition: 'Машинанинг ҳолати',
  askCity: 'Шаҳар',
  askBody: 'Кузов тури',
  askFuel: 'Ёқилғи',
  askTransmission: 'Узатмалар қутиси',
  askDrive: 'Юритма',
  askEngine: 'Двигател ҳажми, литрда. Масалан: 1.5\nЭлектромобил учун 0 деб ёзинг',
  errEngine: 'Ҳажм 0 дан 8 литргача.',
  askColor: 'Ранг',
  askColorFree: 'Рангни ёзинг. Масалан: Тўқ кўк',
  errColor: 'Ранг 3 тадан 20 тагача белги.',
  askTint: 'Тонировка борми?',
  tintYes: 'Бор',
  tintNo: 'Йўқ',
  askTintFree: 'Тонировкага рухсатнома қачонгача амал қилади? Масалан: 2027 йил мартгача',
  errTint: 'Муддатни 2 тадан 100 тагача белги билан ёзинг. Масалан: 2027 йил мартгача',
  askNegotiable: 'Савдолашиш мумкинми?',
  bargainYes: 'Савдолашса бўлади',
  bargainNo: 'Нарх қатъий',
  askDescription: 'Машинани тавсифланг: ҳолати, нима алмаштирилган, жиҳозлари.',
  errDescription: 'Тавсиф 1000 тагача белги.',

  askPhotos: (max, done) =>
    `Машина расмларини юборинг (${max} тагача). Биринчиси муқова бўлади.\n` +
    `Давлат рақамини ўзимиз ёпамиз.\nТугатгач — «${done}» тугмасини босинг.`,
  photoAccepted: (n, max) => `${max} тадан ${n} та расм қабул қилинди.`,
  photoTooMany: (max, done) => `${max} тадан ортиқ расм сиғмайди. «${done}» тугмасини босинг.`,
  photoNeedOne: 'Камида битта расм керак.',
  photoOrDone: (done) => `Расм юборинг ёки «${done}» тугмасини босинг.`,
  photoWrongStep: (menuNew) =>
    `Расмлар сўровноманинг охирги босқичида керак. «${menuNew}» тугмасини босинг.`,
  photoNoFile: 'Телеграм файлни бермади, расмни яна юборинг.',
  photoDownloadFailed: 'Расмни юклаб бўлмади, уни яна юборинг.',

  summaryBargain: 'савдолашса бўлади',
  summaryTint: 'Тонировка',
  summaryPhotos: 'Расмлар',
  summarySeller: 'Сотувчи',
  owners: (n) => `${n} та эгаси`,
  unitKm: 'км',
  unitL: 'л',
  published: (id) =>
    `Эълон текширувга юборилди. Модератор тасдиқлаши билан у иловада пайдо бўлади — биз ёзамиз.\nРақами: <code>${id}</code>`,
  moderationApproved: (title) => `✅ <b>${title}</b> — эълон тасдиқланди ва иловада кўриняпти.`,
  moderationRejected: (title, reason) =>
    `❌ <b>${title}</b> — эълон рад этилди.\nСабаби: ${reason}\n\nТузатиб, қайтадан жойлаштиринг.`,

  myEmpty: 'Сизда ҳали эълонлар йўқ.',
  myArchived: 'кўрсатувдан олинган',
  myPending: 'текширувда',
  myRejected: (reason) => `рад этилган: ${reason}`,
  btnHide: 'Кўрсатувдан олиш',
  btnShow: 'Кўрсатувга қайтариш',
  btnDelete: 'Ўчириш',
  cbNotFound: 'Эълон топилмади',
  cbDeleted: 'Ўчирилди',
  cbListingDeleted: 'Эълон ўчирилди.',
  cbHidden: 'Кўрсатувдан олинди',
  cbShown: 'Кўрсатувга қайтарилди',

  cmdNew: 'Эълон жойлаштириш',
  cmdMy: 'Менинг эълонларим',
  cmdCancel: 'Сўровномани бекор қилиш',
  cmdLang: 'Тилни ўзгартириш',
  cmdSupport: 'Қўллаб-қувватлаш',
};

export const TEXT: Record<Lang, BotText> = { ru, uz, uzc };
export type { BotText };
