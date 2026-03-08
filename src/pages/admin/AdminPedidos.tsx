import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ChevronDown, ChevronUp, ChevronRight, Clock, CheckCircle, XCircle, Truck, ChefHat, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOrderSound } from '@/hooks/use-order-sound';

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
  items?: OrderItem[];
};

const STATUS_CONFIG: Record<string, { label: string; activeColor: string; activeBg: string; icon: React.ElementType }> = {
  pending:   { label: 'Pendente',   activeColor: 'text-yellow-600', activeBg: 'bg-yellow-500',  icon: Clock },
  confirmed: { label: 'Confirmado', activeColor: 'text-blue-600',   activeBg: 'bg-blue-500',    icon: CheckCircle },
  preparing: { label: 'Preparando', activeColor: 'text-orange-600', activeBg: 'bg-orange-500',  icon: ChefHat },
  delivering:{ label: 'Em entrega', activeColor: 'text-purple-600', activeBg: 'bg-purple-500',  icon: Truck },
  delivered: { label: 'Entregue',   activeColor: 'text-green-600',  activeBg: 'bg-green-500',   icon: CheckCircle },
  cancelled: { label: 'Cancelado',  activeColor: 'text-red-600',    activeBg: 'bg-red-500',     icon: XCircle },
};

// Badge color for the order header
const STATUS_BADGE: Record<string, string> = {
  pending:    'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  confirmed:  'bg-blue-500/10 text-blue-600 border-blue-500/30',
  preparing:  'bg-orange-500/10 text-orange-600 border-orange-500/30',
  delivering: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  delivered:  'bg-green-500/10 text-green-600 border-green-500/30',
  cancelled:  'bg-red-500/10 text-red-600 border-red-500/30',
};

const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'delivering', 'delivered'];

export default function AdminPedidos() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loadingItems, setLoadingItems] = useState<string | null>(null);
  const { toast } = useToast();
  const { playNotification } = useOrderSound();
  const isFirstLoad = useRef(true);

  const fetchOrders = async () => {
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
    isFirstLoad.current = false;
  };

  useEffect(() => {
    fetchOrders();

    // Realtime: novos pedidos e atualizações de status
    const channel = supabase
      .channel('admin-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new as Order;
          setOrders((prev) => [newOrder, ...prev]);

          // Som + toast de novo pedido (ignora durante carregamento inicial)
          if (!isFirstLoad.current) {
            playNotification();
            toast({
              title: '🛎️ Novo pedido!',
              description: `${newOrder.customer_name} — ${newOrder.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          setOrders((prev) =>
            prev.map((o) => (o.id === (payload.new as Order).id ? { ...o, ...(payload.new as Order) } : o))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleExpand = async (order: Order) => {
    if (expanded === order.id) {
      setExpanded(null);
      return;
    }
    setExpanded(order.id);
    if (!order.items) {
      setLoadingItems(order.id);
      const { data } = await supabase.from('order_items').select('*').eq('order_id', order.id);
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, items: data || [] } : o));
      setLoadingItems(null);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (error) {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
    } else {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
      toast({ title: 'Status atualizado!' });
    }
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtDate = (d: string) => new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header fixo */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-border bg-background sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pedidos</h1>
          <p className="text-muted-foreground text-sm mt-1">{orders.length} pedido{orders.length !== 1 ? 's' : ''} no total</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Ao vivo
        </span>
      </div>

      {/* Lista com scroll */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {orders.map((order) => {
            const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            const StatusIcon = statusCfg.icon;
            const isExpanded = expanded === order.id;

            return (
              <div key={order.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                {/* Header */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => toggleExpand(order)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground text-sm">{order.customer_name}</p>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${STATUS_BADGE[order.status] || STATUS_BADGE.pending}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusCfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {order.delivery_zone_name} • {order.payment_method} • {fmtDate(order.created_at)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-foreground">{fmt(order.total)}</p>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className="border-t border-border p-4 bg-muted/20 space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Endereço</p>
                        <p className="text-foreground font-medium">{order.address}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Resumo</p>
                        <p className="text-foreground">Subtotal: {fmt(order.subtotal)}</p>
                        {order.delivery_fee > 0 && <p className="text-foreground">Entrega: {fmt(order.delivery_fee)}</p>}
                        <p className="font-bold text-foreground">Total: {fmt(order.total)}</p>
                      </div>
                    </div>

                    {/* Items */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Itens</p>
                      {loadingItems === order.id ? (
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      ) : (
                        <div className="space-y-2">
                          {(order.items || []).map(item => (
                            <div key={item.id} className="bg-card rounded-xl p-3 border border-border">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-foreground text-sm">{item.quantity}x {item.product_name}</p>
                                <p className="text-muted-foreground text-sm">{fmt(item.unit_price * item.quantity)}</p>
                              </div>
                              {item.selected_flavors && item.selected_flavors.length > 0 && (
                                <p className="text-xs text-orange-500 mt-1">Sabores: {item.selected_flavors.join(', ')}</p>
                              )}
                              {item.selected_acomp && item.selected_acomp.length > 0 && (
                                <p className="text-xs text-muted-foreground mt-0.5">Acomp: {item.selected_acomp.join(', ')}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Status Update */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Atualizar Status</p>

                      {/* Pipeline de status */}
                      <div className="flex items-center gap-1 mb-3 flex-wrap">
                        {STATUS_FLOW.map((key, idx) => {
                          const cfg = STATUS_CONFIG[key];
                          const Icon = cfg.icon;
                          const isActive = order.status === key;
                          const isPast = STATUS_FLOW.indexOf(order.status) > idx;
                          return (
                            <div key={key} className="flex items-center gap-1">
                              <button
                                onClick={() => updateStatus(order.id, key)}
                                title={cfg.label}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                                  isActive
                                    ? `${cfg.activeBg} text-white border-transparent shadow-sm`
                                    : isPast
                                    ? 'bg-muted/60 text-muted-foreground border-border line-through'
                                    : 'bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                                {cfg.label}
                              </button>
                              {idx < STATUS_FLOW.length - 1 && (
                                <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 ${isPast || isActive ? 'text-muted-foreground' : 'text-border'}`} />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Cancelar separado */}
                      <button
                        onClick={() => updateStatus(order.id, 'cancelled')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                          order.status === 'cancelled'
                            ? 'bg-red-500 text-white border-transparent'
                            : 'border-red-300 text-red-500 hover:bg-red-500/10'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Cancelar pedido
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {orders.length === 0 && (
            <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-2xl">
              Nenhum pedido ainda.
            </div>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
