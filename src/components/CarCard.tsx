import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { Car } from '../types';
import { fixed, radius } from '../theme';
import { useColors } from '../ThemeContext';
import { useT } from '../I18nContext';
import { formatMileage, formatPriceShort } from '../utils/format';
import { BrandBadge } from './BrandBadge';

interface Props {
  car: Car;
  onPressDetails?: (car: Car) => void;
}

function Chip({ icon, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={13} color={fixed.onPhoto} />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

function CarCardBase({ car, onPressDetails }: Props) {
  const t = useT();
  const c = useColors();

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <Image
        source={{ uri: car.photos[0] }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={220}
        cachePolicy="memory-disk"
      />

      <LinearGradient
        colors={[fixed.scrimTop, 'transparent']}
        style={styles.topScrim}
        pointerEvents="none"
      />

      <View style={styles.topRow}>
        <BrandBadge brand={car.brand} />
        <View style={styles.yearBadge}>
          <Text style={styles.yearText}>{car.year}</Text>
        </View>
      </View>

      <LinearGradient
        colors={fixed.cardBottom}
        locations={[0, 0.45, 1]}
        style={styles.bottomScrim}
        pointerEvents="none"
      />

      <View style={styles.info}>
        <Text style={styles.price}>{formatPriceShort(car.price)}</Text>
        <Text style={styles.name} numberOfLines={1}>
          <Text style={styles.brand}>{car.brand}</Text> {car.model}
        </Text>

        <View style={styles.chips}>
          <Chip icon="speedometer-outline" label={formatMileage(car.mileage, t.unitKm)} />
          <Chip icon="shield-checkmark-outline" label={t.condition[car.condition]} />
          <Chip icon="location-outline" label={t.city[car.city]} />
          <Chip
            icon={car.negotiable ? 'pricetag-outline' : 'lock-closed-outline'}
            label={car.negotiable ? t.bargain : t.bargainNo}
          />
        </View>

        <Pressable
          style={({ pressed }) => [styles.detailsBtn, pressed && styles.detailsBtnPressed]}
          onPress={() => onPressDetails?.(car)}
          hitSlop={8}
        >
          <Ionicons name="information-circle-outline" size={16} color={fixed.onPhoto} />
          <Text style={styles.detailsText}>{t.details}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export const CarCard = React.memo(CarCardBase);

const styles = StyleSheet.create({
  // Цвета подложки приходят из темы инлайном — она видна, пока грузится фото.
  card: { flex: 1, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1 },
  topScrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
  bottomScrim: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '62%' },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  yearBadge: {
    // Высота совпадает с BrandBadge, иначе бейджи в строке разной толщины.
    height: 30,
    justifyContent: 'center',
    backgroundColor: fixed.glass,
    paddingHorizontal: 11,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: fixed.glassBorder,
  },
  yearText: { color: fixed.onPhoto, fontSize: 12, fontWeight: '700' },
  info: { position: 'absolute', left: 18, right: 18, bottom: 18, gap: 8 },
  price: { color: fixed.onPhoto, fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  // Акцент на модели, а не на марке: марка уже показана значком в углу фото.
  name: { color: fixed.onPhoto, fontSize: 19, fontWeight: '700' },
  brand: { color: fixed.onPhotoDim, fontWeight: '500' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: fixed.glassSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: { color: fixed.onPhoto, fontSize: 12, fontWeight: '600' },
  detailsBtn: {
    marginTop: 6,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: fixed.glassBorderStrong,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  detailsBtnPressed: { backgroundColor: fixed.glassPressed },
  detailsText: { color: fixed.onPhoto, fontSize: 13, fontWeight: '600' },
});
