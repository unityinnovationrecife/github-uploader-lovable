import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  ChefHat,
  ShoppingBag,
  ArrowLeft,
  Phone,
  Share2,
  Copy,
  Check,
  MapPin,
  CreditCard,
  Receipt,
  Timer,
} from 'lucide-react';

type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  selected_flavors: string[] | null;
  selected_acomp: string[] | null;
};

type Order = {
  id: string;
  customer_name: string;
  address: string;
  delivery_zone_name: string;
  payment_method: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: string;
  created_at: string;
  customer_phone: string | null;
};

type StatusStep = {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  estimatedMinutes?: number;
};

const STATUS_STEPS: StatusStep[] = [
  {
    key: 'pending',
    label: 'Pedido Recebido',
    description: 'Aguardando confirmação da loja',
    icon: ShoppingBag,
    estimatedMinutes: 5,
  },
  {
    key: 'confirmed',
    label: 'Confirmado',
    description: 'Pedido aceito pela loja!',
    icon: CheckCircle,
    estimatedMinutes: 10,
  },
  {
    key: 'preparing',
    label: 'Preparando',
    description: 'Seus salgados estão sendo preparados 🧑‍🍳',
    icon: ChefHat,
    estimatedMinutes: 25,
  },
  {
    key: 'delivering',
    label: 'Saiu para Entrega',
    description: 'Motoboy a caminho do seu endereço 🛵',
    icon: Truck,
    estimatedMinutes: 15,
  },
  {
    key: 'delivered',
    label: 'Entregue',
    description: 'Bom apetite! 😋',
    icon: CheckCircle,
  },
];

const STATUS_ORDER = ['pending', 'confirmed', 'preparing', 'delivering', 'delivered'];

