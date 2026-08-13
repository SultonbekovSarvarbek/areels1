import { useMemo } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { Car, Offer, User } from '../types';
import { Palette, fixed, radius } from '../theme';
import { useColors } from '../ThemeContext';
import { useI18n } from '../I18nContext';
import { Dict, LANGS } from '../i18n';
import { formatPhone, formatPrice } from '../utils/format';

interface Props {
  user: User | null;
  offers: Offer[];
  carById: (id: string) => Car | undefined;
  likedCount: number;
  onSignIn: () => void;
  onSignOut: () => void;
  onOpenCar: (car: Car) => void;
}

function OfferRow({
  offer,
  car,
  styles,
  c,
  t,
  onOpen,
}: {
  offer: Offer;
  car: Car;
  styles: ReturnType<typeof makeStyles>;
  c: Palette;
  t: Dict;
  onOpen: (car: Car) => void;
}) {
  const diff = offer.price - car.price;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
      onPress={() => onOpen(car)}
    >
      <Image source={{ uri: car.photos[0] }} style={styles.thumb} contentFit="cover" />
      <View style={styles.rowBody}>
        <Text style={styles.rowName} numberOfLines={1}>
          {car.brand} {car.model}, {car.year}
        </Text>
        <Text style={styles.rowOffer}>{formatPrice(offer.price)}</Text>
        <Text style={styles.rowMeta}>
          {diff < 0 ? t.belowAsking(formatPrice(-diff)) : t.noBargain}
        </Text>
      </View>
      <View style={styles.status}>
        <Ionicons name="paper-plane-outline" size={13} color={c.textDim} />
        <Text style={styles.statusText}>{t.sent}</Text>
      </View>
    </Pressable>
  );
}

