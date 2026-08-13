import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { Car, Offer } from '../types';
import { Palette, fixed, radius } from '../theme';
import { useColors } from '../ThemeContext';
import { useT } from '../I18nContext';
import { Dict } from '../i18n';
import { formatEngine, formatMileage, formatPhone, formatPrice } from '../utils/format';
import { PhotoProgress } from '../components/PhotoProgress';

const HERO_H = 340;

/**
 * На симуляторе нет звонилки, Telegram может быть не установлен — в обоих
 * случаях openURL отклоняется, и молчать тут нельзя: юзер жмёт и ничего не
 * происходит. Для t.me промаха быть не может, ссылку подхватит браузер.
 */
const openLink = (url: string, t: Dict) => {
  Linking.openURL(url).catch(() => {
    Alert.alert(t.openFailTitle, t.openFailText);
  });
};

/**
 * Пока нет бэкенда и публичных ссылок на объявления, шарим текстом. Когда
 * появится веб-версия, сюда добавится url объявления и текст можно ужать.
 */
const shareCar = (car: Car, t: Dict) => {
  const lines = [
    `${car.brand} ${car.model}, ${car.year}`,
    `${formatPrice(car.price)} · ${formatMileage(car.mileage)} · ${car.city}`,
    '',
    `${car.seller.name}: ${formatPhone(car.seller.phone)}`,
  ];
  if (car.seller.telegram) lines.push(`https://t.me/${car.seller.telegram}`);

  // Отмена шторки резолвится с dismissedAction, в catch попадают только сбои.
  Share.share({ message: lines.join('\n') }).catch(() => {
    Alert.alert(t.shareFailTitle, t.shareFailText);
  });
};

interface Props {
  car: Car | null;
  /** Предложение по этой машине, если уже отправлено. */
  offer?: Offer;
  onOfferPress: (car: Car) => void;
  isLiked: boolean;
  onToggleLike: (car: Car) => void;
  onClose: () => void;
  /**
   * Шторки, которые должны открываться поверх карточки. iOS показывает модалку
   * из контроллера того места, где она смонтирована, поэтому соседние с карточкой
   * модалки не появляются — их нужно монтировать внутрь этой.
   */
  children?: React.ReactNode;
}

function Spec({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  const c = useColors();
  const t = useT();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.spec}>
      <Ionicons name={icon} size={16} color={c.textFaint} />
      <View>
        <Text style={styles.specLabel}>{label}</Text>
        <Text style={styles.specValue}>{value}</Text>
      </View>
    </View>
  );
}

