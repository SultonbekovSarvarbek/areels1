import { useMemo, useRef, useState } from 'react';
import {
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { fixed, radius } from '../theme';

const MAX_SCALE = 4;
/** Ниже этого масштаба считаем, что фото не приближено: пальцы редко возвращают ровно 1. */
const ZOOM_EPSILON = 1.01;

interface PhotoProps {
  uri: string;
  width: number;
  height: number;
  /** Приближено ли фото — родитель по этому флагу отключает листание. */
  zoomed: boolean;
  onZoomChange: (zoomed: boolean) => void;
  onRequestClose: () => void;
}

/**
 * Одна фотография во весь экран: пинч, перетаскивание и двойной тап.
 *
 * Перетаскивание включается только вместе с зумом: неприближённое фото должно
 * листаться горизонтальным ScrollView, а активный Pan забрал бы касание себе.
 */
function ZoomablePhoto({ uri, width, height, zoomed, onZoomChange, onRequestClose }: PhotoProps) {
  const scale = useSharedValue(1);
  const startScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const reset = () => {
    'worklet';
    scale.value = withTiming(1);
    x.value = withTiming(0);
    y.value = withTiming(0);
    runOnJS(onZoomChange)(false);
  };

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = Math.min(Math.max(startScale.value * e.scale, 1), MAX_SCALE);
    })
    .onEnd(() => {
      if (scale.value <= ZOOM_EPSILON) reset();
      else runOnJS(onZoomChange)(true);
    });

  const pan = Gesture.Pan()
    .enabled(zoomed)
    .onStart(() => {
      startX.value = x.value;
      startY.value = y.value;
    })
    .onUpdate((e) => {
      // Дальше края картинки не уводим, иначе она уезжает в пустоту.
      const maxX = (width * (scale.value - 1)) / 2;
      const maxY = (height * (scale.value - 1)) / 2;
      x.value = Math.min(Math.max(startX.value + e.translationX, -maxX), maxX);
      y.value = Math.min(Math.max(startY.value + e.translationY, -maxY), maxY);
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > ZOOM_EPSILON) {
        reset();
        return;
      }
      scale.value = withTiming(2.5);
      runOnJS(onZoomChange)(true);
    });

  /**
   * Одиночный тап закрывает просмотрщик — так же ведут себя галереи мессенджеров.
   * Крестик в углу остаётся, но касания в этой области перехватывают жесты,
   * поэтому единственным способом выхода он быть не может.
   */
  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      // Приближённое фото сначала возвращаем в исходный размер: закрыть его
      // тапом значило бы терять то, что человек только что разглядывал.
      if (scale.value > ZOOM_EPSILON) reset();
      else runOnJS(onRequestClose)();
    });

  // Exclusive, а не Race: одиночный тап ждёт, не окажется ли он первым из двух.
  const taps = Gesture.Exclusive(doubleTap, singleTap);
  const gesture = Gesture.Race(taps, Gesture.Simultaneous(pinch, pan));

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ width, height }, style]}>
        <Image
          source={{ uri }}
          style={{ width, height }}
          // contain, а не cover: на карточке фото обрезано, а здесь его смотрят целиком.
          contentFit="contain"
          cachePolicy="memory-disk"
        />
      </Animated.View>
    </GestureDetector>
  );
}

interface Props {
  photos: string[];
  /** С какого снимка открыли — обычно тот, что видно на карточке. */
  index: number;
  visible: boolean;
  onClose: () => void;
  /** Досмотрел до другого снимка — карточка под просмотрщиком догоняет его. */
  onIndexChange?: (index: number) => void;
}

export function PhotoViewer({ photos, index, visible, onClose, onIndexChange }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(), []);

  const [current, setCurrent] = useState(index);
  const [zoomed, setZoomed] = useState(false);
  const pager = useRef<ScrollView>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next === current) return;
    setCurrent(next);
    onIndexChange?.(next);
  };

  const close = () => {
    setZoomed(false);
    onClose();
  };

  const closeTap = Gesture.Tap().onEnd(() => {
    runOnJS(close)();
  });

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      supportedOrientations={['portrait']}
      onRequestClose={close}
      // Ключ пересоздаёт просмотрщик на каждое открытие: иначе ScrollView
      // остаётся на прошлом снимке, а зум — на прошлом масштабе.
      key={visible ? `viewer-${index}` : 'viewer-closed'}
    >
      {/* Внутри Modal своё дерево — без этой обёртки жесты сюда не доходят. */}
      <GestureHandlerRootView style={styles.root}>
        <ScrollView
          ref={pager}
          horizontal
          pagingEnabled
          scrollEnabled={!zoomed}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
          contentOffset={{ x: index * width, y: 0 }}
        >
          {photos.map((uri) => (
            <ZoomablePhoto
              key={uri}
              uri={uri}
              width={width}
              height={height}
              zoomed={zoomed}
              onZoomChange={setZoomed}
              onRequestClose={close}
            />
          ))}
        </ScrollView>

        {/* Жест, а не Pressable: касания в этой области перехватывает RNGH,
            и обычная кнопка до onPress не доходит. */}
        <GestureDetector gesture={closeTap}>
          <View
            style={[styles.close, { top: Math.max(insets.top, 12) + 4 }]}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Закрыть фото"
          >
            <Ionicons name="close" size={24} color={fixed.onPhoto} />
          </View>
        </GestureDetector>

        {photos.length > 1 && (
          <View style={[styles.counter, { bottom: Math.max(insets.bottom, 16) + 8 }]}>
            <Text style={styles.counterText}>
              {current + 1} / {photos.length}
            </Text>
          </View>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}

/** Палитра тут не нужна: просмотрщик всегда тёмный, как и положено галерее. */
const makeStyles = () =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: '#000' },
    close: {
      position: 'absolute',
      right: 16,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: fixed.glass,
      alignItems: 'center',
      justifyContent: 'center',
    },
    counter: {
      position: 'absolute',
      alignSelf: 'center',
      backgroundColor: fixed.glass,
      borderRadius: radius.pill,
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    counterText: { color: fixed.onPhoto, fontSize: 13, fontWeight: '700' },
  });
