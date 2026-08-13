import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { Palette } from '../theme';
import { useColors } from '../ThemeContext';
import { formatPriceShort } from '../utils/format';

const THUMB = 28;
/** Высота полосы. Тонкая линия — но тянуть можно за всю область по вертикали. */
const TRACK = 6;

interface Props {
  /** Верхняя граница цены; null — ограничения нет, ползунок в крайнем правом. */
  value: number | null;
  min: number;
  max: number;
  step: number;
  /** Подпись для крайнего правого положения — «Любая». */
  anyLabel: string;
  onChange: (value: number | null) => void;
}

/**
 * Ползунок цены вместо набора фиксированных сумм: шаг между вариантами был
 * слишком крупным (10, 15, 20, 30, 75 тысяч), а машины стоят как попало.
 *
 * Сделан на gesture-handler и reanimated, которые уже есть в проекте, а не на
 * @react-native-community/slider: нативный пакет потребовал бы пересборки
 * dev-build на телефоне, и это ради одной полоски.
 *
 * Крайнее правое положение — не «максимум каталога», а «без ограничения»:
 * иначе самая дорогая машина выпадала бы из выдачи на границе.
 */
export function PriceSlider({ value, min, max, step, anyLabel, onChange }: Props) {
  const c = useColors();
  const styles = makeStyles(c);

  const [width, setWidth] = useState(0);

  // Доля от 0 до 1. Живёт на UI-потоке: за палец должен успевать сам ползунок,
  // а не React-рендер со счётчиком объявлений.
  const progress = useSharedValue(value === null ? 1 : (value - min) / (max - min));
  // Доля на момент начала жеста: pan даёт смещение от точки касания.
  const startProgress = useSharedValue(0);

  /**
   * Из доли получаем цену, округляя до шага. Правый край отдаём как null —
   * это «любая цена», а не max.
   */
  const toValue = useCallback(
    (ratio: number): number | null => {
      if (ratio >= 1) return null;
      const raw = min + ratio * (max - min);
      return Math.min(max, Math.max(min, Math.round(raw / step) * step));
    },
    [min, max, step],
  );

  const report = useCallback(
    (ratio: number) => {
      const next = toValue(ratio);
      // onChange дёргается на каждый кадр перетаскивания, поэтому пропускаем
      // повторы: иначе пересчёт счётчика идёт вхолостую.
      if (next !== value) onChange(next);
    },
    [onChange, toValue, value],
  );

  /**
   * Пока палец на экране, положение ползунка задаёт жест. В остальное время —
   * значение снаружи: «Сбросить» в подвале шторки и повторное открытие с уже
   * применёнными фильтрами должны двигать ползунок.
   */
  const dragging = useRef(false);
  const setDragging = useCallback((value: boolean) => {
    dragging.current = value;
  }, []);

  useEffect(() => {
    if (dragging.current) return;
    progress.value = value === null ? 1 : (value - min) / (max - min);
  }, [value, min, max, progress]);

  const pan = Gesture.Pan()
    .onBegin(() => {
      startProgress.value = progress.value;
      runOnJS(setDragging)(true);
    })
    .onFinalize(() => {
      runOnJS(setDragging)(false);
    })
    .onUpdate((event) => {
      if (width === 0) return;
      const next = Math.min(1, Math.max(0, startProgress.value + event.translationX / width));
      progress.value = next;
      runOnJS(report)(next);
    });

  // Тап по полосе — тоже установка значения, без перетаскивания.
  const tap = Gesture.Tap().onEnd((event) => {
    if (width === 0) return;
    const next = Math.min(1, Math.max(0, event.x / width));
    progress.value = next;
    runOnJS(report)(next);
  });

  const gesture = Gesture.Simultaneous(pan, tap);

  const fillStyle = useAnimatedStyle(() => ({ width: progress.value * width }));
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * width - THUMB / 2 }],
  }));

  return (
    <View style={styles.root}>
      <Text style={styles.value}>{value === null ? anyLabel : formatPriceShort(value)}</Text>

      <GestureDetector gesture={gesture}>
        <View style={styles.hitArea}>
          <View style={styles.track} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
            <Animated.View style={[styles.fill, fillStyle]} />
          </View>
          <Animated.View style={[styles.thumb, thumbStyle]} />
        </View>
      </GestureDetector>

      <View style={styles.bounds}>
        <Text style={styles.bound}>{formatPriceShort(min)}</Text>
        <Text style={styles.bound}>{anyLabel}</Text>
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    // Ширина на всю строку: шторка раскладывает содержимое секций в ряд.
    root: { gap: 6, width: '100%' },
    value: { color: c.text, fontSize: 20, fontWeight: '800' },
    // Полоса тонкая, но палец попадает по всей высоте области.
    hitArea: { height: THUMB + 12, justifyContent: 'center' },
    track: {
      height: TRACK,
      borderRadius: TRACK / 2,
      backgroundColor: c.bgElevated,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    fill: { height: '100%', backgroundColor: c.like },
    thumb: {
      position: 'absolute',
      width: THUMB,
      height: THUMB,
      borderRadius: THUMB / 2,
      backgroundColor: c.like,
      borderWidth: 3,
      borderColor: c.bg,
    },
    bounds: { flexDirection: 'row', justifyContent: 'space-between' },
    bound: { color: c.textDim, fontSize: 12, fontWeight: '600' },
  });
