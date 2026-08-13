/**
 * Замазывание госномеров на фото объявления.
 *
 * Продавец фотографирует машину как есть, вместе с номером, а объявление потом
 * листают все подряд: по номеру пробивают владельца и звонят «по объявлению»
 * мимо приложения. Поэтому номер прячем сами и молча — просить продавца
 * замазывать его вручную бессмысленно, никто не будет.
 *
 * Детектор — YOLO11n, дообученный на номерных пластинах (assets/, 10 МБ),
 * считает onnxruntime на процессоре. Считает локально, а не облачным API: фото
 * продавца не должно уезжать на сторонний сервис, а ключей и счёта за кадры у
 * проекта нет.
 *
 * До этого здесь был каскад Хаара из поставки OpenCV — от него отказались на
 * реальных фото из бота: пересжатый кадр 460 px он не видел вовсе, а на попытку
 * ослабить пороги отвечал сеткой на крыле и на асфальте.
 *
 * Пиксели, а не блюр: блюр на мелком номере остаётся читаемым, а крупная сетка
 * ещё и выглядит как осознанное решение, а не как смазанное фото.
 */

import { Jimp } from 'jimp';
import { fileURLToPath } from 'node:url';
import * as ort from 'onnxruntime-node';

type Box = { x: number; y: number; width: number; height: number; score: number };

const MODEL_FILE = fileURLToPath(new URL('../assets/license-plate-yolo11n.onnx', import.meta.url));

/** Стандартный вход YOLO. Кадр вписывается в квадрат с сохранением пропорций. */
const INPUT_SIZE = 640;
/** Заполнитель полей при вписывании — тот же серый, что использует обучение. */
const LETTERBOX_GRAY = 114;

/**
 * Порог уверенности. Ниже 0.3 начинают приходить фары и шильдики, выше 0.5
 * теряются номера в тени и под углом. Промах в сторону лишней сетки дешевле:
 * это косметика, а пропущенный номер — ровно та проблема, ради которой всё.
 */
const MIN_SCORE = 0.35;
/** Порог перекрытия для NMS: одна пластина не должна попасть в выдачу дважды. */
const MAX_IOU = 0.45;

/** Небольшой запас по краям — модель ведёт рамку вплотную к пластине. */
const PAD_X = 0.06;
const PAD_Y = 0.12;

let session: Promise<ort.InferenceSession> | null = null;

/** Модель читается один раз на процесс: инициализация дороже самой детекции. */
function getSession(): Promise<ort.InferenceSession> {
  session ??= ort.InferenceSession.create(MODEL_FILE).catch((error) => {
    session = null; // следующая фотография попробует ещё раз
    throw error;
  });
  return session;
}

interface Letterbox {
  tensor: ort.Tensor;
  /** Во сколько раз кадр уменьшили, чтобы вписать в квадрат. */
  scale: number;
  offsetX: number;
  offsetY: number;
}

/**
 * Вписывает кадр в квадрат INPUT_SIZE с серыми полями и раскладывает пиксели
 * в NCHW-тензор, которого ждёт YOLO.
 */
async function letterbox(image: Awaited<ReturnType<typeof Jimp.read>>): Promise<Letterbox> {
  const { width, height } = image.bitmap;
  const scale = Math.min(INPUT_SIZE / width, INPUT_SIZE / height);
  const fitWidth = Math.round(width * scale);
  const fitHeight = Math.round(height * scale);
  const offsetX = Math.floor((INPUT_SIZE - fitWidth) / 2);
  const offsetY = Math.floor((INPUT_SIZE - fitHeight) / 2);

  const fitted = image.clone().resize({ w: fitWidth, h: fitHeight });
  const { data } = fitted.bitmap;

  const plane = INPUT_SIZE * INPUT_SIZE;
  const input = new Float32Array(3 * plane).fill(LETTERBOX_GRAY / 255);

  for (let y = 0; y < fitHeight; y += 1) {
    for (let x = 0; x < fitWidth; x += 1) {
      const from = (y * fitWidth + x) * 4;
      const to = (y + offsetY) * INPUT_SIZE + (x + offsetX);
      input[to] = data[from]! / 255;
      input[plane + to] = data[from + 1]! / 255;
      input[2 * plane + to] = data[from + 2]! / 255;
    }
  }

  return {
    tensor: new ort.Tensor('float32', input, [1, 3, INPUT_SIZE, INPUT_SIZE]),
    scale,
    offsetX,
    offsetY,
  };
}

function iou(a: Box, b: Box): number {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  if (right <= left || bottom <= top) return 0;

  const overlap = (right - left) * (bottom - top);
  return overlap / (a.width * a.height + b.width * b.height - overlap);
}

/** Жадное подавление: сильнейшая рамка съедает все, что с ней сильно пересекаются. */
function suppress(boxes: Box[]): Box[] {
  const kept: Box[] = [];
  for (const box of [...boxes].sort((a, b) => b.score - a.score)) {
    if (kept.every((k) => iou(k, box) < MAX_IOU)) kept.push(box);
  }
  return kept;
}

/**
 * Разбирает выход YOLO: [1, 5, N], где строки — cx, cy, w, h и уверенность,
 * а координаты живут в системе вписанного квадрата.
 */
function parse(output: ort.Tensor, box: Letterbox, width: number, height: number): Box[] {
  const data = output.data as Float32Array;
  const count = output.dims[2]!;
  const found: Box[] = [];

  for (let i = 0; i < count; i += 1) {
    const score = data[4 * count + i]!;
    if (score < MIN_SCORE) continue;

    const w = data[2 * count + i]! / box.scale;
    const h = data[3 * count + i]! / box.scale;
    const cx = (data[i]! - box.offsetX) / box.scale;
    const cy = (data[count + i]! - box.offsetY) / box.scale;

    const padX = w * PAD_X;
    const padY = h * PAD_Y;
    const left = Math.max(0, Math.round(cx - w / 2 - padX));
    const top = Math.max(0, Math.round(cy - h / 2 - padY));
    const right = Math.min(width, Math.round(cx + w / 2 + padX));
    const bottom = Math.min(height, Math.round(cy + h / 2 + padY));
    if (right <= left || bottom <= top) continue;

    found.push({ x: left, y: top, width: right - left, height: bottom - top, score });
  }

  return suppress(found);
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
    const model = await getSession();

    const image = await Jimp.read(Buffer.from(input));
    const { width, height } = image.bitmap;

    const box = await letterbox(image);
    const result = await model.run({ [model.inputNames[0]!]: box.tensor });
    const plates = parse(result[model.outputNames[0]!]!, box, width, height);
    if (plates.length === 0) return input;

    for (const plate of plates) {
      // Клетка соразмерна номеру: на маленьком номере крупная сетка съела бы
      // пол-бампера, на большом мелкая оставила бы знаки читаемыми.
      image.pixelate({
        size: Math.max(6, Math.round(plate.height / 3)),
        x: plate.x,
        y: plate.y,
        w: plate.width,
        h: plate.height,
      });
    }

    return new Uint8Array(await image.getBuffer('image/jpeg', { quality: 88 }));
  } catch (error) {
    console.error('Не удалось замазать номер, публикуем фото как есть:', error);
    return input;
  }
}
