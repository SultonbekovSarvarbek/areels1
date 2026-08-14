import { BodyType, City, Condition, Drive, Fuel, SellerType, Transmission } from './types';

export type Lang = 'ru' | 'uz' | 'uzc';

export const LANGS: { id: Lang; label: string; short: string }[] = [
  { id: 'ru', label: 'Русский', short: 'RU' },
  { id: 'uz', label: "O'zbekcha", short: 'UZ' },
  { id: 'uzc', label: 'Ўзбекча', short: 'ЎЗ' },
];

interface Dict {
  // Навигация
  tabDeck: string;
  tabLikes: string;
  tabProfile: string;

  // Колода
  stampSkip: string;
  stampLike: string;
  details: string;
  showPhone: string;
  remaining: (left: number, total: number) => string;
  noAds: string;
  deckEmptyTitle: string;
  deckEmptyText: string;
  changeFilters: string;
  loadingCatalog: string;
  loadFailedTitle: string;
  loadFailedText: string;
  retry: string;
  sellCtaTitle: string;
  sellCtaText: string;

  // Фильтры
  filters: string;
  fBrand: string;
  fBody: string;
  fTransmission: string;
  fPriceTo: string;
  /** Крайнее правое положение ползунка цены — ограничения нет. */
  anyPrice: string;
  fYearFrom: string;
  reset: string;
  show: (n: number) => string;

  // Детали
  specs: string;
  sMileage: string;
  sEngine: string;
  sTransmission: string;
  sDrive: string;
  sFuel: string;
  sBody: string;
  sColor: string;
  sCondition: string;
  sOwners: string;
  sYear: string;
  description: string;
  seller: string;
  offerMake: string;
  offerMadeFor: (price: string) => string;
  offerTapToChange: string;
  shareLabel: string;
  favAdd: string;
  favRemove: string;
  openFailTitle: string;
  openFailText: string;
  shareFailTitle: string;
  shareFailText: string;

  // Избранное
  favourites: string;
  favCount: (n: number) => string;
  favEmptyTitle: string;
  favEmptyText: string;
  favClear: string;
  favClearTitle: string;
  favClearText: string;
  listEmpty: string;

  // Профиль
  profile: string;
  notSignedIn: string;
  signInPrompt: string;
  signInByPhone: string;
  statFavourites: string;
  statOffers: string;
  myOffers: string;
  offersEmpty: string;
  sent: string;
  noBargain: string;
  belowAsking: (sum: string) => string;
  signOut: string;
  signOutTitle: string;
  signOutText: string;
  cancel: string;
  language: string;
  /** Заголовок раздела со ссылками на условия и политику (../legal.ts). */
  documents: string;
  support: string;
  supportWrite: string;
  /** Ручное обновление каталога: кнопка в шапке колоды и жест в избранном. */
  refresh: string;

  // Вход
  authTitle: string;
  authSubtitle: string;
  authPhone: string;
  authName: string;
  authNamePlaceholder: string;
  authGetCode: string;
  authCodeTitle: string;
  authCodeSentTo: (phone: string) => string;
  authDemoHint: string;
  authConfirm: string;
  authResendIn: (sec: number) => string;
  authResend: string;
  errPhone: string;
  errName: string;
  errCode: string;

  // Предложение
  offerTitle: string;
  offerAsking: (price: string) => string;
  offerSame: string;
  offerBelow: (sum: string, percent: number) => string;
  offerAbove: (sum: string) => string;
  offerComment: string;
  offerSend: string;
  offerChange: string;
  offerDemoNote: string;

  // Готовность продавца торговаться (на карточке)
  bargain: string;
  bargainNo: string;

  // Единицы
  unitKm: string;
  unitL: string;
  unitHp: string;

  bodyType: Record<BodyType, string>;
  fuel: Record<Fuel, string>;
  transmission: Record<Transmission, string>;
  drive: Record<Drive, string>;
  condition: Record<Condition, string>;
  sellerType: Record<SellerType, string>;
  city: Record<City, string>;
}

/** Русские склонения: 1 объявление, 2 объявления, 5 объявлений. */
const plural = (n: number, one: string, few: string, many: string) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
};

