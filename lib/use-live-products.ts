import { useEffect, useState } from 'react';

import { products as seed } from '@/data/mock';
import { EMPTY_LIVE_CATALOG, fetchLiveCatalog, overlayCatalog } from '@/lib/live-catalog';
import type { Product } from '@/data/types';

export function useLiveProducts(): Product[] {
  const [list, setList] = useState<Product[]>(() => overlayCatalog(seed, EMPTY_LIVE_CATALOG));

  useEffect(() => {
    let on = true;
    const pull = async () => {
      try {
        const file = await fetchLiveCatalog();
        if (on) setList(overlayCatalog(seed, file));
      } catch {
        if (on) setList(overlayCatalog(seed, EMPTY_LIVE_CATALOG));
      }
    };
    pull();
    const t = setInterval(pull, 8000);
    return () => {
      on = false;
      clearInterval(t);
    };
  }, []);

  return list;
}

