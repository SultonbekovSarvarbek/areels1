import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Palette } from '../theme';
import { useColors } from '../ThemeContext';
import { useT } from '../I18nContext';

export type TabKey = 'deck' | 'likes' | 'profile';

interface Props {
  active: TabKey;
  likesCount: number;
  onChange: (tab: TabKey) => void;
}

const TABS: {
  key: TabKey;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: 'tabDeck' | 'tabLikes' | 'tabProfile';
}[] = [
  { key: 'deck', icon: 'albums', label: 'tabDeck' },
  { key: 'likes', icon: 'heart', label: 'tabLikes' },
  { key: 'profile', icon: 'person', label: 'tabProfile' },
];

export function TabBar({ active, likesCount, onChange }: Props) {
  const t = useT();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable key={tab.key} style={styles.tab} onPress={() => onChange(tab.key)}>
            <View>
              <Ionicons
                name={tab.icon}
                size={22}
                color={isActive ? c.text : c.textFaint}
              />
              {tab.key === 'likes' && likesCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{likesCount}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>{t[tab.label]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: c.border,
      backgroundColor: c.bgElevated,
      paddingTop: 10,
    },
    tab: { flex: 1, alignItems: 'center', gap: 3 },
    label: { color: c.textFaint, fontSize: 11, fontWeight: '700' },
    labelActive: { color: c.text },
    badge: {
      position: 'absolute',
      top: -4,
      right: -10,
      minWidth: 17,
      height: 17,
      borderRadius: 9,
      paddingHorizontal: 4,
      backgroundColor: c.like,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: { color: c.bg, fontSize: 10, fontWeight: '900' },
  });
