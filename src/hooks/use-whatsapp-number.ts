import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const FALLBACK = '5581999999999';

export function useWhatsAppNumber() {
  const [number, setNumber] = useState<string>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('store_settings' as never)
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
