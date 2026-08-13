import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { fetchCars } from './api/client';
import { Car } from './types';

interface CatalogValue {
  cars: Car[];
  /** Список брендов для фильтров — раньше выводился на уровне модуля из заглушки. */
  brands: string[];
  loading: boolean;
  /** Текст последней ошибки загрузки; null, если каталог получен. */
  error: string | null;
  reload: () => void;
}

const CatalogContext = createContext<CatalogValue | null>(null);

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCars(await fetchCars());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const brands = useMemo(
    () => Array.from(new Set(cars.map((car) => car.brand))).sort(),
    [cars],
  );

  const value = useMemo(
    () => ({ cars, brands, loading, error, reload: () => void load() }),
    [cars, brands, loading, error, load],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogValue {
  const value = useContext(CatalogContext);
  if (!value) throw new Error('useCatalog вызван вне CatalogProvider');
  return value;
}
