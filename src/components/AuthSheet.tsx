import { useEffect, useMemo, useRef, useState } from 'react';
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

import { Palette, radius } from '../theme';
import { useColors } from '../ThemeContext';
import { useT } from '../I18nContext';
import { formatPhone } from '../utils/format';

const RESEND_SEC = 60;

interface Props {
  visible: boolean;
  onClose: () => void;
  onDone: (phone: string, name: string) => void;
}

/**
 * Мок авторизации: SMS никуда не уходит, код принимается любой из четырёх цифр.
 * Когда появится бэкенд, меняются два места — requestCode и verifyCode, вёрстка
 * и переходы между шагами остаются как есть.
 */
export function AuthSheet({ visible, onClose, onDone }: Props) {
  const c = useColors();
  const t = useT();
  const styles = useMemo(() => makeStyles(c), [c]);
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [digits, setDigits] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState(0);
  const codeInput = useRef<TextInput>(null);

  // Каждое открытие начинается с чистого листа.
  useEffect(() => {
    if (!visible) return;
    setStep('phone');
    setDigits('');
    setName('');
    setCode('');
    setError(null);
    setLeft(0);
  }, [visible]);

  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);

  const phone = `+998${digits}`;
  const phoneReady = digits.length === 9;
  const nameReady = name.trim().length >= 2;

  const requestCode = () => {
    if (!phoneReady) return setError(t.errPhone);
    if (!nameReady) return setError(t.errName);
    setError(null);
    setStep('code');
    setLeft(RESEND_SEC);
    setTimeout(() => codeInput.current?.focus(), 350);
  };

  const verifyCode = () => {
    if (code.length !== 4) return setError(t.errCode);
    setError(null);
    onDone(phone, name.trim());
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
            <View style={styles.header}>
              <Pressable onPress={step === 'code' ? () => setStep('phone') : onClose} hitSlop={10}>
                <Ionicons
                  name={step === 'code' ? 'arrow-back' : 'close'}
                  size={24}
                  color={c.textDim}
                />
              </Pressable>
            </View>

            {step === 'phone' ? (
              <>
                <Text style={styles.title}>{t.authTitle}</Text>
                <Text style={styles.subtitle}>
                  {t.authSubtitle}
                </Text>

                <Text style={styles.label}>{t.authPhone}</Text>
                <View style={styles.phoneRow}>
                  <Text style={styles.prefix}>+998</Text>
                  <TextInput
                    style={styles.phoneInput}
                    value={digits}
                    onChangeText={(v) => setDigits(v.replace(/\D/g, '').slice(0, 9))}
                    keyboardType="number-pad"
                    placeholder="90 123 45 67"
                    placeholderTextColor={c.textFaint}
                    maxLength={9}
                    autoFocus
                  />
                </View>

                <Text style={styles.label}>{t.authName}</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder={t.authNamePlaceholder}
                  placeholderTextColor={c.textFaint}
                  maxLength={40}
                />

                {error && <Text style={styles.error}>{error}</Text>}

                <Pressable
                  style={[styles.primary, !(phoneReady && nameReady) && styles.primaryOff]}
                  onPress={requestCode}
                >
                  <Text style={styles.primaryText}>{t.authGetCode}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.title}>{t.authCodeTitle}</Text>
                <Text style={styles.subtitle}>{t.authCodeSentTo(formatPhone(phone))}</Text>

                <TextInput
                  ref={codeInput}
                  style={[styles.input, styles.codeInput]}
                  value={code}
                  onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 4))}
                  keyboardType="number-pad"
                  placeholder="••••"
                  placeholderTextColor={c.textFaint}
                  maxLength={4}
                />

                <View style={styles.hint}>
                  <Ionicons name="information-circle-outline" size={15} color={c.accent} />
                  <Text style={styles.hintText}>
                    {t.authDemoHint}
                  </Text>
                </View>

                {error && <Text style={styles.error}>{error}</Text>}

                <Pressable
                  style={[styles.primary, code.length !== 4 && styles.primaryOff]}
                  onPress={verifyCode}
                >
                  <Text style={styles.primaryText}>{t.authConfirm}</Text>
                </Pressable>

                <Pressable
                  style={styles.resend}
                  onPress={() => setLeft(RESEND_SEC)}
                  disabled={left > 0}
                >
                  <Text style={[styles.resendText, left > 0 && styles.resendOff]}>
                    {left > 0 ? t.authResendIn(left) : t.authResend}
                  </Text>
                </Pressable>
              </>
            )}
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
      paddingTop: 14,
    },
    header: { flexDirection: 'row', paddingBottom: 8 },
    title: { color: c.text, fontSize: 24, fontWeight: '900', letterSpacing: -0.4 },
    subtitle: { color: c.textDim, fontSize: 14, marginTop: 6, lineHeight: 20 },
    label: {
      color: c.textFaint,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      marginTop: 20,
      marginBottom: 8,
    },
    input: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: 14,
      paddingVertical: 14,
      color: c.text,
      fontSize: 17,
      fontWeight: '600',
    },
    phoneRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: 14,
    },
    prefix: { color: c.textDim, fontSize: 17, fontWeight: '700', marginRight: 8 },
    phoneInput: { flex: 1, paddingVertical: 14, color: c.text, fontSize: 17, fontWeight: '600' },
    codeInput: { textAlign: 'center', letterSpacing: 10, fontSize: 24 },
    hint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
    hintText: { color: c.textDim, fontSize: 12, flex: 1 },
    error: { color: c.accent, fontSize: 13, fontWeight: '600', marginTop: 12 },
    primary: {
      backgroundColor: c.like,
      borderRadius: radius.pill,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 22,
    },
    primaryOff: { opacity: 0.4 },
    primaryText: { color: c.onBright, fontSize: 16, fontWeight: '800' },
    resend: { alignItems: 'center', paddingVertical: 14 },
    resendText: { color: c.textDim, fontSize: 14, fontWeight: '600' },
    resendOff: { color: c.textFaint },
  });
