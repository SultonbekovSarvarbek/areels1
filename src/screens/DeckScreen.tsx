import { useMemo, useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { ActionBar } from '../components/ActionBar';
import { SwipeDeck, SwipeDeckHandle } from '../components/SwipeDeck';
import { Car, SwipeDirection } from '../types';
import { Palette, ThemeName, fixed, radius } from '../theme';
import { useColors } from '../ThemeContext';
import { useT } from '../I18nContext';

interface Props {
  deck: Car[];
  index: number;
  activeFilters: number;
  canUndo: boolean;
  onSwipe: (car: Car, direction: SwipeDirection) => void;
  onUndo: () => void;
  onOpenFilters: () => void;
  onOpenCar: (car: Car) => void;
  onToggleTheme: () => void;
  themeName: ThemeName;
  entryFrom: SwipeDirection | null;
  /** Каталог грузится с сервера — колоды ещё нет. */
  loading: boolean;
  /** Текст ошибки загрузки; null, если каталог получен. */
  error: string | null;
  onRetry: () => void;
}

export function DeckScreen({
  deck,
  index,
  activeFilters,
  canUndo,
  onSwipe,
  onUndo,
  onOpenFilters,
  onOpenCar,
  onToggleTheme,
  themeName,
  entryFrom,
  loading,
  error,
  onRetry,
}: Props) {
  const c = useColors();
  const t = useT();
  const styles = useMemo(() => makeStyles(c), [c]);

  const deckRef = useRef<SwipeDeckHandle>(null);
  // Пусто теперь только когда под фильтры не подошла ни одна машина —
  // колода кольцевая, поэтому счётчик считает позицию внутри текущего круга.
  const isEmpty = deck.length === 0;
  const left = isEmpty ? 0 : deck.length - (index % deck.length);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoTile}>
            <Image
              source={require('../../assets/logo-mark.png')}
              style={styles.logoMark}
              contentFit="contain"
            />
          </View>
          <Text style={styles.logo}>AvtoLike</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.iconBtn}
            onPress={onToggleTheme}
            hitSlop={8}
            accessibilityLabel={themeName === 'dark' ? 'light theme' : 'dark theme'}
          >
            <Ionicons
              name={themeName === 'dark' ? 'sunny-outline' : 'moon-outline'}
              size={20}
              color={c.text}
            />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={onOpenFilters} hitSlop={8}>
            <Ionicons name="options-outline" size={20} color={c.text} />
            {activeFilters > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{activeFilters}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.deckArea}>
        {loading ? (
          <View style={styles.empty}>
            <ActivityIndicator size="large" color={c.like} />
            <Text style={styles.emptyText}>{t.loadingCatalog}</Text>
          </View>
        ) : error ? (
          <View style={styles.empty}>
            <Ionicons name="cloud-offline-outline" size={64} color={c.textFaint} />
            <Text style={styles.emptyTitle}>{t.loadFailedTitle}</Text>
            <Text style={styles.emptyText}>{t.loadFailedText}</Text>
            <Pressable style={styles.emptyBtn} onPress={onRetry}>
              <Ionicons name="refresh" size={18} color={c.onBright} />
              <Text style={styles.emptyBtnText}>{t.retry}</Text>
            </Pressable>
          </View>
        ) : isEmpty ? (
          <View style={styles.empty}>
            <Ionicons name="funnel-outline" size={64} color={c.textFaint} />
            <Text style={styles.emptyTitle}>{t.deckEmptyTitle}</Text>
            <Text style={styles.emptyText}>
              {t.deckEmptyText}
            </Text>
            <Pressable style={styles.emptyBtn} onPress={onOpenFilters}>
              <Ionicons name="options-outline" size={18} color={c.onBright} />
              <Text style={styles.emptyBtnText}>{t.changeFilters}</Text>
            </Pressable>
          </View>
        ) : (
          <SwipeDeck
            ref={deckRef}
            cars={deck}
            index={index}
            onSwipe={onSwipe}
            onPressDetails={onOpenCar}
            entryFrom={entryFrom}
          />
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.counter}>
          {loading
            ? t.loadingCatalog
            : error
              ? t.loadFailedTitle
              : isEmpty
                ? t.noAds
                : t.remaining(left, deck.length)}
        </Text>
        <ActionBar
          canUndo={canUndo}
          disabled={isEmpty}
          onUndo={onUndo}
          onSkip={() => deckRef.current?.swipe('left')}
          onLike={() => deckRef.current?.swipe('right')}
        />
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    root: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 10,
    },
    logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    /**
     * Знак логотипа тёмно-синий и на чёрном фоне пропадает, поэтому кладём его
     * на белую плитку — так же, как он выглядит иконкой на домашнем экране.
     */
    logoTile: {
      width: 32,
      height: 32,
      borderRadius: 9,
      backgroundColor: fixed.onPhoto,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoMark: { width: 22, height: 22 },
    logo: { color: c.text, fontSize: 22, fontWeight: '900', letterSpacing: -0.4 },
    headerActions: { flexDirection: 'row', gap: 10 },
    iconBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.bgElevated,
      borderWidth: 1,
      borderColor: c.border,
    },
    badge: {
      position: 'absolute',
      top: -2,
      right: -2,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 4,
      backgroundColor: c.like,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: { color: c.onBright, fontSize: 11, fontWeight: '900' },
    deckArea: { flex: 1, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 },
    footer: { paddingBottom: 6 },
    counter: { color: c.textFaint, fontSize: 12, fontWeight: '700', textAlign: 'center' },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingHorizontal: 30,
    },
    emptyTitle: { color: c.text, fontSize: 20, fontWeight: '800', marginTop: 6 },
    emptyText: { color: c.textDim, fontSize: 14, textAlign: 'center', lineHeight: 20 },
    emptyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 12,
      backgroundColor: c.like,
      borderRadius: radius.pill,
      paddingHorizontal: 22,
      paddingVertical: 14,
    },
    emptyBtnText: { color: c.onBright, fontSize: 15, fontWeight: '800' },
  });
