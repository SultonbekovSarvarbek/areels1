import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Palette, shadow } from '../theme';
import { useColors } from '../ThemeContext';
import { useT } from '../I18nContext';

interface Props {
  onUndo: () => void;
  onSkip: () => void;
  onLike: () => void;
  canUndo: boolean;
  disabled?: boolean;
}

interface ButtonProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  size: number;
  label: string;
  styles: ReturnType<typeof makeStyles>;
  onPress: () => void;
  disabled?: boolean;
}

function CircleButton({ icon, color, size, label, styles, onPress, disabled }: ButtonProps) {
  return (
    <View style={styles.item}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityLabel={label}
        style={({ pressed }) => [
          styles.button,
          { width: size, height: size, borderRadius: size / 2, borderColor: color },
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
        hitSlop={6}
      >
        <Ionicons name={icon} size={size * 0.46} color={color} />
      </Pressable>
      <Text style={[styles.label, disabled && styles.disabled]}>{label}</Text>
    </View>
  );
}

export function ActionBar({ onUndo, onSkip, onLike, canUndo, disabled }: Props) {
  const t = useT();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.row}>
      <CircleButton
        icon="arrow-undo"
        color={c.accent}
        size={52}
        label={t.actionUndo}
        styles={styles}
        onPress={onUndo}
        disabled={!canUndo}
      />
      <CircleButton
        icon="play-skip-forward"
        color={c.skip}
        size={62}
        label={t.actionSkip}
        styles={styles}
        onPress={onSkip}
        disabled={disabled}
      />
      <CircleButton
        icon="heart"
        color={c.like}
        size={62}
        label={t.actionLike}
        styles={styles}
        onPress={onLike}
        disabled={disabled}
      />
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      // По нижнему краю, иначе подписи разъедутся: кнопка «Назад» ниже соседних.
      alignItems: 'flex-end',
      justifyContent: 'center',
      gap: 22,
      paddingTop: 12,
      paddingBottom: 10,
    },
    item: { alignItems: 'center', gap: 6 },
    label: { color: c.textFaint, fontSize: 11, fontWeight: '700' },
    button: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.bgElevated,
      borderWidth: 1.5,
      ...shadow.button,
    },
    pressed: { transform: [{ scale: 0.92 }], opacity: 0.85 },
    disabled: { opacity: 0.35 },
  });
