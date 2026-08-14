/**
 * Условия использования и политика конфиденциальности. Полноэкранная шторка, а
 * не ссылка в браузер: документы лежат в приложении (../legal.ts) и должны
 * открываться без сети.
 */

import { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Palette } from '../theme';
import { useColors } from '../ThemeContext';
import { useI18n } from '../I18nContext';
import { LegalKey, legal } from '../legal';

interface Props {
  /** null — шторка закрыта; ключ выбирает документ. */
  doc: LegalKey | null;
  onClose: () => void;
}

export function LegalScreen({ doc, onClose }: Props) {
  const c = useColors();
  const { lang } = useI18n();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(c), [c]);

  // Язык документа — тот же, что в приложении: сменили язык, закрыли и открыли
  // заново — текст другой.
  const content = doc ? legal[lang][doc] : null;

  return (
    <Modal visible={!!content} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color={c.text} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {content?.title}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.updated}>{content?.updated}</Text>
          <Text style={styles.intro}>{content?.intro}</Text>

          {content?.sections.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.text}>{section.text}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    headerTitle: { flex: 1, color: c.text, fontSize: 17, fontWeight: '800' },
    body: { paddingHorizontal: 20, paddingTop: 18 },
    updated: { color: c.textFaint, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    intro: { color: c.text, fontSize: 15, lineHeight: 22, marginTop: 10 },
    section: { marginTop: 22 },
    sectionTitle: { color: c.text, fontSize: 15, fontWeight: '800', marginBottom: 6 },
    text: { color: c.textDim, fontSize: 14, lineHeight: 21 },
  });
