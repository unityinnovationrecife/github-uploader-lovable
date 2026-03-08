import { useEffect, useState } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { useStoreHours, getStoreStatusFromHours, StoreHour } from '@/hooks/use-store-settings';

function getNextOpenTime(hours: StoreHour[]): { label: string; msUntil: number } | null {
  const now = new Date();
  const day = now.getDay();
  const time = now.getHours() + now.getMinutes() / 60;
  const isWeekend = day === 0 || day === 6;
  const dayType = isWeekend ? 'weekend' : 'weekday';
  const oppType = isWeekend ? 'weekday' : 'weekend';

  const todayConfig = hours.find(h => h.day_type === dayType && h.active);
  const otherConfig = hours.find(h => h.day_type === oppType && h.active);

  // Determine opening time candidates
  const candidates: { label: string; date: Date }[] = [];

  if (todayConfig) {
    const openToday = new Date();
    openToday.setHours(todayConfig.open_hour, todayConfig.open_minute, 0, 0);
    if (openToday > now) {
      candidates.push({ label: todayConfig.label, date: openToday });
    }
  }

  if (otherConfig) {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    next.setHours(otherConfig.open_hour, otherConfig.open_minute, 0, 0);
    candidates.push({ label: otherConfig.label, date: next });
  }

  if (candidates.length === 0) {
    // Fallback: use static times
    const fallback = new Date();
    if (isWeekend) {
      fallback.setHours(17, 0, 0, 0);
    } else {
      fallback.setHours(19, 0, 0, 0);
    }
    if (fallback > now) {
      return {
        label: isWeekend ? 'Sáb e Dom' : 'Seg a Sex',
        msUntil: fallback.getTime() - now.getTime(),
      };
    }
    // try tomorrow
    fallback.setDate(fallback.getDate() + 1);
    fallback.setHours(isWeekend ? 19 : 17, 0, 0, 0);
    return {
      label: isWeekend ? 'Seg a Sex' : 'Sáb e Dom',
      msUntil: fallback.getTime() - now.getTime(),
    };
  }

  const soonest = candidates.reduce((a, b) => a.date < b.date ? a : b);
  return { label: soonest.label, msUntil: soonest.date.getTime() - now.getTime() };
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0m';
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export default function ClosedStoreBanner() {
  const { hours } = useStoreHours();
  const [status, setStatus] = useState(getStoreStatusFromHours([]));
  const [countdown, setCountdown] = useState('');
  const [nextLabel, setNextLabel] = useState('');

  useEffect(() => {
    function update() {
      const s = getStoreStatusFromHours(hours);
      setStatus(s);
      if (!s.isOpen) {
        const next = getNextOpenTime(hours);
        if (next) {
          setCountdown(formatCountdown(next.msUntil));
          setNextLabel(next.label);
        }
      }
    }
    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, [hours]);

  if (status.isOpen) return null;

  return (
    <div className="w-full bg-[var(--bg-secondary)] border-b border-[var(--border-color)] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl bg-red-500/8 border border-red-500/20 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="font-bold text-[var(--text-primary)] text-sm sm:text-base">
                🔒 Loja fechada no momento
              </p>
              <p className="text-xs sm:text-sm text-[var(--text-muted)]">
                Você pode montar o carrinho, mas o pedido só poderá ser finalizado quando abrirmos.
              </p>
            </div>
          </div>

          {countdown && (
            <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
              <Clock className="w-4 h-4 text-orange-500" />
              <div className="text-center">
                <p className="text-lg font-black text-[var(--text-primary)] leading-none">{countdown}</p>
                <p className="text-[10px] text-[var(--text-muted)]">para abrir</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
