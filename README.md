# AvtoLike — Tinder для машин

Мобильное приложение на **React Native + Expo (SDK 54)**: карточки автомобилей свайпаются
влево/вправо, как в Tinder.

> SDK 54 выбран под установленный на телефоне Expo Go 54.x. Expo Go понимает ровно одну
> версию SDK, поэтому обновлять SDK проекта можно только вместе с приложением на телефоне
> (`npx expo install expo@latest --fix`).

## Как запустить

```bash
npm install          # один раз
npx expo start       # QR-код -> откройте в приложении Expo Go на телефоне
```

- `npm run ios` / `npm run android` — запуск в симуляторе (нужен Xcode / Android Studio)
- `npm run web` — быстрый предпросмотр в браузере

## Что умеет

| Жест / действие | Что происходит |
|---|---|
| Свайп вправо (или ♥) | В избранное, для «выгодных» — экран «Отличный выбор!» |
| Свайп влево (или ✕) | Пропустить |
| Свайп вверх (или ⚡) | Заявка на тест-драйв |
| Кнопка ↺ | Отменить последний свайп (карточка прилетает обратно) |
| Тап «Подробнее» | Полная карточка: характеристики, описание, продавец, звонок |

Ещё есть фильтры (марка, кузов, коробка, цена, год), вкладка «Избранное» с двумя списками
и сохранение состояния между запусками (AsyncStorage).

## Стек

- **Expo SDK 54** / React Native 0.81 / React 19 — один код на iOS и Android
- **react-native-gesture-handler** + **react-native-reanimated 4** — свайп на UI-потоке, 60 fps
- **expo-image** (кэш картинок), **expo-haptics** (вибро-отклик), **expo-linear-gradient**
- **@react-native-async-storage/async-storage** — локальное хранение лайков и фильтров
- TypeScript

## Структура

```
App.tsx                        состояние приложения, вкладки, модалки
src/
  data/cars.ts                 демо-каталог — теперь только источник для сида базы
  types.ts                     Car, Filters, SwipeDirection
  storage.ts                   AsyncStorage
  theme.ts                     цвета, радиусы, тени
  components/
    SwipeDeck.tsx              колода: жест, физика, штампы НРАВИТСЯ/МИМО/ТЕСТ-ДРАЙВ
    CarCard.tsx                карточка машины
    ActionBar.tsx              кнопки под колодой
    FiltersSheet.tsx           шторка фильтров
    MatchModal.tsx             экран «Отличный выбор!»
    TabBar.tsx                 нижняя навигация
  screens/
    DeckScreen.tsx             экран подбора
    LikesScreen.tsx            избранное + тест-драйвы
    CarDetailScreen.tsx        детальная карточка
  utils/                       формат цен/пробега, фильтрация
  api/client.ts                запросы к бэкенду
  CatalogContext.tsx           каталог из API: загрузка, ошибка, повтор
server/
  prisma/schema.prisma         Seller, Listing, Photo — та же доменная модель
  src/api.ts                   Fastify: /api/health, /api/cars, /api/cars/:id
  src/bot.ts                   телеграм-бот: анкета объявления, мои объявления
  src/s3.ts                    загрузка фото в MinIO/S3
  src/mapper.ts                строка базы -> объект Car для клиента
  src/seed.ts                  засев базы из src/data/cars.ts
```

## Бэкенд и бот

Объявления заводятся через телеграм-бота ([@avtolike_uz_bot](https://t.me/avtolike_uz_bot)),
приложение их только читает. Бот и API пишут в одну базу, поэтому опубликованное
объявление появляется в колоде после перезагрузки каталога.

Нужны PostgreSQL и MinIO (локальная замена S3, фото из телеграма лежат в нём):

```bash
brew services start postgresql@17
createdb avtolike
minio server ~/minio-data --address :9000 &   # логин/пароль по умолчанию minioadmin

cd server
npm install
cp .env.example .env         # DATABASE_URL, BOT_TOKEN, S3_*
npx prisma migrate deploy
npm run seed                 # демо-каталог из src/data/cars.ts
npm run api                  # http://localhost:3000
npm run bot                  # в отдельном терминале
```

Бот ведёт продавца по анкете (марка, модель, характеристики, фото), кладёт фото
в бакет и создаёт объявление. `/my` — список своих объявлений: снять с показа,
вернуть, удалить.

> Симулятор ходит на `localhost` нормально. Для физического телефона в корневой
> `.env` нужен `EXPO_PUBLIC_API_URL=http://<LAN-адрес>:3000`, а в `server/.env` —
> тот же адрес в `S3_PUBLIC_URL`: иначе телефон не откроет ни API, ни фото.

## Что дальше

- Авторизация по номеру телефона (сейчас вход мокнутый) и чат с продавцом
- Пагинация и серверная фильтрация каталога — сейчас он отдаётся целиком
- Публикация: `eas build` для App Store / Google Play

Фото объявлений — Unsplash (демо-данные).
