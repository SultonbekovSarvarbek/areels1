export interface Palette {
  bg: string;
  bgElevated: string;
  card: string;
  border: string;
  text: string;
  textDim: string;
  textFaint: string;
  like: string;
  skip: string;
  accent: string;
  /**
   * Текст и иконки на заливке like/accent. В палитре, а не в fixed: светлая тема
   * затемняет сами заливки, и чёрная надпись на тёмно-зелёном перестаёт читаться.
   */
  onBright: string;
  tg: string;
  overlay: string;
}

/**
 * Часть цветов лежит поверх фотографий и от темы не зависит: скримы, стеклянные
 * плашки на карточке, текст на ярких кнопках. Фото остаётся фото при любой теме,
 * и если перекрасить их вместе с интерфейсом — надписи станут нечитаемыми.
 */
export const fixed = {
  scrimTop: 'rgba(8,10,15,0.75)',
  scrimHero: 'rgba(11,13,18,0.8)',
  cardBottom: ['transparent', 'rgba(6,8,12,0.6)', 'rgba(6,8,12,0.97)'] as const,
  /** Плашки поверх фото: бейджи, чипы, круглые кнопки в шапке галереи. */
  glass: 'rgba(11,13,18,0.65)',
  glassSoft: 'rgba(255,255,255,0.10)',
  glassPressed: 'rgba(255,255,255,0.12)',
  glassBorder: 'rgba(255,255,255,0.15)',
  glassBorderStrong: 'rgba(255,255,255,0.25)',
  segment: 'rgba(255,255,255,0.3)',
  onPhoto: '#F2F5FA',
  onPhotoDim: 'rgba(242,245,250,0.72)',
  /** Подложка кнопки Telegram — мягкий синий, читается на обеих темах. */
  tgSoft: 'rgba(34,158,217,0.14)',
  /** Чип электромобиля на карточке: зелёный поверх фото, без оглядки на тему. */
  ecoChip: 'rgba(43,217,124,0.22)',
  ecoBorder: 'rgba(43,217,124,0.55)',
  ecoText: '#5BE8A0',
};

const dark: Palette = {
  bg: '#0B0D12',
  bgElevated: '#151922',
  card: '#1B202B',
  border: '#262C3A',
  text: '#F2F5FA',
  textDim: '#98A1B3',
  textFaint: '#5E6779',
  like: '#2BD97C',
  skip: '#8A94A8',
  accent: '#FFB020',
  // Заливки тут светлые сами по себе, поэтому надпись на них тёмная.
  onBright: '#0B0D12',
  tg: '#229ED9',
  overlay: 'rgba(6,8,12,0.86)',
};

const light: Palette = {
  bg: '#F4F6FA',
  bgElevated: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E1E6EF',
  text: '#0E1420',
  textDim: '#5A6478',
  textFaint: '#98A1B3',
  // Зелёный и янтарный затемнены: исходные на белом фоне не проходят по контрасту.
  like: '#10A557',
  skip: '#6E7A90',
  accent: '#C97A00',
  onBright: '#FFFFFF',
  tg: '#1B8FC7',
  overlay: 'rgba(12,16,24,0.45)',
};

export const palettes = { dark, light };

export type ThemeName = keyof typeof palettes;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 28,
  pill: 999,
};

export const spacing = (n: number) => n * 4;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
  },
  button: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
};
