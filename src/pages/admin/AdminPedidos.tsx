import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ChevronDown, ChevronUp, Clock, CheckCircle, XCircle, Truck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30', icon: Clock },
  confirmed: { label: 'Confirmado', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30', icon: CheckCircle },
  preparing: { label: 'Preparando', color: 'bg-orange-500/10 text-orange-600 border-orange-500/30', icon: ChefHat },
  delivering: { label: 'Em entrega', color: 'bg-purple-500/10 text-purple-600 border-purple-500/30', icon: Truck },
  delivered: { label: 'Entregue', color: 'bg-green-500/10 text-green-600 border-green-500/30', icon: CheckCircle },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/10 text-red-600 border-red-500/30', icon: XCircle },
};

export default function AdminPedidos() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loadingItems, setLoadingItems] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchOrders = async () => {
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

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
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pedidos</h1>
          <p className="text-muted-foreground text-sm mt-1">{orders.length} pedido{orders.length !== 1 ? 's' : ''} no total</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Ao vivo
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-3">
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
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${statusCfg.color}`}>
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
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Atualizar Status</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                          const Icon = cfg.icon;
                          return (
                            <button
                              key={key}
                              onClick={() => updateStatus(order.id, key)}
                              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                                order.status === key
                                  ? cfg.color + ' font-semibold'
                                  : 'border-border text-muted-foreground hover:bg-muted'
                              }`}
                            >
                              <Icon className="w-3 h-3" />
                              {cfg.label}
                            </button>
                          );
                        })}
                      </div>
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
        </div>
      )}
    </div>
  );
}
