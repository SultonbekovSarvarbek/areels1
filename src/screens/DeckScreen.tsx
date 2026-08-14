import { useMemo } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { SwipeDeck } from '../components/SwipeDeck';
import { Car, SwipeDirection } from '../types';
import { Palette, ThemeName, fixed, radius } from '../theme';
import { useColors } from '../ThemeContext';
import { useT } from '../I18nContext';

/** Объявления заводят только через бота — своей формы подачи в приложении нет. */
const BOT = 'avtolike_uz_bot';

interface Props {
  deck: Car[];
  index: number;
  activeFilters: number;
  onSwipe: (car: Car, direction: SwipeDirection) => void;
  onOpenFilters: () => void;
  onOpenCar: (car: Car) => void;
  onToggleTheme: () => void;
  themeName: ThemeName;
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
  onSwipe,
  onOpenFilters,
  onOpenCar,
  onToggleTheme,
  themeName,
  loading,
  error,
  onRetry,
}: Props) {
  const c = useColors();
  const t = useT();
  const styles = useMemo(() => makeStyles(c, themeName), [c, themeName]);

  // Пусто теперь только когда под фильтры не подошла ни одна машина —
  // колода кольцевая, поэтому счётчик считает позицию внутри текущего круга.
  const isEmpty = deck.length === 0;
  const left = isEmpty ? 0 : deck.length - (index % deck.length);

  // Через t.me, а не tg://: без установленного Telegram схема отвалится молча,
  // а https подхватит браузер и предложит открыть приложение сам.
  const openBot = () => {
    Linking.openURL(`https://t.me/${BOT}`).catch(() => {
      Alert.alert(t.openFailTitle, t.openFailText);
    });
  };

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
            cars={deck}
            index={index}
            onSwipe={onSwipe}
            onPressDetails={onOpenCar}
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

        {/* Место освободилось от кнопок свайпа — отдаём его единственному
            способу подать объявление. */}
        <Pressable
          style={({ pressed }) => [styles.sellCta, pressed && styles.sellCtaPressed]}
          onPress={openBot}
          accessibilityRole="link"
          accessibilityLabel={`${t.sellCtaTitle} ${t.sellCtaText}`}
        >
          <View style={styles.sellIcon}>
            {/* Машина, а не самолётик: значок говорит про продажу авто,
                а Telegram и так назван текстом и хэндлом рядом. */}
            <Ionicons name="car-sport" size={20} color={c.tg} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sellTitle}>{t.sellCtaTitle}</Text>
            <Text style={styles.sellText}>
              {t.sellCtaText} <Text style={styles.sellHandle}>@{BOT}</Text>
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={c.textFaint} />
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (c: Palette, theme: ThemeName) =>
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
     * Знак логотипа тёмно-синий и на чёрном фоне пропадает, поэтому на тёмной
     * теме кладём его на белую плитку — как иконку на домашнем экране. На
     * светлой плитка не нужна: она почти совпадает с фоном и читается грязным
     * пятном, а сам знак на светлом фоне контрастен и без подложки.
     */
    logoTile: {
      width: 32,
      height: 32,
      borderRadius: 9,
      backgroundColor: theme === 'dark' ? fixed.onPhoto : 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Без плитки знак занимает всю клетку, иначе логотип выглядел бы мельче.
    logoMark: theme === 'dark' ? { width: 22, height: 22 } : { width: 30, height: 30 },
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
    /** Кнопки свайпа ушли — под колодой остались счётчик и ссылка на бота. */
    footer: { paddingHorizontal: 16, paddingBottom: 10 },
    counter: { color: c.textFaint, fontSize: 12, fontWeight: '700', textAlign: 'center' },
    sellCta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgElevated,
    },
    sellCtaPressed: { opacity: 0.7 },
    sellIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: fixed.tgSoft,
    },
    sellTitle: { color: c.text, fontSize: 14, fontWeight: '800' },
    sellText: { color: c.textDim, fontSize: 12, marginTop: 2, lineHeight: 16 },
    sellHandle: { color: c.tg, fontWeight: '800' },
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
