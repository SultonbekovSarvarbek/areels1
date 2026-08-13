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

function Chip({
  icon,
  label,
  eco,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  /** Зелёный чип — им помечен электромобиль, чтобы его было видно в колоде. */
  eco?: boolean;
}) {
  return (
    <View style={[styles.chip, eco && styles.chipEco]}>
      <Ionicons name={icon} size={13} color={eco ? fixed.ecoText : fixed.onPhoto} />
      <Text style={[styles.chipText, eco && styles.chipTextEco]}>{label}</Text>
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
          <Chip icon="calendar-outline" label={String(car.year)} />
          <Chip icon="speedometer-outline" label={formatMileage(car.mileage, t.unitKm)} />
          {/* Топливо на карточке показываем только у электро: остальным типам
              место в характеристиках, а электромобиль — сам по себе аргумент. */}
          {car.fuel === 'electric' && <Chip icon="flash-outline" label={t.fuel.electric} eco />}
          <Chip icon="location-outline" label={t.city[car.city]} />
          <Chip
            icon={car.negotiable ? 'pricetag-outline' : 'lock-closed-outline'}
            label={car.negotiable ? t.bargain : t.bargainNo}
          />
        </View>

        {/* Самого номера в колоде нет — он приманка: плашка обещает телефон,
            а тап уводит в карточку, где номер и лежит. */}
        <Pressable
          style={({ pressed }) => [styles.detailsBtn, pressed && styles.detailsBtnPressed]}
          onPress={() => onPressDetails?.(car)}
          hitSlop={8}
          accessibilityLabel={t.details}
        >
          <Ionicons name="call-outline" size={15} color={fixed.ecoText} />
          <Text style={styles.detailsPhone}>{t.showPhone}</Text>
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
  // Год переехал к остальным чипам вниз, поэтому в строке остался один значок.
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
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
  chipEco: { backgroundColor: fixed.ecoChip, borderWidth: 1, borderColor: fixed.ecoBorder },
  chipText: { color: fixed.onPhoto, fontSize: 12, fontWeight: '600' },
  chipTextEco: { color: fixed.ecoText, fontWeight: '700' },
  // Зелёная плашка, как у чипа «Электро»: после цены это самое заметное место
  // на карточке, и оно уводит в детали.
  detailsBtn: {
    marginTop: 6,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: fixed.ecoBorder,
    backgroundColor: fixed.ecoChip,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  detailsBtnPressed: { backgroundColor: fixed.glassPressed },
  detailsPhone: { color: fixed.ecoText, fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
});