const ru: Dict = {
  tabDeck: 'Подбор',
  tabLikes: 'Избранное',
  tabProfile: 'Профиль',

  stampSkip: 'ПРОПУСК',
  stampLike: 'НРАВИТСЯ',
  details: 'Подробнее',
  showPhone: 'Показать номер',
  remaining: (left, total) => `Осталось ${left} из ${total}`,
  noAds: 'Нет объявлений',
  deckEmptyTitle: 'Ничего не найдено',
  deckEmptyText: 'Под текущие фильтры не подходит ни одно объявление. Попробуйте смягчить их.',
  changeFilters: 'Изменить фильтры',
  loadingCatalog: 'Загружаем объявления…',
  loadFailedTitle: 'Каталог не загрузился',
  loadFailedText: 'Проверьте соединение и попробуйте ещё раз.',
  retry: 'Повторить',
  sellCtaTitle: 'Хотите продать машину?',
  sellCtaText: 'Создайте объявление в Telegram-боте',

  filters: 'Фильтры',
  fBrand: 'Марка',
  fBody: 'Кузов',
  fTransmission: 'Коробка',
  fPriceTo: 'Цена до',
  anyPrice: 'Любая',
  fYearFrom: 'Год от',
  reset: 'Сбросить',
  show: (n) => `Показать (${n})`,

  specs: 'Характеристики',
  sMileage: 'Пробег',
  sEngine: 'Двигатель',
  sTransmission: 'Коробка',
  sDrive: 'Привод',
  sFuel: 'Топливо',
  sBody: 'Кузов',
  sColor: 'Цвет',
  sCondition: 'Состояние',
  sOwners: 'Владельцев',
  sYear: 'Год',
  description: 'Описание',
  seller: 'Продавец',
  offerMake: 'Предложить свою цену',
  offerMadeFor: (price) => `Вы предложили ${price}`,
  offerTapToChange: 'Нажмите, чтобы изменить',
  shareLabel: 'Поделиться объявлением',
  favAdd: 'В избранное',
  favRemove: 'Убрать из избранного',
  openFailTitle: 'Не удалось открыть',
  openFailText: 'На устройстве нет приложения для этого действия.',
  shareFailTitle: 'Не удалось поделиться',
  shareFailText: 'Попробуйте ещё раз.',

  favourites: 'Избранное',
  favCount: (n) => `${n} ${plural(n, 'объявление', 'объявления', 'объявлений')}`,
  favEmptyTitle: 'Пока пусто',
  favEmptyText: 'Свайпайте карточки вправо — понравившиеся машины появятся здесь.',
  favClear: 'Очистить всё',
  favClearTitle: 'Очистить избранное?',
  favClearText: 'Все сохранённые объявления пропадут из списка.',
  listEmpty: 'Список пуст',

  profile: 'Профиль',
  notSignedIn: 'Вы не вошли',
  signInPrompt: 'Войдите, чтобы предлагать свою цену продавцам и видеть историю предложений.',
  signInByPhone: 'Войти по номеру',
  statFavourites: 'в избранном',
  statOffers: 'предложений',
  myOffers: 'Мои предложения',
  offersEmpty: 'Вы ещё не предлагали цену. Откройте объявление и нажмите «Предложить свою цену».',
  sent: 'Отправлено',
  noBargain: 'Без торга',
  belowAsking: (sum) => `−${sum} от объявления`,
  signOut: 'Выйти',
  signOutTitle: 'Выйти из аккаунта?',
  signOutText: 'Отправленные предложения будут удалены с устройства.',
  cancel: 'Отмена',
  language: 'Язык',
  documents: 'Документы',
  support: 'Поддержка',
  supportWrite: 'Написать в Telegram',
  refresh: 'Обновить',

  authTitle: 'Вход в AvtoLike',
  authSubtitle: 'Чтобы предложить цену, продавец должен знать, с кем говорит',
  authPhone: 'Номер телефона',
  authName: 'Имя',
  authNamePlaceholder: 'Как к вам обращаться',
  authGetCode: 'Получить код',
  authCodeTitle: 'Код из SMS',
  authCodeSentTo: (phone) => `Отправили на ${phone}`,
  authDemoHint: 'Демо-режим: SMS не отправляется, подойдут любые 4 цифры',
  authConfirm: 'Подтвердить',
  authResendIn: (sec) => `Отправить снова через ${sec} с`,
  authResend: 'Отправить код снова',
  errPhone: 'Номер должен содержать 9 цифр после +998',
  errName: 'Как к вам обращаться? Минимум 2 символа',
  errCode: 'Код состоит из 4 цифр',

  offerTitle: 'Предложить цену',
  offerAsking: (price) => `Цена в объявлении ${price}`,
  offerSame: 'Ровно как в объявлении',
  offerBelow: (sum, percent) => `На ${sum} ниже — минус ${percent}%`,
  offerAbove: (sum) => `На ${sum} выше объявления`,
  offerComment: 'Комментарий продавцу — необязательно',
  offerSend: 'Отправить предложение',
  offerChange: 'Изменить предложение',
  offerDemoNote: 'Демо-режим: предложение сохраняется на устройстве и продавцу пока не уходит',

  bargain: 'Торг уместен',
  bargainNo: 'Без торга',

  unitKm: 'км',
  unitL: 'л',
  unitHp: 'л.с.',

  bodyType: {
    sedan: 'Седан',
    hatchback: 'Хэтчбек',
    crossover: 'Кроссовер',
    suv: 'Внедорожник',
    minivan: 'Минивэн',
    coupe: 'Купе',
    wagon: 'Универсал',
    cabrio: 'Кабриолет',
    pickup: 'Пикап',
    other: 'Другой',
  },
  fuel: {
    petrol: 'Бензин',
    gas: 'Газ-бензин',
    diesel: 'Дизель',
    hybrid: 'Гибрид',
    electric: 'Электро',
  },
  transmission: { manual: 'Механическая', auto: 'Автоматическая', other: 'Другая' },
  drive: { fwd: 'Передний', rwd: 'Задний', awd: 'Полный' },
  condition: {
    excellent: 'Отличное',
    good: 'Хорошее',
    average: 'Среднее',
    needsRepair: 'Требует ремонта',
  },
  sellerType: { private: 'Частник', dealer: 'Автосалон' },
  city: {
    tashkent: 'Ташкент',
    samarkand: 'Самарканд',
    bukhara: 'Бухара',
    namangan: 'Наманган',
    andijan: 'Андижан',
    fergana: 'Фергана',
    karshi: 'Карши',
    jizzakh: 'Джизак',
    termez: 'Термез',
  },
};

