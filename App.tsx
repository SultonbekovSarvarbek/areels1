import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Car, Filters, SwipeDirection, emptyFilters } from './src/types';
import { OFFERS_ENABLED } from './src/features';
import { ThemeProvider, useTheme } from './src/ThemeContext';
import { SessionProvider, useSession } from './src/SessionContext';
import { I18nProvider } from './src/I18nContext';
import { CatalogProvider, useCatalog } from './src/CatalogContext';
import { countActiveFilters, matchesFilters } from './src/utils/filter';
import { loadState, saveFilters, saveLiked, savePassed } from './src/storage';
import { DeckScreen } from './src/screens/DeckScreen';
import { LikesScreen } from './src/screens/LikesScreen';
import { CarDetailScreen } from './src/screens/CarDetailScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { FiltersSheet } from './src/components/FiltersSheet';
import { AuthSheet } from './src/components/AuthSheet';
import { OfferSheet } from './src/components/OfferSheet';
import { TabBar, TabKey } from './src/components/TabBar';

const buzz = (style: Haptics.ImpactFeedbackStyle) => {
  Haptics.impactAsync(style).catch(() => {
    // Устройство без вибромотора — не критично.
  });
};

function Root() {
  const { colors, name, toggle: toggleTheme } = useTheme();
  const { user, offers, signIn, signOut, makeOffer, offerFor } = useSession();
  const [tab, setTab] = useState<TabKey>('deck');
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [liked, setLiked] = useState<string[]>([]);
  const [passed, setPassed] = useState<string[]>([]);

  const { cars, brands, loading, error, reload } = useCatalog();

  const [index, setIndex] = useState(0);

  const [detailCar, setDetailCar] = useState<Car | null>(null);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [authVisible, setAuthVisible] = useState(false);
  const [offerCar, setOfferCar] = useState<Car | null>(null);
  /** Машина, ради которой открыли вход — после успеха сразу ведём к форме цены. */
  const pendingOffer = useRef<Car | null>(null);

  const hydrated = useRef(false);

  /**
   * Колода — производное от каталога и фильтров, а не отдельное состояние.
   * Каталог приезжает по сети, фильтры — из хранилища, и оба асинхронно:
   * пока это был setDeck, приходилось ловить, кто из них успел первым.
   *
   * Колода кольцевая (см. SwipeDeck): пройдя список до конца, пользователь идёт
   * по нему заново, уже просмотренные машины тоже возвращаются.
   */
  const deck = useMemo(
    () => cars.filter((car) => matchesFilters(car, filters)),
    [cars, filters],
  );

  /**
   * Границы ползунка цены. Считаем по всему каталогу, а не по отфильтрованной
   * колоде: иначе ползунок сужался бы под собственный фильтр и вернуть цену
   * обратно было бы нечем. Округляем до тысяч, чтобы подписи концов были
   * круглыми, а самая дешёвая и самая дорогая машина не упирались в край.
   */
  const priceRange = useMemo(() => {
    if (cars.length === 0) return { min: 5000, max: 100000 };
    const prices = cars.map((car) => car.price);
    return {
      min: Math.floor(Math.min(...prices) / 1000) * 1000,
      max: Math.ceil(Math.max(...prices) / 1000) * 1000,
    };
  }, [cars]);

  /** Сменились фильтры — начинаем колоду сначала. */
  const resetDeck = useCallback(() => {
    setIndex(0);
  }, []);

  useEffect(() => {
    let active = true;
    loadState().then((state) => {
      if (!active) return;
      setFilters(state.filters);
      setLiked(state.liked);
      setPassed(state.passed);
      hydrated.current = true;
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (hydrated.current) saveLiked(liked);
  }, [liked]);
  useEffect(() => {
    if (hydrated.current) savePassed(passed);
  }, [passed]);

  const handleSwipe = useCallback((car: Car, direction: SwipeDirection) => {
    setIndex((i) => i + 1);

    if (direction === 'right') {
      setLiked((l) => (l.includes(car.id) ? l : [...l, car.id]));
      buzz(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      setPassed((p) => (p.includes(car.id) ? p : [...p, car.id]));
      buzz(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const handleApplyFilters = useCallback(
    (next: Filters) => {
      setFilters(next);
      saveFilters(next);
      resetDeck();
    },
    [resetDeck],
  );

  const handleToggleLike = useCallback((car: Car) => {
    setLiked((l) => (l.includes(car.id) ? l.filter((id) => id !== car.id) : [...l, car.id]));
  }, []);

  const handleRemove = useCallback((car: Car) => {
    setLiked((l) => l.filter((id) => id !== car.id));
  }, []);

  const handleClearLiked = useCallback(() => {
    setLiked([]);
  }, []);

  const handleOfferPress = useCallback(
    (car: Car) => {
      if (user) return setOfferCar(car);
      pendingOffer.current = car;
      setAuthVisible(true);
    },
    [user],
  );

  const handleSignedIn = useCallback(
    (phone: string, userName: string) => {
      signIn(phone, userName);
      setAuthVisible(false);
      const target = pendingOffer.current;
      pendingOffer.current = null;
      if (target) setOfferCar(target);
    },
    [signIn],
  );

  const handleSubmitOffer = useCallback(
    (price: number, comment: string) => {
      if (!offerCar) return;
      makeOffer(offerCar.id, price, comment);
      setOfferCar(null);
      buzz(Haptics.ImpactFeedbackStyle.Medium);
    },
    [offerCar, makeOffer],
  );

  const byId = useMemo(() => new Map(cars.map((car) => [car.id, car])), [cars]);
  const toCars = useCallback(
    (ids: string[]) =>
      ids
        .map((id) => byId.get(id))
        .filter((car): car is Car => !!car)
        .reverse(),
    [byId],
  );

  const likedCars = useMemo(() => toCars(liked), [toCars, liked]);
  const countFor = useCallback(
    (f: Filters) => cars.filter((car) => matchesFilters(car, f)).length,
    [cars],
  );

  // Один и тот же набор шторок: внутри карточки, когда она открыта, иначе в корне.
  // Обе живут ради предложения цены — пока оно выключено (features.ts), их нет.
  const sheets = !OFFERS_ENABLED ? null : (
    <>
      <AuthSheet
        visible={authVisible}
        onClose={() => {
          pendingOffer.current = null;
          setAuthVisible(false);
        }}
        onDone={handleSignedIn}
      />

      <OfferSheet
        car={offerCar}
        current={offerCar ? offerFor(offerCar.id)?.price : undefined}
        onClose={() => setOfferCar(null)}
        onSubmit={handleSubmitOffer}
      />
    </>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar style={name === 'dark' ? 'light' : 'dark'} />

      <SafeAreaView edges={['top']} style={styles.safe}>
        {tab === 'deck' ? (
          <DeckScreen
            deck={deck}
            index={index}
            activeFilters={countActiveFilters(filters)}
            onSwipe={handleSwipe}
            onOpenFilters={() => setFiltersVisible(true)}
            onOpenCar={setDetailCar}
            onToggleTheme={toggleTheme}
            themeName={name}
            loading={loading}
            error={error}
            onRetry={reload}
          />
        ) : tab === 'likes' ? (
          <LikesScreen
            liked={likedCars}
            onOpenCar={setDetailCar}
            onRemove={handleRemove}
            onClearAll={handleClearLiked}
          />
        ) : (
          <ProfileScreen
            user={user}
            offers={offers}
            carById={(id) => byId.get(id)}
            likedCount={liked.length}
            onSignIn={() => setAuthVisible(true)}
            onSignOut={signOut}
            onOpenCar={setDetailCar}
          />
        )}
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} style={{ backgroundColor: colors.bgElevated }}>
        <TabBar active={tab} likesCount={liked.length} onChange={setTab} />
      </SafeAreaView>

      <FiltersSheet
        visible={filtersVisible}
        value={filters}
        brands={brands}
        priceRange={priceRange}
        countFor={countFor}
        onChange={handleApplyFilters}
        onClose={() => setFiltersVisible(false)}
      />

      <CarDetailScreen
        car={detailCar}
        offer={detailCar ? offerFor(detailCar.id) : undefined}
        isLiked={!!detailCar && liked.includes(detailCar.id)}
        onOfferPress={handleOfferPress}
        onToggleLike={handleToggleLike}
        onClose={() => setDetailCar(null)}
      >
        {detailCar && sheets}
      </CarDetailScreen>

      {!detailCar && sheets}
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <I18nProvider>
          <ThemeProvider>
            <SessionProvider>
              <CatalogProvider>
                <Root />
              </CatalogProvider>
            </SessionProvider>
          </ThemeProvider>
        </I18nProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
});
