import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/logo.png';

type Order = {
  id: string;
  customer_name: string;
  status: string;
  created_at: string;
};

const STATUS_LABELS: Record<string, { label: string; color: string; bgColor: string; pulse: boolean }> = {
  pending:    { label: 'Aguardando',     color: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)',  pulse: true  },
  confirmed:  { label: 'Confirmado',     color: '#3b82f6', bgColor: 'rgba(59,130,246,0.15)',  pulse: false },
  preparing:  { label: 'Preparando',     color: '#a855f7', bgColor: 'rgba(168,85,247,0.15)',  pulse: true  },
  out_for_delivery: { label: 'Saiu p/ entrega', color: '#f97316', bgColor: 'rgba(249,115,22,0.15)', pulse: true },
  delivered:  { label: 'Entregue ✓',    color: '#22c55e', bgColor: 'rgba(34,197,94,0.15)',   pulse: false },
  cancelled:  { label: 'Cancelado',      color: '#ef4444', bgColor: 'rgba(239,68,68,0.15)',   pulse: false },
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

export default function TVFila() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [recentDelivered, setRecentDelivered] = useState<Order[]>([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('id, customer_name, status, created_at')
      .eq('archived', false)
      .in('status', [...ACTIVE_STATUSES, 'delivered'])
      .order('created_at', { ascending: true });

    if (data) {
      const active = data.filter(o => ACTIVE_STATUSES.includes(o.status));
      const delivered = data
        .filter(o => o.status === 'delivered')
        .slice(-6)
        .reverse();

      setOrders(active);
      setRecentDelivered(delivered);
      setLastUpdate(new Date());
    }
  };

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('tv-fila-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const getStatusInfo = (status: string) => STATUS_LABELS[status] ?? STATUS_LABELS['pending'];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a0f 0%, #18181b 50%, #0f0f14 100%)',
        fontFamily: "'Poppins', Arial, sans-serif",
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 40px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <img src={logo} alt="Logo" style={{ height: 56, objectFit: 'contain' }} />
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
              Fila de Pedidos
            </h1>
            <p style={{ fontSize: 13, color: '#a1a1aa', margin: 0 }}>Atualização em tempo real</p>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 36, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#f97316' }}>
            <Clock />
          </div>
          <div style={{ fontSize: 12, color: '#71717a' }}>
            Últ. atualiz: {lastUpdate.toLocaleTimeString('pt-BR')}
          </div>
        </div>
      </header>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', gap: 0, overflow: 'hidden' }}>

        {/* Active Orders */}
        <div style={{ flex: 1, padding: '30px 40px', overflow: 'auto' }}>
          {/* Status legend */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
            {ACTIVE_STATUSES.map(s => {
              const info = getStatusInfo(s);
              return (
                <div
                  key={s}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 14px', borderRadius: 999,
                    background: info.bgColor,
                    border: `1px solid ${info.color}40`,
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: info.color, display: 'inline-block' }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: info.color }}>{info.label}</span>
                </div>
              );
            })}
          </div>

          {orders.length === 0 ? (
            <div
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: 300, gap: 16,
                color: '#3f3f46',
              }}
            >
              <span style={{ fontSize: 64 }}>🍽️</span>
              <p style={{ fontSize: 22, fontWeight: 600 }}>Nenhum pedido em andamento</p>
              <p style={{ fontSize: 14 }}>Os pedidos aparecerão aqui automaticamente</p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 20,
              }}
            >
              {orders.map(order => {
                const info = getStatusInfo(order.status);
                return (
                  <div
                    key={order.id}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: `2px solid ${info.color}50`,
                      borderRadius: 20,
                      padding: '24px 28px',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {/* Glow top */}
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                      background: `linear-gradient(90deg, transparent, ${info.color}, transparent)`,
                    }} />

                    {/* Order number */}
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                      marginBottom: 12,
                    }}>
                      <span style={{
                        fontSize: 13, fontWeight: 700, color: '#71717a',
                        letterSpacing: '0.1em', textTransform: 'uppercase',
                      }}>
                        Pedido #{shortId(order.id)}
                      </span>
                      <span style={{
                        fontSize: 11, color: '#52525b',
                      }}>
                        {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Customer name */}
                    <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 16, lineHeight: 1.1 }}>
                      {order.customer_name}
                    </div>

                    {/* Status badge */}
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      padding: '8px 16px', borderRadius: 999,
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
          <div
            style={{
              width: 280,
              borderLeft: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(0,0,0,0.3)',
              padding: '30px 24px',
              overflow: 'auto',
            }}
          >
            <h2 style={{
              fontSize: 13, fontWeight: 700, color: '#52525b',
              letterSpacing: '0.12em', textTransform: 'uppercase',
              marginBottom: 20,
            }}>
              ✅ Entregues
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentDelivered.map(order => (
                <div
                  key={order.id}
                  style={{
                    background: 'rgba(34,197,94,0.06)',
                    border: '1px solid rgba(34,197,94,0.2)',
                    borderRadius: 14,
                    padding: '14px 18px',
                  }}
                >
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

      {/* Pulse animation */}
      <style>{`
        @keyframes tv-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}
