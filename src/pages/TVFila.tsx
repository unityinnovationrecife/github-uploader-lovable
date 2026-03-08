import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/logo.png';

type Order = {
  id: string;
  customer_name: string;
  status: string;
  created_at: string;
};

const STATUS_LABELS: Record<string, { label: string; color: string; bgColor: string; pulse: boolean }> = {
  pending:          { label: 'Aguardando',      color: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)',  pulse: true  },
  confirmed:        { label: 'Confirmado',      color: '#3b82f6', bgColor: 'rgba(59,130,246,0.15)',  pulse: false },
  preparing:        { label: 'Preparando',      color: '#a855f7', bgColor: 'rgba(168,85,247,0.15)',  pulse: true  },
  out_for_delivery: { label: 'Saiu p/ entrega', color: '#f97316', bgColor: 'rgba(249,115,22,0.15)', pulse: true  },
  delivered:        { label: 'Entregue ✓',     color: '#22c55e', bgColor: 'rgba(34,197,94,0.15)',   pulse: false },
  cancelled:        { label: 'Cancelado',       color: '#ef4444', bgColor: 'rgba(239,68,68,0.15)',   pulse: false },
};

const ACTIVE_STATUSES = ['pending', 'confirmed', 'preparing', 'out_for_delivery'];

function shortId(id: string) {
  return id.replace(/-/g, '').slice(0, 6).toUpperCase();
}

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <span>
      {pad(time.getHours())}:{pad(time.getMinutes())}:{pad(time.getSeconds())}
    </span>
  );
}

/**
 * Plays a 3-note "ding ding dong" chime using Web Audio API.
 * Warm sine tones — pleasant for a restaurant TV display.
 */
function playNewOrderSound(ctx: AudioContext) {
  const now = ctx.currentTime;

  const playNote = (
    freq: number,
    startTime: number,
    duration: number,
    gainVal: number,
  ) => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    // Slight detuning for warmth
    const osc2  = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc.type  = 'sine';
    osc2.type = 'sine';
    osc.frequency.setValueAtTime(freq,        startTime);
    osc2.frequency.setValueAtTime(freq * 1.002, startTime); // tiny chorus

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(gainVal, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    gain2.gain.setValueAtTime(0, startTime);
    gain2.gain.linearRampToValueAtTime(gainVal * 0.4, startTime + 0.015);
    gain2.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);   gain.connect(ctx.destination);
    osc2.connect(gain2); gain2.connect(ctx.destination);

    osc.start(startTime);  osc.stop(startTime + duration);
    osc2.start(startTime); osc2.stop(startTime + duration);
  };

  // ding ding dong  (E5 → G5 → C5)
  playNote(659.25, now,        0.55, 0.38);
  playNote(783.99, now + 0.28, 0.55, 0.34);
  playNote(523.25, now + 0.56, 0.90, 0.42);
}

