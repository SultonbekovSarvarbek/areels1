/**
 * Согласие с условиями на первом запуске.
 *
 * App Store 1.2 требует, чтобы пользователь принял EULA до того, как получит
 * доступ к пользовательскому контенту. Регистрации в AvtoLike нет — каталог
 * смотрят без аккаунта, — поэтому «до регистрации» здесь означает «до первого
 * показа колоды»: пока согласие не принято, приложение дальше этого экрана не
 * пускает.
 *
 * Полные тексты открываются отсюда же, той самой шторкой, что и из профиля:
 * ревьюер должен убедиться, что за ссылкой лежит документ, а не заглушка.
 */

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { Palette, radius } from '../theme';
import { useColors } from '../ThemeContext';
import { useT } from '../I18nContext';
import { LegalKey } from '../legal';
import { LegalScreen } from './LegalScreen';

interface Props {
  onAccept: () => void;
}

function Rule({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.rule}>
      <View style={styles.ruleIcon}>
        <Ionicons name={icon} size={17} color={c.like} />
      </View>
      <Text style={styles.ruleText}>{text}</Text>
    </View>
  );
}

export function ConsentScreen({ onAccept }: Props) {
  const c = useColors();
  const t = useT();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [doc, setDoc] = useState<LegalKey | null>(null);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24 }]}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.logoRow}>
          <Image
            source={require('../../assets/logo-mark.png')}
            style={styles.logoMark}
            contentFit="contain"
          />
          <Text style={styles.logo}>AvtoLike</Text>
        </View>

        <Text style={styles.title}>{t.consentTitle}</Text>
        <Text style={styles.intro}>{t.consentIntro}</Text>

        <View style={styles.rules}>
          <Rule icon="shield-checkmark-outline" text={t.consentRuleModeration} />
          <Rule icon="hand-left-outline" text={t.consentRuleZero} />
          <Rule icon="flag-outline" text={t.consentRuleReport} />
          <Rule icon="person-remove-outline" text={t.consentRuleBlock} />
        </View>

        <View style={styles.docs}>
          {(['terms', 'privacy'] as LegalKey[]).map((key) => (
            <Pressable
              key={key}
              style={({ pressed }) => [styles.docRow, pressed && styles.pressed]}
              onPress={() => setDoc(key)}
            >
              <Ionicons name="document-text-outline" size={18} color={c.textDim} />
              <Text style={styles.docText}>
                {key === 'terms' ? t.consentReadTerms : t.consentReadPrivacy}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={c.textFaint} />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <Text style={styles.note}>{t.consentNote}</Text>
        <Pressable
          style={({ pressed }) => [styles.accept, pressed && styles.pressed]}
          onPress={onAccept}
        >
          <Text style={styles.acceptText}>{t.consentAccept}</Text>
        </Pressable>
      </View>

      <LegalScreen doc={doc} onClose={() => setDoc(null)} />
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    body: { paddingHorizontal: 24, paddingBottom: 24 },
    logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    logoMark: { width: 30, height: 30 },
    logo: { color: c.text, fontSize: 22, fontWeight: '900', letterSpacing: -0.4 },
    title: { color: c.text, fontSize: 28, fontWeight: '900', letterSpacing: -0.6, marginTop: 26 },
    intro: { color: c.textDim, fontSize: 15, lineHeight: 22, marginTop: 10 },
    rules: { marginTop: 26, gap: 16 },
    rule: { flexDirection: 'row', gap: 12 },
    ruleIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    ruleText: { flex: 1, color: c.text, fontSize: 14, lineHeight: 21, paddingTop: 6 },
    docs: { marginTop: 28, gap: 8 },
    docRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgElevated,
    },
    docText: { flex: 1, color: c.text, fontSize: 15, fontWeight: '600' },
    pressed: { opacity: 0.7 },
    footer: {
      paddingHorizontal: 24,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: c.border,
      backgroundColor: c.bgElevated,
    },
    note: { color: c.textFaint, fontSize: 12, lineHeight: 17, textAlign: 'center' },
    accept: {
      marginTop: 14,
      backgroundColor: c.like,
      borderRadius: radius.pill,
      paddingVertical: 16,
      alignItems: 'center',
    },
    acceptText: { color: c.onBright, fontSize: 16, fontWeight: '800' },
  });
