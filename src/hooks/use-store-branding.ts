import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_NAME = 'G & S Salgados';
const DEFAULT_SLOGAN = 'O melhor sabor da cidade';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export function useStoreBranding() {
  const [storeName, setStoreName] = useState(DEFAULT_NAME);
  const [storeSlogan, setStoreSlogan] = useState(DEFAULT_SLOGAN);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.from('store_settings')
      .select('key, value')
      .in('key', ['store_name', 'store_slogan'])
      .then(({ data }: { data: { key: string; value: string }[] | null }) => {
        if (data) {
          const name = data.find((r: { key: string }) => r.key === 'store_name');
          const slogan = data.find((r: { key: string }) => r.key === 'store_slogan');
          if (name?.value) setStoreName(name.value);
          if (slogan?.value) setStoreSlogan(slogan.value);
        }
        setLoading(false);
      });
  }, []);

  return { storeName, storeSlogan, loading };
}
