import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_NUMBER = '5581999999999';
const DEFAULT_MESSAGE = 'Olá! Vim pelo cardápio online e gostaria de mais informações.';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export function useWhatsAppSettings() {
  const [number, setNumber] = useState(DEFAULT_NUMBER);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.from('store_settings')
      .select('key, value')
      .in('key', ['whatsapp_number', 'whatsapp_message'])
      .then(({ data }: { data: { key: string; value: string }[] | null }) => {
        if (data) {
          const num = data.find((r: { key: string }) => r.key === 'whatsapp_number');
          const msg = data.find((r: { key: string }) => r.key === 'whatsapp_message');
          if (num?.value) setNumber(num.value);
          if (msg?.value) setMessage(msg.value);
        }
        setLoading(false);
      });
  }, []);

  return { number, message, loading };
}

// Keep backward compat alias
export function useWhatsAppNumber() {
  const { number, loading } = useWhatsAppSettings();
  return { number, loading };
}
