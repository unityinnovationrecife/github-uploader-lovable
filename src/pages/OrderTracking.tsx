import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Clock, CheckCircle, XCircle, Truck, ChefHat, ShoppingBag, ArrowLeft, Phone } from 'lucide-react';

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
};

type StatusStep = {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
};

const STATUS_STEPS: StatusStep[] = [
  {
    key: 'pending',
    label: 'Pedido Recebido',
    description: 'Aguardando confirmação da loja',
    icon: ShoppingBag,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500',
  },
  {
    key: 'confirmed',
    label: 'Confirmado',
    description: 'Seu pedido foi aceito!',
    icon: CheckCircle,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500',
  },
  {
    key: 'preparing',
    label: 'Preparando',
    description: 'Estamos preparando seus salgados 🧑‍🍳',
    icon: ChefHat,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500',
  },
  {
    key: 'delivering',
    label: 'Saiu para entrega',
    description: 'Seu pedido está a caminho!',
    icon: Truck,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500',
  },
  {
    key: 'delivered',
    label: 'Entregue',
    description: 'Bom apetite! 😋',
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-500',
  },
];

const STATUS_ORDER = ['pending', 'confirmed', 'preparing', 'delivering', 'delivered'];

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function OrderTracking() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchOrder = async () => {
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

      setOrder(data);
      setLoading(false);

      const { data: itemsData } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', id);

      setItems(itemsData || []);
    };

    fetchOrder();

    // Realtime subscription
    const channel = supabase
      .channel(`order-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          setOrder((prev) => prev ? { ...prev, ...(payload.new as Order) } : prev);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[var(--text-muted)] text-sm">Carregando pedido...</p>
        </div>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-2xl">😕</p>
          <p className="text-[var(--text-primary)] font-semibold">Pedido não encontrado</p>
          <button onClick={() => navigate('/')} className="text-orange-500 text-sm underline">
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  const isCancelled = order.status === 'cancelled';
  const currentStepIndex = STATUS_ORDER.indexOf(order.status);

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      {/* Header */}
      <div className="bg-[var(--bg-primary)] border-b border-[var(--border-color)] sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl hover:bg-[var(--bg-secondary)] transition-colors text-[var(--text-muted)]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="font-bold text-[var(--text-primary)] text-sm">Acompanhar Pedido</p>
            <p className="text-xs text-[var(--text-muted)]">#{order.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <a
            href="https://wa.me/5581992429014"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-green-600 font-medium bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full"
          >
            <Phone className="w-3.5 h-3.5" />
            Suporte
          </a>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Status Card */}
        {isCancelled ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 text-center space-y-2">
            <XCircle className="w-10 h-10 text-red-500 mx-auto" />
            <p className="font-bold text-red-600 text-lg">Pedido Cancelado</p>
            <p className="text-sm text-red-500/80">Entre em contato conosco para mais informações.</p>
          </div>
        ) : (
          <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-5">
            {/* Active status */}
            {(() => {
              const step = STATUS_STEPS.find(s => s.key === order.status) || STATUS_STEPS[0];
              const Icon = step.icon;
              return (
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-14 h-14 rounded-2xl ${step.bgColor}/15 flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-7 h-7 ${step.color}`} />
                  </div>
                  <div>
                    <p className={`font-bold text-lg ${step.color}`}>{step.label}</p>
                    <p className="text-sm text-[var(--text-muted)]">{step.description}</p>
                  </div>
                </div>
              );
            })()}

            {/* Progress steps */}
            <div className="space-y-0">
              {STATUS_STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isDone = currentStepIndex > idx;
                const isActive = currentStepIndex === idx;
                const isLast = idx === STATUS_STEPS.length - 1;

                return (
                  <div key={step.key} className="flex items-start gap-3">
                    {/* Icon + line */}
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                        isDone
                          ? 'bg-green-500 text-white'
                          : isActive
                          ? `${step.bgColor} text-white`
                          : 'bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-muted)]'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {!isLast && (
                        <div className={`w-0.5 h-6 mt-0.5 transition-all ${isDone ? 'bg-green-500' : 'bg-[var(--border-color)]'}`} />
                      )}
                    </div>
                    {/* Label */}
                    <div className="pt-1.5 pb-5">
                      <p className={`text-sm font-medium transition-all ${
                        isDone ? 'text-green-600' : isActive ? step.color : 'text-[var(--text-muted)]'
                      }`}>
                        {step.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Customer Info */}
        <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Dados da Entrega</p>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Nome</span>
              <span className="text-[var(--text-primary)] font-medium">{order.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Endereço</span>
              <span className="text-[var(--text-primary)] font-medium text-right max-w-[60%]">{order.address}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Bairro</span>
              <span className="text-[var(--text-primary)] font-medium">{order.delivery_zone_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Pagamento</span>
              <span className="text-[var(--text-primary)] font-medium">{order.payment_method}</span>
            </div>
          </div>
        </div>

        {/* Order Items */}
        {items.length > 0 && (
          <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-4 space-y-3">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Itens do Pedido</p>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {item.quantity}x {item.product_name}
                    </p>
                    {item.selected_flavors?.length ? (
                      <p className="text-xs text-orange-500 mt-0.5">{item.selected_flavors.join(', ')}</p>
                    ) : null}
                    {item.selected_acomp?.length ? (
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">+ {item.selected_acomp.join(', ')}</p>
                    ) : null}
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-primary)] flex-shrink-0">
                    {fmt(item.unit_price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-[var(--border-color)] pt-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">Subtotal</span>
                <span className="text-[var(--text-primary)]">{fmt(order.subtotal)}</span>
              </div>
              {order.delivery_fee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Entrega</span>
                  <span className="text-[var(--text-primary)]">{fmt(order.delivery_fee)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold">
                <span className="text-[var(--text-primary)]">Total</span>
                <span className="text-orange-500">{fmt(order.total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Realtime indicator */}
        <div className="flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Atualizando em tempo real
        </div>
      </div>
    </div>
  );
}
