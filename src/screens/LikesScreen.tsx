import { useMemo } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { Car } from '../types';
import { Palette, radius } from '../theme';
import { useColors } from '../ThemeContext';
import { useT } from '../I18nContext';
import { formatMileage, formatPriceShort } from '../utils/format';

interface Props {
  liked: Car[];
  onOpenCar: (car: Car) => void;
  onRemove: (car: Car) => void;
  onClearAll: () => void;
  /** Каталог перечитывается — крутим индикатор жеста. */
  refreshing: boolean;
  onRefresh: () => void;
}

function Row({
  car,
  onOpen,
  onRemove,
}: {
  car: Car;
  onOpen: (car: Car) => void;
  onRemove: (car: Car) => void;
}) {
  const c = useColors();
  const t = useT();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
      onPress={() => onOpen(car)}
    >
      <Image source={{ uri: car.photos[0] }} style={styles.thumb} contentFit="cover" />
      <View style={styles.rowBody}>
        <Text style={styles.rowPrice}>{formatPriceShort(car.price)}</Text>
        <Text style={styles.rowName} numberOfLines={1}>
          {car.brand} {car.model}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {car.year} · {formatMileage(car.mileage, t.unitKm)} · {t.city[car.city]}
        </Text>
      </View>
      <Pressable onPress={() => onRemove(car)} hitSlop={10} style={styles.removeBtn}>
        <Ionicons name="close" size={18} color={c.textFaint} />
      </Pressable>
    </Pressable>
  );
}

export function LikesScreen({
  liked,
  onOpenCar,
  onRemove,
  onClearAll,
  refreshing,
  onRefresh,
}: Props) {
  const c = useColors();
  const t = useT();
  const styles = useMemo(() => makeStyles(c), [c]);

  const confirmClear = () =>
    Alert.alert(t.favClearTitle, t.favClearText, [
      { text: t.cancel, style: 'cancel' },
      { text: t.favClear, style: 'destructive', onPress: onClearAll },
    ]);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>{t.favourites}</Text>
      <View style={styles.subtitleRow}>
        <Text style={styles.subtitle}>
          {liked.length ? t.favCount(liked.length) : t.listEmpty}
        </Text>
        {liked.length > 0 && (
          <Pressable
            onPress={confirmClear}
            hitSlop={8}
            style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="trash-outline" size={14} color={c.textDim} />
            <Text style={styles.clearText}>{t.favClear}</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={liked}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Row car={item} onOpen={onOpenCar} onRemove={onRemove} />}
        contentContainerStyle={liked.length ? styles.list : styles.listEmpty}
        showsVerticalScrollIndicator={false}
        // Здесь список, а не колода: тянуть вниз — привычнее любой кнопки.
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.textDim} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="heart-outline" size={54} color={c.textFaint} />
            <Text style={styles.emptyTitle}>{t.favEmptyTitle}</Text>
            <Text style={styles.emptyText}>
              {t.favEmptyText}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    root: { flex: 1 },
    title: {
      color: c.text,
      fontSize: 28,
      fontWeight: '900',
      paddingHorizontal: 20,
      paddingBottom: 2,
      letterSpacing: -0.5,
    },
    subtitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 20,
      paddingBottom: 14,
    },
    subtitle: { color: c.textFaint, fontSize: 13, fontWeight: '600' },
    clearBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 5,
      paddingHorizontal: 11,
      borderRadius: radius.pill,
      backgroundColor: c.bgElevated,
      borderWidth: 1,
      borderColor: c.border,
    },
    clearText: { color: c.textDim, fontSize: 12, fontWeight: '700' },
    list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
    listEmpty: { flexGrow: 1 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.bgElevated,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      padding: 10,
    },
    thumb: { width: 96, height: 72, borderRadius: radius.sm, backgroundColor: c.card },
    rowBody: { flex: 1, gap: 2 },
    rowPrice: { color: c.text, fontSize: 17, fontWeight: '800' },
    rowName: { color: c.text, fontSize: 14, fontWeight: '600' },
    rowMeta: { color: c.textDim, fontSize: 12 },
    removeBtn: { padding: 6 },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 40,
    },
    emptyTitle: { color: c.text, fontSize: 18, fontWeight: '800' },
    emptyText: { color: c.textDim, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  });