export default function TVFila() {
  const [orders, setOrders]               = useState<Order[]>([]);
  const [recentDelivered, setRecentDelivered] = useState<Order[]>([]);
  const [lastUpdate, setLastUpdate]       = useState(new Date());
  const [soundEnabled, setSoundEnabled]   = useState(true);
  const [newOrderFlash, setNewOrderFlash] = useState(false);
  // Set of order IDs currently animating as "new"
  const [animatingIds, setAnimatingIds]   = useState<Set<string>>(new Set());

  const audioCtxRef         = useRef<AudioContext | null>(null);
  const knownIdsRef         = useRef<Set<string>>(new Set());
  const initialLoadDoneRef  = useRef(false);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const triggerAlert = useCallback((newIds: string[]) => {
    // Sound
    if (soundEnabled) {
      try {
        const ctx = getAudioCtx();
        if (ctx.state === 'suspended') ctx.resume();
        playNewOrderSound(ctx);
      } catch (e) {
        console.warn('Audio error:', e);
      }
    }

    // Screen flash
    setNewOrderFlash(true);
    setTimeout(() => setNewOrderFlash(false), 900);

    // Mark cards as "new" for entrance animation — clear after 3 s
    setAnimatingIds(prev => {
      const next = new Set(prev);
      newIds.forEach(id => next.add(id));
      return next;
    });
    setTimeout(() => {
      setAnimatingIds(prev => {
        const next = new Set(prev);
        newIds.forEach(id => next.delete(id));
        return next;
      });
    }, 3000);
  }, [soundEnabled, getAudioCtx]);

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('id, customer_name, status, created_at')
      .eq('archived', false)
      .in('status', [...ACTIVE_STATUSES, 'delivered'])
      .order('created_at', { ascending: true });

    if (data) {
      const active = data
        .filter(o => ACTIVE_STATUSES.includes(o.status))
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      const delivered = data
        .filter(o => o.status === 'delivered')
        .slice(-6)
        .reverse();

      // Detect brand-new pending orders
      if (initialLoadDoneRef.current) {
        const freshIds = data
          .filter(o => o.status === 'pending' && !knownIdsRef.current.has(o.id))
          .map(o => o.id);
        if (freshIds.length > 0) triggerAlert(freshIds);
      }

      data.forEach(o => knownIdsRef.current.add(o.id));
      initialLoadDoneRef.current = true;

      setOrders(active);
      setRecentDelivered(delivered);
      setLastUpdate(new Date());
    }
  }, [triggerAlert]);

  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel('tv-fila-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders]);

  // Unlock AudioContext on first interaction
  useEffect(() => {
    const unlock = () => { getAudioCtx(); window.removeEventListener('click', unlock); };
    window.addEventListener('click', unlock);
    return () => window.removeEventListener('click', unlock);
  }, [getAudioCtx]);

  const getStatusInfo = (status: string) => STATUS_LABELS[status] ?? STATUS_LABELS['pending'];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: newOrderFlash
          ? 'linear-gradient(135deg, #1a1200 0%, #2a1a00 50%, #1a1200 100%)'
          : 'linear-gradient(135deg, #0a0a0f 0%, #18181b 50%, #0f0f14 100%)',
        fontFamily: "'Poppins', Arial, sans-serif",
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        transition: 'background 0.4s ease',
      }}
    >
      {/* Flash border overlay */}
      {newOrderFlash && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50, pointerEvents: 'none',
          border: '5px solid #f59e0b',
          animation: 'tv-flash 0.9s ease-out forwards',
        }} />
      )}

      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 40px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <img src={logo} alt="Logo" style={{ height: 56, objectFit: 'contain' }} />
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
              Fila de Pedidos
            </h1>
            <p style={{ fontSize: 13, color: '#a1a1aa', margin: 0 }}>Atualização em tempo real</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <button
            onClick={() => setSoundEnabled(v => !v)}
            title={soundEnabled ? 'Silenciar alertas' : 'Ativar alertas sonoros'}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', borderRadius: 999, cursor: 'pointer',
              background: soundEnabled ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${soundEnabled ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.12)'}`,
              color: soundEnabled ? '#f97316' : '#71717a',
              fontSize: 13, fontWeight: 600, transition: 'all 0.2s ease',
            }}
          >
            <span style={{ fontSize: 16 }}>{soundEnabled ? '🔔' : '🔕'}</span>
            <span>{soundEnabled ? 'Som ativo' : 'Sem som'}</span>
          </button>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 36, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#f97316' }}>
              <Clock />
            </div>
            <div style={{ fontSize: 12, color: '#71717a' }}>
              Últ. atualiz: {lastUpdate.toLocaleTimeString('pt-BR')}
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', gap: 0, overflow: 'hidden' }}>

        {/* Active orders list */}
        <div style={{ flex: 1, padding: '30px 40px', overflow: 'auto' }}>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
            {ACTIVE_STATUSES.map(s => {
              const info = getStatusInfo(s);
              return (
                <div key={s} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 14px', borderRadius: 999,
                  background: info.bgColor, border: `1px solid ${info.color}40`,
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: info.color, display: 'inline-block' }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: info.color }}>{info.label}</span>
                </div>
              );
            })}
          </div>

          {orders.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: 300, gap: 16, color: '#3f3f46',
            }}>
              <span style={{ fontSize: 64 }}>🍽️</span>
              <p style={{ fontSize: 22, fontWeight: 600 }}>Nenhum pedido em andamento</p>
              <p style={{ fontSize: 14 }}>Os pedidos aparecerão aqui automaticamente</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {orders.map((order, index) => {
                const info    = getStatusInfo(order.status);
                const isFirst = index === 0;
                const isNew   = animatingIds.has(order.id);

                return (
                  <div
                    key={order.id}
                    style={{
                      background: isNew
                        ? 'rgba(245,158,11,0.12)'
                        : isFirst
                          ? 'rgba(249,115,22,0.07)'
                          : 'rgba(255,255,255,0.04)',
                      border: `2px solid ${
                        isNew   ? '#f59e0b' :
                        isFirst ? '#f97316' :
                        info.color
                      }${isNew ? 'cc' : isFirst ? '80' : '40'}`,
                      borderRadius: 18,
                      padding: '20px 24px',
                      position: 'relative',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 20,
                      transition: 'border-color 0.6s ease, background 0.6s ease, box-shadow 0.6s ease',
                      boxShadow: isNew
                        ? '0 0 28px rgba(245,158,11,0.35), 0 0 60px rgba(245,158,11,0.12)'
                        : 'none',
                      animation: isNew ? 'tv-slide-in 0.5s cubic-bezier(0.16,1,0.3,1) both' : undefined,
                    }}
                  >
                    {/* Glow left bar */}
                    <div style={{
                      position: 'absolute', top: 0, left: 0, bottom: 0, width: 3,
                      background: `linear-gradient(180deg, transparent, ${isNew ? '#f59e0b' : info.color}, transparent)`,
                      transition: 'background 0.6s ease',
                    }} />

                    {/* "NOVO" badge for incoming orders */}
                    {isNew && (
                      <div style={{
                        position: 'absolute', top: 10, right: 14,
                        fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
                        color: '#f59e0b', background: 'rgba(245,158,11,0.18)',
                        border: '1px solid rgba(245,158,11,0.5)',
                        padding: '2px 8px', borderRadius: 999,
                        animation: 'tv-pulse 1s ease-in-out infinite',
                      }}>
                        ✦ NOVO
                      </div>
                    )}

                    {/* Position badge */}
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isFirst ? '#f97316' : 'rgba(255,255,255,0.08)',
                      color: isFirst ? '#fff' : '#71717a',
                      fontSize: 20, fontWeight: 900,
                    }}>
                      {index + 1}º
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{
                          fontSize: 22, fontWeight: 800,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {order.customer_name}
                        </span>
                        {isFirst && !isNew && (
                          <span style={{
                            fontSize: 11, fontWeight: 700, color: '#f97316',
                            background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.4)',
                            padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap',
                          }}>
                            ⏱ Primeiro da fila
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#52525b' }}>
                        Pedido #{shortId(order.id)} · {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {/* Status badge */}
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      padding: '8px 16px', borderRadius: 999, flexShrink: 0,
                      background: info.bgColor,
                      border: `1px solid ${info.color}60`,
                    }}>
                      {info.pulse && (
                        <span style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: info.color, display: 'inline-block',
                          animation: 'tv-pulse 1.5s ease-in-out infinite',
                        }} />
                      )}
                      <span style={{ fontSize: 14, fontWeight: 700, color: info.color }}>
                        {info.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Delivered sidebar */}
        {recentDelivered.length > 0 && (
          <div style={{
            width: 280,
            borderLeft: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(0,0,0,0.3)',
            padding: '30px 24px',
            overflow: 'auto',
          }}>
            <h2 style={{
              fontSize: 13, fontWeight: 700, color: '#52525b',
              letterSpacing: '0.12em', textTransform: 'uppercase',
              marginBottom: 20,
            }}>
              ✅ Entregues
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentDelivered.map(order => (
                <div key={order.id} style={{
                  background: 'rgba(34,197,94,0.06)',
                  border: '1px solid rgba(34,197,94,0.2)',
                  borderRadius: 14, padding: '14px 18px',
                }}>
                  <div style={{ fontSize: 11, color: '#52525b', marginBottom: 4 }}>
                    #{shortId(order.id)}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#d4d4d8' }}>
                    {order.customer_name}
                  </div>
                  <div style={{ fontSize: 11, color: '#22c55e', marginTop: 4 }}>
                    Entregue às {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes tv-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.8); }
        }
        @keyframes tv-flash {
          0%   { opacity: 1; }
          60%  { opacity: 0.7; }
          100% { opacity: 0; }
        }
        @keyframes tv-slide-in {
          0%   { opacity: 0; transform: translateY(-22px) scale(0.97); }
          60%  { opacity: 1; transform: translateY(4px) scale(1.01); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
