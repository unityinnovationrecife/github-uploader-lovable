import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const FALLBACK = '5581999999999';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export function useWhatsAppNumber() {
  const [number, setNumber] = useState<string>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.from('store_settings')
      .select('value')
      .eq('key', 'whatsapp_number')
      .maybeSingle()
      .then(({ data }: { data: { value: string } | null }) => {
        if (data?.value) setNumber(data.value);
        setLoading(false);
      });
  }, []);

  return { number, loading };
}
