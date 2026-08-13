/**
 * Замазывание госномеров на фото объявления.
 *
 * Продавец фотографирует машину как есть, вместе с номером, а объявление потом
 * листают все подряд: по номеру пробивают владельца и звонят «по объявлению»
 * мимо приложения. Поэтому номер прячем сами и молча — просить продавца
 * замазывать его вручную бессмысленно, никто не будет.
 *
 * Детектор — каскад Хаара из поставки OpenCV (assets/), считает его WASM-сборка
 * opencv-js. Выбор в пользу локального распознавания, а не облачного API: фото
 * продавца не должно уезжать на сторонний сервис, а ключей и счёта за кадры у
 * проекта нет. Плата за это — точность: номер под сильным углом, издалека или
 * в тени каскад пропускает. Это не сейф, а разумная гигиена по умолчанию.
 *
 * Пиксели, а не блюр: блюр на мелком номере остаётся читаемым, а крупная сетка
 * ещё и выглядит как осознанное решение, а не как смазанное фото.
 */

import cvLoader from '@techstark/opencv-js';
import type * as CV from '@techstark/opencv-js';
import { Jimp } from 'jimp';
import { readFile } from 'node:fs/promises';

type Rect = { x: number; y: number; width: number; height: number };

const CASCADE_FILE = new URL('../assets/haarcascade_russian_plate_number.xml', import.meta.url);
/** Имя внутри виртуальной ФС emscripten — оттуда каскад читает уже сам OpenCV. */
const CASCADE_VFS = 'plate.xml';

/**
 * Каскад обучен на окне 60×20, а узбекская пластина длиннее (примерно 4,6:1):
 * находка садится на середину номера и часто обрезает края. Расширяем
 * прямоугольник, чтобы под сеткой оказался весь номер целиком.
 */
const PAD_X = 0.18;
const PAD_Y = 0.35;

/**
 * Детектим на уменьшенной копии: на 4000 px от современного телефона каскад
 * работает секундами, а номер и в 1024 px остаётся различимым для детектора.
 */
const DETECT_WIDTH = 1024;

/**
 * Экспорт пакета — сам объект cv, который до инициализации WASM пуст и умеет
 * только then(). Ждём именно через then, а не `await cvLoader`: cv остаётся
 * thenable и после готовности, а await по спецификации разворачивает результат
 * снова и снова — процесс уходит в вечный цикл, не отдав ни строчки лога.
 */
const cv = cvLoader as unknown as typeof CV;
const opencvReady = new Promise<void>((resolve, reject) => {
  (cvLoader as unknown as PromiseLike<unknown>).then(() => resolve(), reject);
});

let detector: Promise<CV.CascadeClassifier> | null = null;

async function loadDetector(): Promise<CV.CascadeClassifier> {
  await opencvReady;

  const xml = await readFile(CASCADE_FILE);
  // Файловая система emscripten живёт в памяти процесса: кладём каскад туда
  // один раз, дальше OpenCV читает его как обычный путь.
  cv.FS_createDataFile('/', CASCADE_VFS, new Uint8Array(xml), true, false, false);

  const classifier = new cv.CascadeClassifier();
  if (!classifier.load(CASCADE_VFS)) {
    classifier.delete();
    throw new Error('Не удалось прочитать каскад номеров');
  }

  return classifier;
}

/** Каскад грузится один раз на процесс: разбор XML стоит дороже самой детекции. */
function getDetector(): Promise<CV.CascadeClassifier> {
  detector ??= loadDetector().catch((error) => {
    detector = null; // следующая фотография попробует ещё раз
    throw error;
  });
  return detector;
}

/** Прямоугольники номеров в координатах переданного изображения. */
function detect(
  classifier: CV.CascadeClassifier,
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Rect[] {
  const source = cv.matFromImageData({ data, width, height });
  const gray = new cv.Mat();
  const found = new cv.RectVector();

  try {
    cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY);
    // Номер — светлое пятно с тёмными знаками; выравнивание гистограммы вытягивает
    // его из пересвеченного капота и из тени под бампером одинаково.
    cv.equalizeHist(gray, gray);

    /**
     * Окно каскада — 3:1, границы подобраны на реальных фото машин. Ниже 9%
     * ширины кадра знаки не прочитать и в оригинале, выше половины кадра
     * пластина не бывает даже на съёмке вплотную, зато каскад в этих размерах
     * охотно «узнаёт» номер в асфальте.
     */
    const minWidth = Math.round(width * 0.09);
    const maxWidth = Math.round(width * 0.5);
    classifier.detectMultiScale(
      gray,
      found,
      1.08,
      // Четыре соседа — потолок для этого каскада: с шестью он перестаёт видеть
      // и настоящие номера. Изредка сетка ложится мимо, на бампер или дорогу;
      // это лучше, чем опубликованный номер, и заметно только вблизи.
      4,
      0,
      new cv.Size(minWidth, Math.round(minWidth / 3)),
      new cv.Size(maxWidth, Math.round(maxWidth / 3)),
    );

    const rects: Rect[] = [];
    for (let i = 0; i < found.size(); i += 1) {
      const { x, y, width: w, height: h } = found.get(i);
      rects.push({ x, y, width: w, height: h });
    }
    return rects;
  } finally {
    source.delete();
    gray.delete();
    found.delete();
  }
}

/** Переносит находку в координаты полного кадра и добавляет запас по краям. */
function expand(rect: Rect, scale: number, width: number, height: number): Rect {
  const w = rect.width * scale;
  const h = rect.height * scale;
  const padX = w * PAD_X;
  const padY = h * PAD_Y;

  const left = Math.max(0, Math.round(rect.x * scale - padX));
  const top = Math.max(0, Math.round(rect.y * scale - padY));
  const right = Math.min(width, Math.round(rect.x * scale + w + padX));
  const bottom = Math.min(height, Math.round(rect.y * scale + h + padY));

  return { x: left, y: top, width: right - left, height: bottom - top };
}

/**
 * Возвращает фото с закрытыми номерами. Если номеров не нашлось — отдаёт
 * исходные байты нетронутыми, чтобы не терять качество на лишней перекодировке.
 *
 * Не бросает: не замазать номер плохо, а потерять фотографию, которую продавец
 * уже прислал, — хуже. Причина уходит в лог.
 */
export async function hidePlates(input: Uint8Array): Promise<Uint8Array> {
  try {
    const classifier = await getDetector();

    const image = await Jimp.read(Buffer.from(input));
    const { width, height } = image.bitmap;

    const shrink = width > DETECT_WIDTH ? DETECT_WIDTH / width : 1;
    const small = shrink === 1 ? image : image.clone().resize({ w: DETECT_WIDTH });
    const bitmap = small.bitmap;

    const rects = detect(
      classifier,
      new Uint8ClampedArray(bitmap.data.buffer, bitmap.data.byteOffset, bitmap.data.length),
      bitmap.width,
      bitmap.height,
    );
    if (rects.length === 0) return input;

    for (const rect of rects) {
      const { x, y, width: w, height: h } = expand(rect, 1 / shrink, width, height);
      // Клетка соразмерна номеру: на маленьком номере крупная сетка съела бы
      // пол-бампера, на большом мелкая оставила бы знаки читаемыми.
      image.pixelate({ size: Math.max(6, Math.round(h / 3)), x, y, w, h });
    }

    return new Uint8Array(await image.getBuffer('image/jpeg', { quality: 88 }));
  } catch (error) {
    console.error('Не удалось замазать номер, публикуем фото как есть:', error);
    return input;
  }
}
