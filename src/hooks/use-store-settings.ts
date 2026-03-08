import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DeliveryZone {
  id: string;
  key: string;
  name: string;
  fee: number;
  display_order: number;
  active: boolean;
}

export interface StoreHour {
  id: string;
  day_type: string;
  label: string;
  open_hour: number;
  open_minute: number;
  close_hour: number;
  close_minute: number;
  active: boolean;
}

export function useDeliveryZones() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('delivery_zones')
      .select('*')
      .eq('active', true)
      .order('display_order')
      .then(({ data }) => {
        if (data) setZones(data as DeliveryZone[]);
        setLoading(false);
      });
  }, []);

  return { zones, loading };
}

export function useStoreHours() {
  const [hours, setHours] = useState<StoreHour[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('store_hours')
      .select('*')
      .order('day_type')
      .then(({ data }) => {
        if (data) setHours(data as StoreHour[]);
        setLoading(false);
      });
  }, []);

  return { hours, loading };
}

export function getStoreStatusFromHours(hours: StoreHour[]) {
  const now = new Date();
  const day = now.getDay();
  const time = now.getHours() + now.getMinutes() / 60;

  const isWeekend = day === 0 || day === 6;
  const dayType = isWeekend ? 'weekend' : 'weekday';

  const config = hours.find(h => h.day_type === dayType && h.active);

  if (!config) {
    // fallback defaults
    if (isWeekend) {
      const open = time >= 17;
      return { isOpen: open, closingSoon: time >= 23, hours: 'Sáb e Dom: 17h às 00h' };
    } else {
      const open = time >= 19 && time < 23;
      return { isOpen: open, closingSoon: time >= 22.5, hours: 'Seg a Sex: 19h às 23h' };
    }
  }

  const openTime = config.open_hour + config.open_minute / 60;
  const closeTime = config.close_hour + config.close_minute / 60;

  // handle midnight (00:00 = 0) meaning next day close
  const effectiveClose = closeTime === 0 ? 24 : closeTime;

  const isOpen = time >= openTime && time < effectiveClose;
  const closingSoon = time >= effectiveClose - 0.5;

  const openStr = `${String(config.open_hour).padStart(2, '0')}h`;
  const closeStr = config.close_hour === 0 && config.close_minute === 0
    ? '00h'
    : `${String(config.close_hour).padStart(2, '0')}h`;
  const hoursStr = `${config.label}: ${openStr} às ${closeStr}`;

  return { isOpen, closingSoon, hours: hoursStr };
}
