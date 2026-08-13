import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { BodyType, Filters, Transmission, emptyFilters } from '../types';
import { Palette, fixed, radius } from '../theme';
import { useColors } from '../ThemeContext';
import { useT } from '../I18nContext';
import { PriceSlider } from './PriceSlider';

const BODY_TYPES: BodyType[] = ['sedan', 'hatchback', 'crossover', 'suv', 'minivan'];
const TRANSMISSIONS: Transmission[] = ['auto', 'manual', 'robot', 'cvt'];
/** Шаг ползунка цены: округлять до сотен долларов на такой полосе бессмысленно. */
const PRICE_STEP = 500;
const YEAR_STEPS = [2015, 2018, 2021, 2023];

interface Props {
  visible: boolean;
  value: Filters;
  /** Бренды из загруженного каталога — раньше выводились из заглушки на уровне модуля. */
  brands: string[];
  /** Границы ползунка цены — считаются по каталогу, а не заданы константами. */
  priceRange: { min: number; max: number };
  /** Сколько машин попадает под выбранные фильтры — считаем на лету для черновика. */
  countFor: (filters: Filters) => number;
  onChange: (filters: Filters) => void;
  onClose: () => void;
}

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((v) => v !== item) : [...list, item];
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && { opacity: 0.7 }]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.chipRow}>{children}</View>
    </View>
  );
}

export function FiltersSheet({
  visible,
  value,
  brands,
  priceRange,
  countFor,
  onChange,
  onClose,
}: Props) {
  const t = useT();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<Filters>(value);

  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  const apply = () => {
    onChange(draft);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t.filters}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={c.textDim} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <Section title={t.fBrand}>
              {brands.map((brand) => (
                <Chip
                  key={brand}
                  label={brand}
                  active={draft.brands.includes(brand)}
                  onPress={() => setDraft({ ...draft, brands: toggle(draft.brands, brand) })}
                />
              ))}
            </Section>

            <Section title={t.fBody}>
              {BODY_TYPES.map((body) => (
                <Chip
                  key={body}
                  label={t.bodyType[body]}
                  active={draft.bodyTypes.includes(body)}
                  onPress={() => setDraft({ ...draft, bodyTypes: toggle(draft.bodyTypes, body) })}
                />
              ))}
            </Section>

            <Section title={t.fTransmission}>
              {TRANSMISSIONS.map((tr) => (
                <Chip
                  key={tr}
                  label={t.transmission[tr]}
                  active={draft.transmissions.includes(tr)}
                  onPress={() =>
                    setDraft({ ...draft, transmissions: toggle(draft.transmissions, tr) })
                  }
                />
              ))}
            </Section>

            <Section title={t.fPriceTo}>
              <PriceSlider
                value={draft.maxPrice}
                min={priceRange.min}
                max={priceRange.max}
                step={PRICE_STEP}
                anyLabel={t.anyPrice}
                onChange={(maxPrice) => setDraft((prev) => ({ ...prev, maxPrice }))}
              />
            </Section>

            <Section title={t.fYearFrom}>
              {YEAR_STEPS.map((year) => (
                <Chip
                  key={year}
                  label={String(year)}
                  active={draft.minYear === year}
                  onPress={() =>
                    setDraft({ ...draft, minYear: draft.minYear === year ? null : year })
                  }
                />
              ))}
            </Section>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
            <Pressable style={styles.reset} onPress={() => setDraft(emptyFilters)}>
              <Text style={styles.resetText}>{t.reset}</Text>
            </Pressable>
            <Pressable style={styles.apply} onPress={apply}>
              <Text style={styles.applyText}>{t.show(countFor(draft))}</Text>
            </Pressable>
          </View>
        </View>
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
      maxHeight: '86%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 10,
    },
    headerTitle: { color: c.text, fontSize: 20, fontWeight: '800' },
    body: { paddingHorizontal: 20, paddingBottom: 16, gap: 18 },
    section: { gap: 10 },
    sectionTitle: { color: c.textDim, fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: radius.pill,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipActive: { backgroundColor: c.text, borderColor: c.text },
    chipText: { color: c.text, fontSize: 13, fontWeight: '600' },
    chipTextActive: { color: c.bg },
    footer: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    reset: {
      paddingHorizontal: 22,
      justifyContent: 'center',
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: c.border,
    },
    resetText: { color: c.textDim, fontSize: 15, fontWeight: '700' },
    apply: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 15,
      borderRadius: radius.pill,
      backgroundColor: c.like,
    },
    applyText: { color: fixed.onBright, fontSize: 15, fontWeight: '800' },
  });
