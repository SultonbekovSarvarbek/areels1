import { StyleSheet, View } from 'react-native';

import { fixed } from '../theme';

interface Props {
  count: number;
  index: number;
}

/**
 * Сегменты-полоски как в сторис. Для одного фото не рендерится вовсе,
 * чтобы не рисовать бессмысленную полосу во всю ширину.
 * Цвета не зависят от темы — полоски лежат поверх фотографии.
 */
export function PhotoProgress({ count, index }: Props) {
  if (count < 2) return null;

  return (
    <View style={styles.row} pointerEvents="none">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.segment, i === index && styles.segmentActive]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
  segment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: fixed.segment,
  },
  segmentActive: { backgroundColor: fixed.onPhoto },
});
