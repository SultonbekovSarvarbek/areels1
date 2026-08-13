import { Car, Filters } from '../types';

export function matchesFilters(car: Car, f: Filters): boolean {
  if (f.brands.length && !f.brands.includes(car.brand)) return false;
  if (f.bodyTypes.length && !f.bodyTypes.includes(car.bodyType)) return false;
  if (f.transmissions.length && !f.transmissions.includes(car.transmission)) return false;
  if (f.maxPrice !== null && car.price > f.maxPrice) return false;
  if (f.minYear !== null && car.year < f.minYear) return false;
  return true;
}

export function countActiveFilters(f: Filters): number {
  return (
    f.brands.length +
    f.bodyTypes.length +
    f.transmissions.length +
    (f.maxPrice !== null ? 1 : 0) +
    (f.minYear !== null ? 1 : 0)
  );
}