const uz: Dict = {
  tabDeck: 'Tanlash',
  tabLikes: 'Saralangan',
  tabProfile: 'Profil',

  stampSkip: "O'TKAZISH",
  stampLike: 'YOQDI',
  details: 'Batafsil',
  showPhone: "Raqamni ko'rsatish",
  remaining: (left, total) => `${total} tadan ${left} ta qoldi`,
  noAds: "E'lonlar yo'q",
  deckEmptyTitle: 'Hech narsa topilmadi',
  deckEmptyText:
    "Joriy filtrlarga birorta ham e'lon mos kelmadi. Ularni yumshatib ko'ring.",
  changeFilters: "Filtrlarni o'zgartirish",
  loadingCatalog: "E'lonlar yuklanmoqda…",
  loadFailedTitle: 'Katalog yuklanmadi',
  loadFailedText: "Aloqani tekshiring va qaytadan urinib ko'ring.",
  retry: 'Qayta urinish',
  sellCtaTitle: 'Mashinangizni sotmoqchimisiz?',
  sellCtaText: "Telegram-botda e'lon joylang",

  filters: 'Filtrlar',
  fBrand: 'Marka',
  fBody: 'Kuzov',
  fTransmission: 'Uzatmalar qutisi',
  fPriceTo: 'Narx (gacha)',
  anyPrice: 'Har qanday',
  fYearFrom: 'Yil (dan)',
  reset: 'Tozalash',
  show: (n) => `Ko'rsatish (${n})`,

  specs: 'Xususiyatlar',
  sMileage: 'Yurgan masofa',
  sEngine: 'Dvigatel',
  sTransmission: 'Uzatmalar qutisi',
  sDrive: 'Yuritma',
  sFuel: "Yoqilg'i",
  sBody: 'Kuzov',
  sColor: 'Rang',
  sCondition: 'Holati',
  sOwners: 'Egalar soni',
  sYear: 'Yil',
  description: 'Tavsif',
  seller: 'Sotuvchi',
  offerMake: "O'z narxingizni taklif qiling",
  offerMadeFor: (price) => `Siz ${price} taklif qildingiz`,
  offerTapToChange: "O'zgartirish uchun bosing",
  shareLabel: "E'lonni ulashish",
  favAdd: "Saralanganga qo'shish",
  favRemove: 'Saralangandan olib tashlash',
  openFailTitle: 'Ochib bo’lmadi',
  openFailText: "Qurilmada bu amal uchun ilova yo'q.",
  shareFailTitle: "Ulashib bo'lmadi",
  shareFailText: 'Yana bir bor urinib ko’ring.',

  favourites: 'Saralangan',
  favCount: (n) => `${n} ta e'lon`,
  favEmptyTitle: "Hozircha bo'sh",
  favEmptyText: "Kartochkalarni o'ngga suring — yoqqan avtomobillar shu yerda paydo bo'ladi.",
  favClear: 'Hammasini tozalash',
  favClearTitle: 'Saralangan tozalansinmi?',
  favClearText: "Saqlangan barcha e'lonlar ro'yxatdan yo'qoladi.",
  listEmpty: "Ro'yxat bo'sh",

  profile: 'Profil',
  notSignedIn: 'Siz kirmagansiz',
  signInPrompt:
    "Sotuvchilarga o'z narxingizni taklif qilish va takliflar tarixini ko'rish uchun tizimga kiring.",
  signInByPhone: 'Raqam orqali kirish',
  statFavourites: 'saralangan',
  statOffers: 'taklif',
  myOffers: 'Mening takliflarim',
  offersEmpty:
    "Siz hali narx taklif qilmagansiz. E'lonni oching va «O'z narxingizni taklif qiling» tugmasini bosing.",
  sent: 'Yuborildi',
  noBargain: 'Savdolashuvsiz',
  belowAsking: (sum) => `E'londan ${sum} kam`,
  signOut: 'Chiqish',
  signOutTitle: 'Hisobdan chiqasizmi?',
  signOutText: "Yuborilgan takliflar qurilmadan o'chiriladi.",
  cancel: 'Bekor qilish',
  language: 'Til',
  documents: 'Hujjatlar',
  support: "Qo'llab-quvvatlash",
  supportWrite: 'Telegramga yozish',
  refresh: 'Yangilash',

  authTitle: "AvtoLike'ga kirish",
  authSubtitle: 'Narx taklif qilish uchun sotuvchi kim bilan gaplashayotganini bilishi kerak',
  authPhone: 'Telefon raqami',
  authName: 'Ism',
  authNamePlaceholder: 'Sizga qanday murojaat qilaylik',
  authGetCode: 'Kod olish',
  authCodeTitle: 'SMS kodi',
  authCodeSentTo: (phone) => `${phone} raqamiga yubordik`,
  authDemoHint: "Demo rejim: SMS yuborilmaydi, istalgan 4 ta raqam to'g'ri keladi",
  authConfirm: 'Tasdiqlash',
  authResendIn: (sec) => `Qayta yuborish ${sec} soniyadan keyin`,
  authResend: 'Kodni qayta yuborish',
  errPhone: "+998 dan keyin 9 ta raqam bo'lishi kerak",
  errName: 'Ismingiz kamida 2 ta belgidan iborat bo’lsin',
  errCode: "Kod 4 ta raqamdan iborat",

  offerTitle: 'Narx taklif qilish',
  offerAsking: (price) => `E'londagi narx ${price}`,
  offerSame: "E'londagi narx bilan bir xil",
  offerBelow: (sum, percent) => `${sum} kam — minus ${percent}%`,
  offerAbove: (sum) => `E'londan ${sum} ko'p`,
  offerComment: 'Sotuvchiga izoh — majburiy emas',
  offerSend: 'Taklifni yuborish',
  offerChange: "Taklifni o'zgartirish",
  offerDemoNote:
    "Demo rejim: taklif qurilmada saqlanadi va hozircha sotuvchiga yetib bormaydi",

  bargain: 'Savdolashsa bo‘ladi',
  bargainNo: 'Savdo yo‘q',

  unitKm: 'km',
  unitL: 'l',
  unitHp: 'o.k.',

  bodyType: {
    sedan: 'Sedan',
    hatchback: 'Xetchbek',
    crossover: 'Krossover',
    suv: "Yo'ltanlamas",
    minivan: 'Miniven',
    coupe: 'Kupe',
    wagon: 'Universal',
    cabrio: 'Kabriolet',
    pickup: 'Pikap',
    other: 'Boshqa',
  },
  fuel: {
    petrol: 'Benzin',
    gas: 'Gaz-benzin',
    diesel: 'Dizel',
    hybrid: 'Gibrid',
    electric: 'Elektr',
  },
  transmission: { manual: 'Mexanika', auto: 'Avtomat', other: 'Boshqa' },
  drive: { fwd: 'Old', rwd: 'Orqa', awd: "To'liq" },
  condition: {
    excellent: "A'lo",
    good: 'Yaxshi',
    average: "O'rtacha",
    needsRepair: "Ta'mir talab",
  },
  sellerType: { private: 'Xususiy shaxs', dealer: 'Avtosalon' },
  city: {
    tashkent: 'Toshkent',
    samarkand: 'Samarqand',
    bukhara: 'Buxoro',
    namangan: 'Namangan',
    andijan: 'Andijon',
    fergana: "Farg'ona",
    karshi: 'Qarshi',
    jizzakh: 'Jizzax',
    termez: 'Termiz',
  },
};