const STEP_COLORS: Record<string, { bg: string; text: string; ring: string; glow: string }> = {
  pending:   { bg: 'bg-yellow-500',  text: 'text-yellow-600',  ring: 'ring-yellow-400',  glow: 'shadow-yellow-400/40' },
  confirmed: { bg: 'bg-blue-500',    text: 'text-blue-600',    ring: 'ring-blue-400',    glow: 'shadow-blue-400/40' },
  preparing: { bg: 'bg-orange-500',  text: 'text-orange-600',  ring: 'ring-orange-400',  glow: 'shadow-orange-400/40' },
  delivering:{ bg: 'bg-purple-500',  text: 'text-purple-600',  ring: 'ring-purple-400',  glow: 'shadow-purple-400/40' },
  delivered: { bg: 'bg-green-500',   text: 'text-green-600',   ring: 'ring-green-400',   glow: 'shadow-green-400/40' },
};

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function OrderTracking() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusUpdatedAt, setStatusUpdatedAt] = useState<Record<string, string>>({});

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setOrder(data as Order);
    setStatusUpdatedAt(prev => ({
      ...prev,
      [data.status]: new Date().toISOString(),
    }));
    setLoading(false);

    const { data: itemsData } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', id);

    setItems(itemsData || []);
  }, [id]);

  useEffect(() => {
    fetchOrder();

    if (!id) return;

    // Record created_at as time for pending
    setStatusUpdatedAt(prev => ({
      ...prev,
    }));

    const channel = supabase
      .channel(`order-tracking-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` },
        (payload) => {
          const updated = payload.new as Order;
          setOrder(prev => prev ? { ...prev, ...updated } : prev);
          setStatusUpdatedAt(prev => ({
            ...prev,
            [updated.status]: new Date().toISOString(),
          }));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, fetchOrder]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Acompanhe meu pedido — G&S Salgados',
          text: `Acompanhe o status do seu pedido em tempo real!`,
          url,
        });
      } catch {/* cancelled */}
    } else {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-16 h-16">
            <div className="w-16 h-16 border-4 border-[var(--border-color)] border-t-orange-500 rounded-full animate-spin" />
            <ShoppingBag className="w-6 h-6 text-orange-500 absolute inset-0 m-auto" />
          </div>
          <p className="text-[var(--text-muted)] text-sm font-medium">Carregando pedido...</p>
        </div>
      </div>
    );
  }

  // ── Not Found ──
  if (notFound || !order) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-xs">
          <div className="w-20 h-20 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center mx-auto">
            <span className="text-4xl">😕</span>
          </div>
          <div>
            <p className="text-[var(--text-primary)] font-bold text-lg">Pedido não encontrado</p>
            <p className="text-[var(--text-muted)] text-sm mt-1">Verifique o link ou entre em contato conosco.</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-sm font-medium text-orange-500 bg-orange-500/10 border border-orange-500/20 px-4 py-2 rounded-full"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar à loja
          </button>
        </div>
      </div>
    );
  }

  const isCancelled = order.status === 'cancelled';
  const currentStepIndex = isCancelled ? -1 : STATUS_ORDER.indexOf(order.status);
  const currentStep = STATUS_STEPS.find(s => s.key === order.status);
  const colors = STEP_COLORS[order.status] ?? STEP_COLORS['pending'];

  // Remaining estimated time from current step
  const remainingMinutes = isCancelled ? 0 : STATUS_STEPS
    .slice(currentStepIndex)
    .reduce((acc, s) => acc + (s.estimatedMinutes ?? 0), 0);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">

      {/* ── Header ── */}
      <div className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl hover:bg-[var(--bg-primary)] transition-colors text-[var(--text-muted)]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[var(--text-primary)] text-sm leading-tight">Acompanhar Pedido</p>
            <p className="text-xs text-[var(--text-muted)] truncate">#{order.id.slice(0, 8).toUpperCase()} · {formatDate(order.created_at)} às {formatTime(order.created_at)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-xs font-medium text-orange-500 bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-full transition-all active:scale-95"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
              {copied ? 'Copiado!' : 'Compartilhar'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4 pb-10">

        {/* ── Cancelled Card ── */}
        {isCancelled && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-3 dark:bg-red-950/20 dark:border-red-900/40">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto dark:bg-red-900/30">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <p className="font-bold text-red-600 text-xl">Pedido Cancelado</p>
              <p className="text-sm text-red-500/80 mt-1">Entre em contato conosco para mais informações.</p>
            </div>
            <a
              href="https://wa.me/5581992429014"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-green-600 bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-full"
            >
              <Phone className="w-4 h-4" />
              Falar com a loja
            </a>
          </div>
        )}

        {/* ── Hero Status Card ── */}
        {!isCancelled && currentStep && (
          <div className={`bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl overflow-hidden`}>
            {/* Top accent bar */}
            <div className={`h-1.5 w-full ${colors.bg}`} />

            <div className="p-5">
              {/* Active status hero */}
              <div className="flex items-center gap-4 mb-6">
                <div className={`relative w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${colors.bg} shadow-lg ${colors.glow}`}>
                  {(() => {
                    const Icon = currentStep.icon;
                    return <Icon className="w-8 h-8 text-white" />;
                  })()}
                  {/* Pulse ring for non-delivered */}
                  {order.status !== 'delivered' && (
                    <span className={`absolute inset-0 rounded-2xl ${colors.bg} opacity-40 animate-ping`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-xl ${colors.text} leading-tight`}>{currentStep.label}</p>
                  <p className="text-sm text-[var(--text-muted)] mt-0.5">{currentStep.description}</p>
                  {remainingMinutes > 0 && order.status !== 'delivered' && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <Timer className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <span className="text-xs text-[var(--text-muted)]">~{remainingMinutes} min estimados</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Timeline ── */}
              <div className="space-y-0">
                {STATUS_STEPS.map((step, idx) => {
                  const Icon = step.icon;
                  const isDone = currentStepIndex > idx;
                  const isActive = currentStepIndex === idx;
                  const isFuture = currentStepIndex < idx;
                  const isLast = idx === STATUS_STEPS.length - 1;
                  const stepColors = STEP_COLORS[step.key];
                  const updatedAt = isDone || isActive ? statusUpdatedAt[step.key] : null;

                  return (
                    <div key={step.key} className="flex gap-4">
                      {/* Line + dot column */}
                      <div className="flex flex-col items-center flex-shrink-0" style={{ width: 32 }}>
                        {/* Circle */}
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500
                          ${isDone ? 'bg-green-500 shadow-md shadow-green-400/30' : ''}
                          ${isActive ? `${stepColors.bg} shadow-lg ${stepColors.glow} ring-4 ${stepColors.ring}/30` : ''}
                          ${isFuture ? 'bg-[var(--bg-primary)] border-2 border-[var(--border-color)]' : ''}
                        `}>
                          {isDone ? (
                            <Check className="w-4 h-4 text-white" />
                          ) : (
                            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[var(--text-muted)]'}`} />
                          )}
                        </div>
                        {/* Connector line */}
                        {!isLast && (
                          <div className={`w-0.5 flex-1 min-h-[2rem] mt-1 transition-all duration-500 ${
                            isDone ? 'bg-green-400' : 'bg-[var(--border-color)]'
                          }`} />
                        )}
                      </div>

                      {/* Content */}
                      <div className={`flex-1 pb-5 ${isLast ? 'pb-1' : ''}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className={`text-sm font-semibold transition-all ${
                              isDone ? 'text-green-600' : isActive ? stepColors.text : 'text-[var(--text-muted)]'
                            }`}>
                              {step.label}
                            </p>
                            {(isDone || isActive) && (
                              <p className={`text-xs mt-0.5 ${isActive ? 'text-[var(--text-muted)]' : 'text-green-500/70'}`}>
                                {step.description}
                              </p>
                            )}
                          </div>
                          {updatedAt && (
                            <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0 mt-0.5">
                              {formatTime(updatedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Shareable Link Card ── */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
              <Share2 className="w-5 h-5 text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Compartilhe com alguém</p>
              <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{window.location.href}</p>
            </div>
            <button
              onClick={handleShare}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl transition-all active:scale-95 flex-shrink-0 ${
                copied
                  ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                  : 'bg-[var(--bg-primary)] text-[var(--text-muted)] border border-[var(--border-color)] hover:border-orange-500/30 hover:text-orange-500'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>

        {/* ── Delivery Info ── */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[var(--text-muted)]" />
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Dados da Entrega</p>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-[var(--text-muted)] flex-shrink-0">Cliente</span>
              <span className="text-[var(--text-primary)] font-medium text-right">{order.customer_name}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[var(--text-muted)] flex-shrink-0">Endereço</span>
              <span className="text-[var(--text-primary)] font-medium text-right">{order.address}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[var(--text-muted)] flex-shrink-0">Bairro</span>
              <span className="text-[var(--text-primary)] font-medium text-right">{order.delivery_zone_name}</span>
            </div>
          </div>
        </div>

        {/* ── Payment Info ── */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[var(--text-muted)]" />
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Pagamento</p>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[var(--text-muted)] text-sm">Forma de pagamento</span>
            <span className="text-[var(--text-primary)] font-semibold text-sm">{order.payment_method}</span>
          </div>
        </div>

        {/* ── Order Items ── */}
        {items.length > 0 && (
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[var(--text-muted)]" />
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Itens do Pedido</p>
            </div>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3">
                  <div className="flex gap-3 flex-1 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-orange-500">{item.quantity}x</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] leading-tight">{item.product_name}</p>
                      {item.selected_flavors?.length ? (
                        <p className="text-xs text-orange-500 mt-0.5 leading-tight">🍽️ {item.selected_flavors.join(', ')}</p>
                      ) : null}
                      {item.selected_acomp?.length ? (
                        <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-tight">+ {item.selected_acomp.join(', ')}</p>
                      ) : null}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-primary)] flex-shrink-0">
                    {fmt(item.unit_price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-[var(--border-color)] pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">Subtotal</span>
                <span className="text-[var(--text-primary)]">{fmt(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">Taxa de entrega</span>
                <span className={order.delivery_fee === 0 ? 'text-green-600 font-medium' : 'text-[var(--text-primary)]'}>
                  {order.delivery_fee === 0 ? 'Grátis' : fmt(order.delivery_fee)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-1 border-t border-[var(--border-color)]">
                <span className="text-[var(--text-primary)]">Total</span>
                <span className="text-orange-500 text-base">{fmt(order.total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Support ── */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Algum problema?</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Fale diretamente com a loja</p>
          </div>
          <a
            href="https://wa.me/5581992429014"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-medium text-green-600 bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-xl transition-all active:scale-95 flex-shrink-0"
          >
            <Phone className="w-4 h-4" />
            WhatsApp
          </a>
        </div>

        {/* ── Realtime indicator ── */}
        <div className="flex items-center justify-center gap-2 text-xs text-[var(--text-muted)] py-1">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
          Atualizando em tempo real
          <Clock className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}