export function CarDetailScreen({
  car,
  offer,
  isLiked,
  onOfferPress,
  onToggleLike,
  onClose,
  children,
}: Props) {
  const c = useColors();
  const t = useT();
  const styles = useMemo(() => makeStyles(c), [c]);

  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [photo, setPhoto] = useState(0);
  const gallery = useRef<ScrollView>(null);

  // Модалка не размонтируется между машинами — сбрасываем галерею руками.
  useEffect(() => {
    setPhoto(0);
    gallery.current?.scrollTo({ x: 0, animated: false });
  }, [car?.id]);

  useEffect(() => {
    if (car) Image.prefetch(car.photos, 'memory-disk');
  }, [car]);

  const onGalleryScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPhoto(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <Modal visible={!!car} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        {car && (
          <>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
              <View style={styles.hero}>
                <ScrollView
                  ref={gallery}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={onGalleryScroll}
                  style={StyleSheet.absoluteFill}
                >
                  {car.photos.map((uri) => (
                    <Image
                      key={uri}
                      source={{ uri }}
                      style={[styles.heroPhoto, { width }]}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  ))}
                </ScrollView>
                <LinearGradient
                  colors={[fixed.scrimHero, 'transparent']}
                  style={styles.heroTop}
                  pointerEvents="none"
                />
                <LinearGradient
                  colors={['transparent', c.bg]}
                  style={styles.heroBottom}
                  pointerEvents="none"
                />
                <View
                  style={[styles.heroOverlay, { paddingTop: Math.max(insets.top, 12) + 12 }]}
                  pointerEvents="box-none"
                >
                  {car.photos.length > 1 && (
                    <View style={styles.heroProgress}>
                      <PhotoProgress count={car.photos.length} index={photo} />
                    </View>
                  )}
                  <View style={styles.heroBar}>
                    <Pressable style={styles.roundBtn} onPress={onClose} hitSlop={12}>
                      <Ionicons name="chevron-down" size={22} color={fixed.onPhoto} />
                    </Pressable>
                    <View style={styles.heroActions}>
                      <Pressable
                        style={styles.roundBtn}
                        onPress={() => shareCar(car, t)}
                        hitSlop={12}
                        accessibilityLabel={t.shareLabel}
                      >
                        <Ionicons name="share-outline" size={21} color={fixed.onPhoto} />
                      </Pressable>
                      <Pressable
                        style={styles.roundBtn}
                        onPress={() => onToggleLike(car)}
                        hitSlop={12}
                        accessibilityLabel={isLiked ? t.favRemove : t.favAdd}
                      >
                        <Ionicons
                          name={isLiked ? 'heart' : 'heart-outline'}
                          size={22}
                          color={isLiked ? c.like : fixed.onPhoto}
                        />
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.body}>
                <Text style={styles.price}>{formatPrice(car.price)}</Text>
                <Text style={styles.name}>
                  {car.brand} {car.model}, {car.year}
                </Text>
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={15} color={c.textDim} />
                  <Text style={styles.location}>{t.city[car.city]}</Text>
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.offerBtn,
                    offer && styles.offerBtnDone,
                    pressed && styles.contactPressed,
                  ]}
                  onPress={() => onOfferPress(car)}
                >
                  <Ionicons
                    name={offer ? 'checkmark-circle' : 'pricetag-outline'}
                    size={18}
                    color={offer ? c.like : c.text}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.offerText}>
                      {offer ? t.offerMadeFor(formatPrice(offer.price)) : t.offerMake}
                    </Text>
                    {offer && <Text style={styles.offerHint}>{t.offerTapToChange}</Text>}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={c.textFaint} />
                </Pressable>

                <View style={styles.tags}>
                  {car.tags.map((tag) => (
                    <View key={tag} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.sectionTitle}>{t.specs}</Text>
                <View style={styles.specs}>
                  <Spec icon="speedometer-outline" label={t.sMileage} value={formatMileage(car.mileage, t.unitKm)} />
                  <Spec
                    icon="flash-outline"
                    label={t.sEngine}
                    value={formatEngine(car.engine, car.power, t.unitL, t.unitHp)}
                  />
                  <Spec icon="git-compare-outline" label={t.sTransmission} value={t.transmission[car.transmission]} />
                  <Spec icon="car-sport-outline" label={t.sDrive} value={t.drive[car.drive]} />
                  <Spec icon="water-outline" label={t.sFuel} value={t.fuel[car.fuel]} />
                  <Spec icon="cube-outline" label={t.sBody} value={t.bodyType[car.bodyType]} />
                  <Spec icon="color-palette-outline" label={t.sColor} value={car.color} />
                  <Spec
                    icon="shield-checkmark-outline"
                    label={t.sCondition}
                    value={t.condition[car.condition]}
                  />
                  {/* Владельцев нет у объявлений, заведённых до появления поля. */}
                  {car.owners !== undefined && (
                    <Spec icon="people-outline" label={t.sOwners} value={String(car.owners)} />
                  )}
                  <Spec icon="calendar-outline" label={t.sYear} value={String(car.year)} />
                </View>

                <Text style={styles.sectionTitle}>{t.description}</Text>
                <Text style={styles.description}>{car.description}</Text>

                <Text style={styles.sectionTitle}>{t.seller}</Text>
                <View style={styles.seller}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{car.seller.name.slice(0, 1)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sellerName}>{car.seller.name}</Text>
                    <Text style={styles.sellerMeta}>{t.sellerType[car.seller.type]}</Text>
                  </View>
                </View>

                <Pressable
                  style={({ pressed }) => [styles.contact, pressed && styles.contactPressed]}
                  onPress={() => openLink(`tel:${car.seller.phone}`, t)}
                >
                  <Ionicons name="call-outline" size={18} color={c.textDim} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contactLabel}>{t.phone}</Text>
                    <Text style={styles.contactValue}>{formatPhone(car.seller.phone)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={c.textFaint} />
                </Pressable>

                {car.seller.telegram && (
                  <Pressable
                    style={({ pressed }) => [styles.contact, pressed && styles.contactPressed]}
                    onPress={() => openLink(`https://t.me/${car.seller.telegram}`, t)}
                  >
                    <Ionicons name="paper-plane-outline" size={18} color={c.tg} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.contactLabel}>Telegram</Text>
                      <Text style={styles.contactValue}>@{car.seller.telegram}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={c.textFaint} />
                  </Pressable>
                )}
              </View>
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
              <Pressable
                style={styles.callBtn}
                onPress={() => openLink(`tel:${car.seller.phone}`, t)}
              >
                <Ionicons name="call" size={18} color={fixed.onBright} />
                <Text style={styles.callText} numberOfLines={1}>
                  {formatPhone(car.seller.phone)}
                </Text>
              </Pressable>

              {car.seller.telegram && (
                <Pressable
                  style={styles.tgBtn}
                  onPress={() => openLink(`https://t.me/${car.seller.telegram}`, t)}
                  accessibilityLabel="Написать в Telegram"
                >
                  <Ionicons name="paper-plane" size={20} color={c.tg} />
                </Pressable>
              )}

              <Pressable
                style={styles.iconBtn}
                onPress={() => onToggleLike(car)}
                accessibilityLabel={isLiked ? t.favRemove : t.favAdd}
              >
                <Ionicons
                  name={isLiked ? 'heart' : 'heart-outline'}
                  size={20}
                  color={isLiked ? c.like : c.text}
                />
              </Pressable>
            </View>
          </>
        )}
      </View>
      {children}
    </Modal>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    scroll: { paddingBottom: 24 },
    hero: { height: HERO_H },
    heroPhoto: { height: HERO_H },
    heroTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 130 },
    heroBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 120 },
    heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
    heroProgress: { paddingHorizontal: 16, paddingBottom: 12 },
    heroBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
    },
    heroActions: { flexDirection: 'row', gap: 10 },
    roundBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: fixed.glass,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { paddingHorizontal: 20, marginTop: -18, gap: 6 },
    price: { color: c.text, fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
    name: { color: c.text, fontSize: 19, fontWeight: '600' },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    offerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 14,
      backgroundColor: c.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    offerBtnDone: { borderColor: c.like },
    offerText: { color: c.text, fontSize: 15, fontWeight: '700' },
    offerHint: { color: c.textFaint, fontSize: 12, marginTop: 2 },
    location: { color: c.textDim, fontSize: 14 },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    tag: {
      backgroundColor: c.card,
      borderRadius: radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderWidth: 1,
      borderColor: c.border,
    },
    tagText: { color: c.textDim, fontSize: 12, fontWeight: '600' },
    sectionTitle: {
      color: c.text,
      fontSize: 17,
      fontWeight: '800',
      marginTop: 26,
      marginBottom: 6,
    },
    specs: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
    spec: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 10 },
    specLabel: { color: c.textFaint, fontSize: 11, textTransform: 'uppercase', fontWeight: '700' },
    specValue: { color: c.text, fontSize: 15, fontWeight: '600' },
    description: { color: c.textDim, fontSize: 15, lineHeight: 22 },
    seller: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.bgElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: c.text, fontSize: 18, fontWeight: '800' },
    sellerName: { color: c.text, fontSize: 15, fontWeight: '700' },
    sellerMeta: { color: c.textDim, fontSize: 12, marginTop: 2 },
    footer: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 20,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.border,
      backgroundColor: c.bgElevated,
    },
    callBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: c.like,
      borderRadius: radius.pill,
      paddingVertical: 15,
    },
    callText: { color: fixed.onBright, fontSize: 15, fontWeight: '800' },
    iconBtn: {
      width: 52,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: c.border,
    },
    tgBtn: {
      width: 52,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: c.tg,
      backgroundColor: fixed.tgSoft,
    },
    contact: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 8,
      backgroundColor: c.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    contactPressed: { opacity: 0.7 },
    contactLabel: { color: c.textFaint, fontSize: 11, textTransform: 'uppercase', fontWeight: '700' },
    contactValue: { color: c.text, fontSize: 15, fontWeight: '700', marginTop: 2 },
  });
