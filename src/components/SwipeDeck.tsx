import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  SharedValue,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Car, SwipeDirection } from '../types';
import { Palette, fixed, radius } from '../theme';
import { useColors } from '../ThemeContext';
import { useT } from '../I18nContext';
import { CarCard } from './CarCard';

const { width: SCREEN_W } = Dimensions.get('window');
const SWIPE_X = SCREEN_W * 0.26;
const VELOCITY = 800;
const STACK = 3;

export interface SwipeDeckHandle {
  swipe: (direction: SwipeDirection) => void;
}

interface CardHandle {
  swipe: (direction: SwipeDirection) => void;
}

interface CardProps {
  car: Car;
  progress: SharedValue<number>;
  onSwipe: (car: Car, direction: SwipeDirection) => void;
  onPressDetails: (car: Car) => void;
  onReport: (car: Car) => void;
  /** Направление, с которого карточка «прилетает» обратно после отмены свайпа. */
  entryFrom?: SwipeDirection | null;
}

const SwipeCard = forwardRef<CardHandle, CardProps>(function SwipeCard(
  { car, progress, onSwipe, onPressDetails, onReport, entryFrom },
  ref,
) {
  const t = useT();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const x = useSharedValue(
    entryFrom === 'left' ? -SCREEN_W * 1.3 : entryFrom === 'right' ? SCREEN_W * 1.3 : 0,
  );
  const y = useSharedValue(0);

  // Возврат карточки после «Отменить» — один раз при монтировании.
  useEffect(() => {
    if (!entryFrom) return;
    x.value = withSpring(0, { damping: 20, stiffness: 140 });
    y.value = withSpring(0, { damping: 20, stiffness: 140 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useAnimatedReaction(
    () => Math.min(1, Math.abs(x.value) / SWIPE_X),
    (value) => {
      progress.value = value;
    },
  );

  const flyAway = (direction: SwipeDirection) => {
    'worklet';
    const toX = direction === 'left' ? -SCREEN_W * 1.5 : SCREEN_W * 1.5;

    y.value = withTiming(y.value + 60, { duration: 260 });
    x.value = withTiming(toX, { duration: 260 }, (finished) => {
      if (finished) scheduleOnRN(onSwipe, car, direction);
    });
  };

  useImperativeHandle(ref, () => ({ swipe: flyAway }));

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .activeOffsetY([-12, 12])
    .onUpdate((e) => {
      x.value = e.translationX;
      y.value = e.translationY;
    })
    .onEnd((e) => {
      const goRight = x.value > SWIPE_X || e.velocityX > VELOCITY;
      const goLeft = x.value < -SWIPE_X || e.velocityX < -VELOCITY;

      if (goRight) flyAway('right');
      else if (goLeft) flyAway('left');
      else {
        x.value = withSpring(0, { damping: 18, stiffness: 180 });
        y.value = withSpring(0, { damping: 18, stiffness: 180 });
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      {
        rotate: `${interpolate(x.value, [-SCREEN_W, 0, SCREEN_W], [-14, 0, 14], Extrapolation.CLAMP)}deg`,
      },
    ],
  }));

  const likeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [20, SWIPE_X], [0, 1], Extrapolation.CLAMP),
  }));
  const skipStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [-SWIPE_X, -20], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.layer, cardStyle]}>
        <CarCard car={car} onPressDetails={onPressDetails} onReport={onReport} />
        <Animated.View style={[styles.stamp, styles.stampLike, likeStyle]} pointerEvents="none">
          <Animated.Text style={[styles.stampText, { color: c.like }]}>{t.stampLike}</Animated.Text>
        </Animated.View>
        <Animated.View style={[styles.stamp, styles.stampSkip, skipStyle]} pointerEvents="none">
          <Animated.Text style={[styles.stampText, { color: c.skip }]}>{t.stampSkip}</Animated.Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
});

interface Props {
  cars: Car[];
  index: number;
  onSwipe: (car: Car, direction: SwipeDirection) => void;
  onPressDetails: (car: Car) => void;
  /** Жалоба на верхнюю карточку — кнопка есть только у неё. */
  onReport: (car: Car) => void;
  entryFrom?: SwipeDirection | null;
}

export const SwipeDeck = forwardRef<SwipeDeckHandle, Props>(function SwipeDeck(
  { cars, index, onSwipe, onPressDetails, onReport, entryFrom },
  ref,
) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const progress = useSharedValue(0);
  const topCard = useRef<CardHandle>(null);

  useImperativeHandle(ref, () => ({
    swipe: (direction) => topCard.current?.swipe(direction),
  }));

  const secondStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(progress.value, [0, 1], [0.94, 1], Extrapolation.CLAMP) },
      { translateY: interpolate(progress.value, [0, 1], [14, 0], Extrapolation.CLAMP) },
    ],
    opacity: interpolate(progress.value, [0, 1], [0.85, 1], Extrapolation.CLAMP),
  }));

  // Колода кольцевая: за последней карточкой сразу лежит первая, поэтому
  // стопка никогда не пустеет и конца списка не видно.
  const visible = Array.from({ length: Math.min(STACK, cars.length) }, (_, i) => {
    return cars[(index + i) % cars.length];
  });

  return (
    <View style={styles.wrap}>
      {visible
        .map((car, i) => {
          if (i === 0) {
            return (
              <SwipeCard
                key={car.id}
                ref={topCard}
                car={car}
                progress={progress}
                onSwipe={onSwipe}
                onPressDetails={onPressDetails}
                onReport={onReport}
                entryFrom={entryFrom}
              />
            );
          }

          if (i === 1) {
            return (
              <Animated.View style={[styles.layer, secondStyle]} key={car.id} pointerEvents="none">
                <CarCard car={car} />
              </Animated.View>
            );
          }

          return (
            <View style={[styles.layer, styles.thirdLayer]} key={car.id} pointerEvents="none">
              <CarCard car={car} />
            </View>
          );
        })
        .reverse()}
    </View>
  );
});

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: { flex: 1 },
    layer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: radius.xl,
    },
    thirdLayer: { transform: [{ scale: 0.89 }, { translateY: 26 }], opacity: 0.6 },
    stamp: {
      position: 'absolute',
      top: 40,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderWidth: 4,
      borderRadius: radius.md,
      backgroundColor: fixed.glass,
    },
    stampLike: { left: 24, transform: [{ rotate: '-14deg' }], borderColor: c.like },
    stampSkip: { right: 24, transform: [{ rotate: '14deg' }], borderColor: c.skip },
    stampText: { fontSize: 26, fontWeight: '900', letterSpacing: 1 },
  });
