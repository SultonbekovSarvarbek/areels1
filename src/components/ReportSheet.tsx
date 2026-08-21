/**
 * Жалоба на объявление и блокировка продавца — одна шторка на оба действия.
 *
 * Вместе, а не порознь, потому что человек, дошедший до «Пожаловаться», обычно
 * хочет ещё и не видеть этого продавца больше никогда. Разводить это по разным
 * местам интерфейса значит заставить его искать второе после первого.
 *
 * Подтверждение показываем внутри шторки, а не системным Alert: шторка живёт
 * поверх модалки карточки, и на iOS алерт, поднятый в тот же кадр, когда обе
 * модалки закрываются, может не показаться вовсе. Заодно человек видит, что
 * жалоба принята, не выходя из того же экрана.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Car, REPORT_REASONS, ReportReason } from '../types';
import { Palette, radius } from '../theme';
import { useColors } from '../ThemeContext';
import { useT } from '../I18nContext';
import { useModeration } from '../ModerationContext';

interface Props {
  /** null — шторка закрыта. */
  car: Car | null;
  onClose: () => void;
  /**
   * Объявление скрыто — карточку под шторкой, если она открыта, нужно закрыть
   * тоже: оставлять человека на объявлении, на которое он только что
   * пожаловался, нельзя.
   */
  onHidden: () => void;
}

export function ReportSheet({ car, onClose, onHidden }: Props) {
  const c = useColors();
  const t = useT();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { report, blockSeller } = useModeration();

  const [reason, setReason] = useState<ReportReason | null>(null);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);

  // Каждое открытие — с чистого листа: причина от прошлого объявления здесь
  // хуже, чем её отсутствие.
  useEffect(() => {
    if (!car) return;
    setReason(null);
    setComment('');
    setSending(false);
    setDone(false);
    setFailed(false);
  }, [car?.id]);

  const send = async () => {
    if (!car || !reason || sending) return;
    setSending(true);
    setFailed(false);

    try {
      await report(car.id, reason, comment.trim());
      setDone(true);
    } catch {
      // Объявление уже скрыто у пользователя — ModerationContext прячет его до
      // запроса. Не дошла только сама жалоба, и повторить её имеет смысл.
      setFailed(true);
    } finally {
      setSending(false);
    }
  };

  /** Закрыть шторку и убрать из-под неё объявление, которого больше не должно быть. */
  const finish = () => {
    onClose();
    onHidden();
  };

  const confirmBlock = () => {
    if (!car) return;
    Alert.alert(t.blockTitle, t.blockText(car.seller.name), [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.blockConfirm,
        style: 'destructive',
        onPress: () => {
          blockSeller({ id: car.seller.id, name: car.seller.name });
          finish();
        },
      },
    ]);
  };

  return (
    <Modal
      visible={!!car}
      animationType="slide"
      transparent
      onRequestClose={done ? finish : onClose}
    >
      <View style={styles.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
            {done ? (
              <View style={styles.doneBox}>
                <View style={styles.doneIcon}>
                  <Ionicons name="checkmark" size={30} color={c.onBright} />
                </View>
                <Text style={styles.doneTitle}>{t.reportDoneTitle}</Text>
                <Text style={styles.doneText}>{t.reportDoneText}</Text>

                {/* Заблокировать продавца можно и после отправки: жалоба уводит
                    одно объявление, блокировка — всего человека. */}
                <Pressable style={styles.primary} onPress={finish}>
                  <Text style={styles.primaryText}>{t.reportDoneBtn}</Text>
                </Pressable>
                <Pressable style={styles.block} onPress={confirmBlock}>
                  <Ionicons name="person-remove-outline" size={18} color={c.skip} />
                  <Text style={styles.blockText}>{t.blockSeller}</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.header}>
                  <Text style={styles.title}>{t.reportTitle}</Text>
                  <Pressable onPress={onClose} hitSlop={12}>
                    <Ionicons name="close" size={24} color={c.textDim} />
                  </Pressable>
                </View>

                <Text style={styles.subtitle}>{t.reportSubtitle}</Text>

                <ScrollView
                  style={styles.reasons}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {REPORT_REASONS.map((key) => {
                    const active = reason === key;
                    return (
                      <Pressable
                        key={key}
                        style={[styles.reason, active && styles.reasonActive]}
                        onPress={() => setReason(key)}
                      >
                        <Ionicons
                          name={active ? 'radio-button-on' : 'radio-button-off'}
                          size={20}
                          color={active ? c.like : c.textFaint}
                        />
                        <Text style={[styles.reasonText, active && styles.reasonTextActive]}>
                          {t.reportReason[key]}
                        </Text>
                      </Pressable>
                    );
                  })}

                  <Text style={styles.label}>{t.reportCommentLabel}</Text>
                  <TextInput
                    style={styles.input}
                    value={comment}
                    onChangeText={setComment}
                    placeholder={t.reportCommentPlaceholder}
                    placeholderTextColor={c.textFaint}
                    multiline
                    maxLength={500}
                  />
                </ScrollView>

                {failed && <Text style={styles.error}>{t.reportFailText}</Text>}

                <Pressable
                  style={[styles.primary, (!reason || sending) && styles.primaryOff]}
                  onPress={send}
                  disabled={!reason || sending}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color={c.onBright} />
                  ) : (
                    <Text style={styles.primaryText}>
                      {reason ? t.reportSend : t.reportPickReason}
                    </Text>
                  )}
                </Pressable>

                <Pressable style={styles.block} onPress={confirmBlock}>
                  <Ionicons name="person-remove-outline" size={18} color={c.skip} />
                  <Text style={styles.blockText}>{t.blockSeller}</Text>
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
      paddingTop: 18,
      maxHeight: '88%',
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    title: { flex: 1, color: c.text, fontSize: 21, fontWeight: '900', letterSpacing: -0.3 },
    subtitle: { color: c.textDim, fontSize: 13, lineHeight: 19, marginTop: 8 },
    // Список причин прокручивается: на маленьком экране с открытой клавиатурой
    // семь пунктов и поле комментария целиком не помещаются.
    reasons: { marginTop: 16 },
    reason: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      marginBottom: 8,
    },
    reasonActive: { borderColor: c.like },
    reasonText: { flex: 1, color: c.textDim, fontSize: 15, fontWeight: '600' },
    reasonTextActive: { color: c.text, fontWeight: '700' },
    label: {
      color: c.textFaint,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      marginTop: 12,
      marginBottom: 8,
    },
    input: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: c.text,
      fontSize: 15,
      minHeight: 76,
      textAlignVertical: 'top',
    },
    error: { color: c.accent, fontSize: 13, fontWeight: '600', marginTop: 12 },
    primary: {
      backgroundColor: c.like,
      borderRadius: radius.pill,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 16,
      alignSelf: 'stretch',
    },
    primaryOff: { opacity: 0.4 },
    primaryText: { color: c.onBright, fontSize: 16, fontWeight: '800' },
    block: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
    },
    blockText: { color: c.skip, fontSize: 15, fontWeight: '700' },
    doneBox: { alignItems: 'center', paddingTop: 12 },
    doneIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.like,
      alignItems: 'center',
      justifyContent: 'center',
    },
    doneTitle: {
      color: c.text,
      fontSize: 21,
      fontWeight: '900',
      letterSpacing: -0.3,
      marginTop: 16,
      textAlign: 'center',
    },
    doneText: {
      color: c.textDim,
      fontSize: 14,
      lineHeight: 21,
      marginTop: 8,
      textAlign: 'center',
    },
  });
