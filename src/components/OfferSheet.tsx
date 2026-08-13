import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Car } from '../types';
import { Palette, fixed, radius } from '../theme';
import { useColors } from '../ThemeContext';
import { useT } from '../I18nContext';
import { formatPrice } from '../utils/format';

/** Быстрые скидки от цены объявления — типичный шаг торга на вторичке. */
const STEPS = [3, 5, 10];

interface Props {
  car: Car | null;
  /** Уже отправленная цена по этой машине — открываем форму с ней. */
  current?: number;
  onClose: () => void;
  onSubmit: (price: number, comment: string) => void;
}

export function OfferSheet({ car, current, onClose, onSubmit }: Props) {
  const c = useColors();
  const t = useT();
  const styles = useMemo(() => makeStyles(c), [c]);
  const insets = useSafeAreaInsets();

  const [price, setPrice] = useState('');
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!car) return;
    // По умолчанию минус 5% — предлагать цену объявления бессмысленно.
    setPrice(String(current ?? Math.round((car.price * 0.95) / 100) * 100));
    setComment('');
  }, [car, current]);

  if (!car) return null;

  const value = Number(price) || 0;
  const diff = value - car.price;
  const percent = car.price ? Math.round((diff / car.price) * 100) : 0;
  const valid = value > 0;

  const applyStep = (p: number) => setPrice(String(Math.round((car.price * (1 - p / 100)) / 100) * 100));

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
            <View style={styles.header}>
              <Text style={styles.title}>{t.offerTitle}</Text>
              <Pressable onPress={onClose} hitSlop={10}>
                <Ionicons name="close" size={24} color={c.textDim} />
              </Pressable>
            </View>

            <Text style={styles.car}>
              {car.brand} {car.model}, {car.year}
            </Text>
            <Text style={styles.asking}>{t.offerAsking(formatPrice(car.price))}</Text>

            <View style={styles.amountRow}>
              <Text style={styles.currency}>$</Text>
              <TextInput
                style={styles.amount}
                value={price}
                onChangeText={(v) => setPrice(v.replace(/\D/g, '').slice(0, 7))}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={c.textFaint}
                autoFocus
              />
            </View>

            {valid && (
              <Text style={[styles.diff, diff > 0 && styles.diffOver]}>
                {diff === 0
                  ? t.offerSame
                  : diff < 0
                    ? t.offerBelow(formatPrice(-diff), Math.abs(percent))
                    : t.offerAbove(formatPrice(diff))}
              </Text>
            )}

            <View style={styles.steps}>
              {STEPS.map((p) => (
                <Pressable key={p} style={styles.step} onPress={() => applyStep(p)}>
                  <Text style={styles.stepText}>−{p}%</Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              style={styles.comment}
              value={comment}
              onChangeText={setComment}
              placeholder={t.offerComment}
              placeholderTextColor={c.textFaint}
              multiline
              maxLength={200}
            />

            <Pressable
              style={[styles.primary, !valid && styles.primaryOff]}
              onPress={() => valid && onSubmit(value, comment)}
            >
              <Text style={styles.primaryText}>
                {current ? t.offerChange : t.offerSend}
              </Text>
            </Pressable>

            <View style={styles.note}>
              <Ionicons name="information-circle-outline" size={15} color={c.accent} />
              <Text style={styles.noteText}>
                {t.offerDemoNote}
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: c.bgElevated,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      paddingHorizontal: 20,
      paddingTop: 18,
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { color: c.text, fontSize: 22, fontWeight: '900', letterSpacing: -0.4 },
    car: { color: c.text, fontSize: 15, fontWeight: '700', marginTop: 14 },
    asking: { color: c.textDim, fontSize: 13, marginTop: 2 },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 18,
      borderBottomWidth: 2,
      borderBottomColor: c.border,
      paddingBottom: 8,
    },
    currency: { color: c.textDim, fontSize: 30, fontWeight: '800' },
    amount: { flex: 1, color: c.text, fontSize: 36, fontWeight: '900', letterSpacing: -1 },
    diff: { color: c.like, fontSize: 13, fontWeight: '700', marginTop: 10 },
    diffOver: { color: c.accent },
    steps: { flexDirection: 'row', gap: 8, marginTop: 14 },
    step: {
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: radius.pill,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    stepText: { color: c.text, fontSize: 13, fontWeight: '700' },
    comment: {
      marginTop: 16,
      minHeight: 72,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      padding: 14,
      color: c.text,
      fontSize: 14,
      textAlignVertical: 'top',
    },
    primary: {
      backgroundColor: c.like,
      borderRadius: radius.pill,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 18,
    },
    primaryOff: { opacity: 0.4 },
    primaryText: { color: fixed.onBright, fontSize: 16, fontWeight: '800' },
    note: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
    noteText: { color: c.textDim, fontSize: 12, flex: 1, lineHeight: 16 },
  });