const uzc: Dict = {
  tabDeck: 'Танлаш',
  tabLikes: 'Сараланган',
  tabProfile: 'Профил',

  stampSkip: 'ЎТКАЗИШ',
  stampLike: 'ЁҚДИ',
  details: 'Батафсил',
  showPhone: 'Рақамни кўрсатиш',
  remaining: (left, total) => `${total} тадан ${left} та қолди`,
  noAds: 'Эълонлар йўқ',
  deckEmptyTitle: 'Ҳеч нарса топилмади',
  deckEmptyText: 'Жорий филтрларга битта ҳам эълон мос келмади. Уларни юмшатиб кўринг.',
  changeFilters: 'Филтрларни ўзгартириш',
  loadingCatalog: 'Эълонлар юкланмоқда…',
  loadFailedTitle: 'Каталог юкланмади',
  loadFailedText: 'Алоқани текширинг ва қайтадан уриниб кўринг.',
  retry: 'Қайта уриниш',
  sellCtaTitle: 'Машинангизни сотмоқчимисиз?',
  sellCtaText: 'Telegram-ботда эълон жойланг',

  filters: 'Филтрлар',
  fBrand: 'Марка',
  fBody: 'Кузов',
  fTransmission: 'Узатмалар қутиси',
  fPriceTo: 'Нарх (гача)',
  anyPrice: 'Ҳар қандай',
  fYearFrom: 'Йил (дан)',
  reset: 'Тозалаш',
  show: (n) => `Кўрсатиш (${n})`,

  specs: 'Хусусиятлар',
  sMileage: 'Юрган масофа',
  sEngine: 'Двигател',
  sTransmission: 'Узатмалар қутиси',
  sDrive: 'Юритма',
  sFuel: 'Ёқилғи',
  sBody: 'Кузов',
  sColor: 'Ранг',
  sCondition: 'Ҳолати',
  sOwners: 'Эгалар сони',
  sYear: 'Йил',
  description: 'Тавсиф',
  seller: 'Сотувчи',
  offerMake: 'Ўз нархингизни таклиф қилинг',
  offerMadeFor: (price) => `Сиз ${price} таклиф қилдингиз`,
  offerTapToChange: 'Ўзгартириш учун босинг',
  shareLabel: 'Эълонни улашиш',
  favAdd: 'Сараланганга қўшиш',
  favRemove: 'Саралангандан олиб ташлаш',
  openFailTitle: 'Очиб бўлмади',
  openFailText: 'Қурилмада бу амал учун илова йўқ.',
  shareFailTitle: 'Улашиб бўлмади',
  shareFailText: 'Яна бир бор уриниб кўринг.',

  favourites: 'Сараланган',
  favCount: (n) => `${n} та эълон`,
  favEmptyTitle: 'Ҳозирча бўш',
  favEmptyText: 'Карточкаларни ўнгга суринг — ёққан автомобиллар шу ерда пайдо бўлади.',
  favClear: 'Ҳаммасини тозалаш',
  favClearTitle: 'Сараланган тозалансинми?',
  favClearText: 'Сақланган барча эълонлар рўйхатдан йўқолади.',
  listEmpty: 'Рўйхат бўш',

  profile: 'Профил',
  notSignedIn: 'Сиз кирмагансиз',
  signInPrompt:
    'Сотувчиларга ўз нархингизни таклиф қилиш ва таклифлар тарихини кўриш учун тизимга киринг.',
  signInByPhone: 'Рақам орқали кириш',
  statFavourites: 'сараланган',
  statOffers: 'таклиф',
  myOffers: 'Менинг таклифларим',
  offersEmpty:
    'Сиз ҳали нарх таклиф қилмагансиз. Эълонни очинг ва «Ўз нархингизни таклиф қилинг» тугмасини босинг.',
  sent: 'Юборилди',
  noBargain: 'Савдолашувсиз',
  belowAsking: (sum) => `Эълондан ${sum} кам`,
  signOut: 'Чиқиш',
  signOutTitle: 'Ҳисобдан чиқасизми?',
  signOutText: 'Юборилган таклифлар қурилмадан ўчирилади.',
  cancel: 'Бекор қилиш',
  language: 'Тил',
  documents: 'Ҳужжатлар',
  support: 'Қўллаб-қувватлаш',
  supportWrite: 'Телеграмга ёзиш',
  refresh: 'Янгилаш',

  authTitle: 'AvtoLike га кириш',
  authSubtitle: 'Нарх таклиф қилиш учун сотувчи ким билан гаплашаётганини билиши керак',
  authPhone: 'Телефон рақами',
  authName: 'Исм',
  authNamePlaceholder: 'Сизга қандай мурожаат қилайлик',
  authGetCode: 'Код олиш',
  authCodeTitle: 'СМС коди',
  authCodeSentTo: (phone) => `${phone} рақамига юбордик`,
  authDemoHint: 'Демо режим: СМС юборилмайди, исталган 4 та рақам тўғри келади',
  authConfirm: 'Тасдиқлаш',
  authResendIn: (sec) => `Қайта юбориш ${sec} сониядан кейин`,
  authResend: 'Кодни қайта юбориш',
  errPhone: '+998 дан кейин 9 та рақам бўлиши керак',
  errName: 'Исмингиз камида 2 та белгидан иборат бўлсин',
  errCode: 'Код 4 та рақамдан иборат',

  offerTitle: 'Нарх таклиф қилиш',
  offerAsking: (price) => `Эълондаги нарх ${price}`,
  offerSame: 'Эълондаги нарх билан бир хил',
  offerBelow: (sum, percent) => `${sum} кам — минус ${percent}%`,
  offerAbove: (sum) => `Эълондан ${sum} кўп`,
  offerComment: 'Сотувчига изоҳ — мажбурий эмас',
  offerSend: 'Таклифни юбориш',
  offerChange: 'Таклифни ўзгартириш',
  offerDemoNote: 'Демо режим: таклиф қурилмада сақланади ва ҳозирча сотувчига етиб бормайди',

  bargain: 'Савдолашса бўлади',
  bargainNo: 'Савдо йўқ',

  unitKm: 'км',
  unitL: 'л',
  unitHp: 'о.к.',

  bodyType: {
    sedan: 'Седан',
    hatchback: 'Хетчбек',
    crossover: 'Кроссовер',
    suv: 'Йўлтанламас',
    minivan: 'Минивэн',
    coupe: 'Купе',
    wagon: 'Универсал',
    cabrio: 'Кабриолет',
    pickup: 'Пикап',
    other: 'Бошқа',
  },
  fuel: {
    petrol: 'Бензин',
    gas: 'Газ-бензин',
    diesel: 'Дизел',
    hybrid: 'Гибрид',
    electric: 'Электр',
  },
  transmission: { manual: 'Механика', auto: 'Автомат', other: 'Бошқа' },
  drive: { fwd: 'Олд', rwd: 'Орқа', awd: 'Тўлиқ' },
  condition: {
    excellent: 'Аъло',
    good: 'Яхши',
    average: 'Ўртача',
    needsRepair: 'Таъмир талаб',
  },
  sellerType: { private: 'Хусусий шахс', dealer: 'Автосалон' },
  city: {
    tashkent: 'Тошкент',
    samarkand: 'Самарқанд',
    bukhara: 'Бухоро',
    namangan: 'Наманган',
    andijan: 'Андижон',
    fergana: 'Фарғона',
    karshi: 'Қарши',
    jizzakh: 'Жиззах',
    termez: 'Термиз',
  },
};

export const dictionaries: Record<Lang, Dict> = { ru, uz, uzc };
export type { Dict };
