const group = (n: number) => n.toLocaleString('ru-RU').replace(/ /g, ' ');

export const formatPrice = (usd: number) => `$${group(usd)}`;

export const formatPriceShort = (usd: number) =>
  usd >= 1_000_000
    ? `$${(usd / 1_000_000).toFixed(usd % 1_000_000 === 0 ? 0 : 1)} млн`
    : `$${group(usd)}`;

export const formatMileage = (km: number, unit = 'км') => `${group(km)} ${unit}`;

/** Мощность знают не все продавцы — без неё показываем только объём. */
export const formatEngine = (liters: number, power: number | undefined, l = 'л', hp = 'л.с.') =>
  power === undefined ? `${liters.toFixed(1)} ${l}` : `${liters.toFixed(1)} ${l} · ${power} ${hp}`;

/** +998901234567 → +998 90 123-45-67. Неузнаваемый формат возвращаем как есть. */
export const formatPhone = (phone: string) => {
  const m = phone.match(/^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/);
  return m ? `+998 ${m[1]} ${m[2]}-${m[3]}-${m[4]}` : phone;
};
