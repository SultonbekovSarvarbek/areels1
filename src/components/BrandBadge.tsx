import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { fixed, radius } from '../theme';

/**
 * Логотипы лежат локально, чтобы бейдж не зависел от сети — фото и так грузятся
 * долго, а марка должна читаться сразу. Марки без файла показываем названием:
 * так бейдж остаётся на месте и вёрстка не прыгает.
 */
const LOGOS: Record<string, number> = {
  Chevrolet: require('../../assets/brands/chevrolet.svg'),
  Kia: require('../../assets/brands/kia.svg'),
  Toyota: require('../../assets/brands/toyota.svg'),
};

export function BrandBadge({ brand }: { brand: string }) {
  const logo = LOGOS[brand];

  return (
    <View style={styles.badge} accessibilityLabel={brand}>
      {logo ? (
        <Image source={logo} style={styles.logo} contentFit="contain" tintColor={fixed.onPhoto} />
      ) : (
        <Text style={styles.text}>{brand}</Text>
      )}
    </View>
  );
}

// Бейдж лежит поверх фотографии, поэтому от темы не зависит.
const styles = StyleSheet.create({
  badge: {
    height: 30,
    minWidth: 30,
    paddingHorizontal: 9,
    borderRadius: radius.pill,
    backgroundColor: fixed.glass,
    borderWidth: 1,
    borderColor: fixed.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 20, height: 20 },
  text: { color: fixed.onPhoto, fontSize: 12, fontWeight: '800', letterSpacing: 0.2 },
});