export function ProfileScreen({
  user,
  offers,
  carById,
  likedCount,
  onSignIn,
  onSignOut,
  onOpenCar,
}: Props) {
  const c = useColors();
  const { t, lang, setLang } = useI18n();
  const styles = useMemo(() => makeStyles(c), [c]);

  const confirmSignOut = () =>
    Alert.alert(t.signOutTitle, t.signOutText, [
      { text: t.cancel, style: 'cancel' },
      { text: t.signOut, style: 'destructive', onPress: onSignOut },
    ]);

  if (!user) {
    return (
      <View style={styles.root}>
        <Text style={styles.title}>{t.profile}</Text>
        <View style={styles.guest}>
          <Ionicons name="person-circle-outline" size={64} color={c.textFaint} />
          <Text style={styles.guestTitle}>{t.notSignedIn}</Text>
          <Text style={styles.guestText}>
            {t.signInPrompt}
          </Text>
          <Pressable style={styles.primary} onPress={onSignIn}>
            <Text style={styles.primaryText}>{t.signInByPhone}</Text>
          </Pressable>
        </View>
        <View style={[styles.langBlock, styles.langBlockGuest]}>
          <Text style={styles.section}>{t.language}</Text>
          <View style={styles.langRow}>
            {LANGS.map((l) => (
              <Pressable
                key={l.id}
                style={[styles.lang, lang === l.id && styles.langActive]}
                onPress={() => setLang(l.id)}
              >
                <Text style={[styles.langText, lang === l.id && styles.langTextActive]}>
                  {l.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    );
  }

  // Объявление могло исчезнуть из каталога — такие предложения не показываем.
  const rows = offers
    .map((offer) => ({ offer, car: carById(offer.carId) }))
    .filter((r): r is { offer: Offer; car: Car } => !!r.car);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>{t.profile}</Text>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.offer.id}
        renderItem={({ item }) => (
          <OfferRow offer={item.offer} car={item.car} styles={styles} c={c} t={t} onOpen={onOpenCar} />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user.name.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{user.name}</Text>
                <Text style={styles.phone}>{formatPhone(user.phone)}</Text>
              </View>
            </View>

            <View style={styles.stats}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{likedCount}</Text>
                <Text style={styles.statLabel}>{t.statFavourites}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{rows.length}</Text>
                <Text style={styles.statLabel}>{t.statOffers}</Text>
              </View>
            </View>

            <Text style={styles.section}>{t.myOffers}</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="pricetag-outline" size={44} color={c.textFaint} />
            <Text style={styles.emptyText}>
              {t.offersEmpty}
            </Text>
          </View>
        }
        ListFooterComponent={
          <>
            <View style={styles.langBlock}>
              <Text style={styles.section}>{t.language}</Text>
              <View style={styles.langRow}>
                {LANGS.map((l) => (
                  <Pressable
                    key={l.id}
                    style={[styles.lang, lang === l.id && styles.langActive]}
                    onPress={() => setLang(l.id)}
                  >
                    <Text style={[styles.langText, lang === l.id && styles.langTextActive]}>
                      {l.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <Pressable style={styles.signOut} onPress={confirmSignOut}>
              <Ionicons name="log-out-outline" size={18} color={c.textDim} />
              <Text style={styles.signOutText}>{t.signOut}</Text>
            </Pressable>
          </>
        }
      />
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    root: { flex: 1 },
    title: {
      color: c.text,
      fontSize: 28,
      fontWeight: '900',
      paddingHorizontal: 20,
      paddingBottom: 14,
      letterSpacing: -0.5,
    },
    guest: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
    guestTitle: { color: c.text, fontSize: 18, fontWeight: '800' },
    guestText: { color: c.textDim, fontSize: 14, textAlign: 'center', lineHeight: 20 },
    primary: {
      marginTop: 14,
      backgroundColor: c.like,
      borderRadius: radius.pill,
      paddingHorizontal: 26,
      paddingVertical: 14,
    },
    primaryText: { color: fixed.onBright, fontSize: 15, fontWeight: '800' },
    list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: c.bgElevated,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: c.like,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: fixed.onBright, fontSize: 22, fontWeight: '900' },
    name: { color: c.text, fontSize: 18, fontWeight: '800' },
    phone: { color: c.textDim, fontSize: 14, marginTop: 2 },
    stats: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
      backgroundColor: c.bgElevated,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 14,
    },
    stat: { flex: 1, alignItems: 'center', gap: 2 },
    statDivider: { width: 1, height: 28, backgroundColor: c.border },
    statValue: { color: c.text, fontSize: 20, fontWeight: '900' },
    statLabel: { color: c.textFaint, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    section: {
      color: c.textDim,
      fontSize: 13,
      fontWeight: '700',
      textTransform: 'uppercase',
      marginTop: 22,
      marginBottom: 4,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.bgElevated,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      padding: 10,
    },
    thumb: { width: 84, height: 64, borderRadius: radius.sm, backgroundColor: c.card },
    rowBody: { flex: 1, gap: 1 },
    rowName: { color: c.textDim, fontSize: 13, fontWeight: '600' },
    rowOffer: { color: c.text, fontSize: 18, fontWeight: '800' },
    rowMeta: { color: c.textFaint, fontSize: 12 },
    status: { alignItems: 'center', gap: 3 },
    statusText: { color: c.textDim, fontSize: 10, fontWeight: '700' },
    empty: { alignItems: 'center', gap: 10, paddingVertical: 30, paddingHorizontal: 24 },
    emptyText: { color: c.textDim, fontSize: 14, textAlign: 'center', lineHeight: 20 },
    signOut: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 24,
      paddingVertical: 14,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: c.border,
    },
    signOutText: { color: c.textDim, fontSize: 15, fontWeight: '700' },
    langBlock: { paddingHorizontal: 4 },
    // У гостя блок лежит вне FlatList, поэтому отступы списка ему нужно задать самому.
    langBlockGuest: { paddingHorizontal: 20, paddingBottom: 24 },
    langRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    lang: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 11,
      borderRadius: radius.pill,
      backgroundColor: c.bgElevated,
      borderWidth: 1,
      borderColor: c.border,
    },
    langActive: { backgroundColor: c.text, borderColor: c.text },
    langText: { color: c.textDim, fontSize: 13, fontWeight: '700' },
    langTextActive: { color: c.bg },
  });
