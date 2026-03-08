import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Loader2, ChevronDown, ChevronUp, ChevronRight,
  Clock, CheckCircle, XCircle, Truck, ChefHat,
  Archive, ArchiveRestore, Search, Filter, Phone,
} from 'lucide-react';
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
  customer_phone?: string | null;
  address: string;
  delivery_zone_name: string;
  payment_method: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: string;
  archived: boolean;
  created_at: string;
  items?: OrderItem[];
};

const STATUS_CONFIG: Record<string, { label: string; activeColor: string; activeBg: string; icon: React.ElementType }> = {
  pending:    { label: 'Pendente',   activeColor: 'text-yellow-600', activeBg: 'bg-yellow-500',  icon: Clock },
  confirmed:  { label: 'Confirmado', activeColor: 'text-blue-600',   activeBg: 'bg-blue-500',    icon: CheckCircle },
  preparing:  { label: 'Preparando', activeColor: 'text-orange-600', activeBg: 'bg-orange-500',  icon: ChefHat },
  delivering: { label: 'Em entrega', activeColor: 'text-purple-600', activeBg: 'bg-purple-500',  icon: Truck },
  delivered:  { label: 'Entregue',   activeColor: 'text-green-600',  activeBg: 'bg-green-500',   icon: CheckCircle },
  cancelled:  { label: 'Cancelado',  activeColor: 'text-red-600',    activeBg: 'bg-red-500',     icon: XCircle },
};

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
  const PAGE_SIZE = 20;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0); // 0-indexed
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loadingItems, setLoadingItems] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const { toast } = useToast();
  const { playNotification } = useOrderSound();
  const isFirstLoad = useRef(true);

  const pendingCount = orders.filter((o) => !o.archived && o.status === 'pending').length;

  // Título da aba com contador
  useEffect(() => {
    const base = 'Pedidos | Admin';
    document.title = !loading && pendingCount > 0 ? `(${pendingCount}) ${base}` : base;
    return () => { document.title = 'G&S Salgados'; };
  }, [pendingCount, loading]);

  // Busca paginada no servidor
  const fetchOrders = async (pg: number, archived: boolean, status: string, name: string) => {
    setLoading(true);
    setExpanded(null);

    let query = supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .eq('archived', archived)
      .order('created_at', { ascending: false })
      .range(pg * PAGE_SIZE, pg * PAGE_SIZE + PAGE_SIZE - 1);

    if (status !== 'all') query = query.eq('status', status);
    if (name.trim()) query = query.ilike('customer_name', `%${name.trim()}%`);

    const { data, count } = await query;
    setOrders((data as Order[]) || []);
    setTotalCount(count ?? 0);
    setLoading(false);
    isFirstLoad.current = false;
  };

  // Re-fetch quando filtros ou página mudam
  useEffect(() => {
    fetchOrders(page, showArchived, statusFilter, search);
  }, [page, showArchived, statusFilter, search]);

  // Reset para página 0 ao trocar filtros
  const applyFilter = (newStatus: string, newArchived: boolean) => {
    setPage(0);
    setStatusFilter(newStatus);
    setShowArchived(newArchived);
  };

  const applySearch = (name: string) => {
    setPage(0);
    setSearch(name);
  };

  // Realtime: novos pedidos prepend na lista (só se na pág 0 e sem filtros ativos)
  // Nota: som e toast de notificação são gerenciados pelo AdminLayout via usePendingOrders
  useEffect(() => {
    const channel = supabase
      .channel('admin-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        const newOrder = payload.new as Order;
        if (!isFirstLoad.current) {
          // Prepend apenas se estiver na primeira página de ativos sem filtros
          if (page === 0 && !showArchived && statusFilter === 'all' && !search) {
            setOrders((prev) => [newOrder, ...prev.slice(0, PAGE_SIZE - 1)]);
            setTotalCount((c) => c + 1);
          }
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        setOrders((prev) =>
          prev.map((o) => (o.id === (payload.new as Order).id ? { ...o, ...(payload.new as Order) } : o))
        );
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [page, showArchived, statusFilter, search]);

  const toggleExpand = async (order: Order) => {
    if (expanded === order.id) { setExpanded(null); return; }
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

  const toggleArchive = async (order: Order) => {
    const newVal = !order.archived;
    const { error } = await supabase.from('orders').update({ archived: newVal }).eq('id', order.id);
    if (error) {
      toast({ title: 'Erro ao arquivar', variant: 'destructive' });
    } else {
      // Remove da lista atual (mudou de aba)
      setOrders(prev => prev.filter(o => o.id !== order.id));
      setTotalCount(c => c - 1);
      toast({ title: newVal ? '📦 Pedido arquivado' : '📂 Pedido restaurado' });
      if (expanded === order.id) setExpanded(null);
    }
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtDate = (d: string) => new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-border bg-background sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pedidos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {totalCount} {showArchived ? 'arquivados' : 'pedido' + (totalCount !== 1 ? 's' : '')}
            {totalPages > 1 && ` · pág. ${page + 1} de ${totalPages}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setPage(0); setShowArchived(!showArchived); setStatusFilter('all'); setSearch(''); setSearchInput(''); }}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
              showArchived
                ? 'bg-muted text-foreground border-border'
                : 'bg-background text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            {showArchived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
            {showArchived ? 'Ver ativos' : 'Arquivados'}
          </button>
          {!showArchived && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Ao vivo
            </span>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex-shrink-0 px-6 py-3 border-b border-border bg-background/80 flex flex-col sm:flex-row gap-2">
        {/* Busca por nome com debounce manual */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySearch(searchInput)}
            onBlur={() => applySearch(searchInput)}
            placeholder="Buscar por nome... (Enter)"
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all"
          />
        </div>
        {/* Filtro por status */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <select
            value={statusFilter}
            onChange={(e) => applyFilter(e.target.value, showArchived)}
            className="pl-9 pr-8 py-2 text-sm rounded-xl bg-muted/50 border border-border text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all appearance-none cursor-pointer"
          >
            <option value="all">Todos os status</option>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-2xl">
              {showArchived ? 'Nenhum pedido arquivado.' : 'Nenhum pedido encontrado.'}
            </div>
          ) : (
            orders.map((order) => {
              const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
              const StatusIcon = statusCfg.icon;
              const isExpanded = expanded === order.id;

              return (
                <div key={order.id} className={`bg-card border rounded-2xl overflow-hidden transition-all ${order.archived ? 'border-border opacity-75' : 'border-border'}`}>
                  {/* Header do pedido */}
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
                        {order.archived && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">
                            <Archive className="w-3 h-3" /> Arquivado
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {order.delivery_zone_name} • {order.payment_method} • {fmtDate(order.created_at)}
                      </p>
                      {order.customer_phone && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {order.customer_phone}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-foreground">{fmt(order.total)}</p>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                  </div>

                  {/* Expandido */}
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

                      {/* Itens */}
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

                      {/* Atualizar Status (apenas não arquivados) */}
                      {!order.archived && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Atualizar Status</p>
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
                      )}

                      {/* Arquivar / Restaurar */}
                      <div className="pt-2 border-t border-border">
                        <button
                          onClick={() => toggleArchive(order)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                            order.archived
                              ? 'border-primary/40 text-primary hover:bg-primary/10'
                              : 'border-border text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          {order.archived
                            ? <><ArchiveRestore className="w-3.5 h-3.5" /> Restaurar pedido</>
                            : <><Archive className="w-3.5 h-3.5" /> Arquivar pedido</>
                          }
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="max-w-5xl mx-auto mt-4 flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Anterior
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const pg = totalPages <= 7 ? i : (page < 4 ? i : (page > totalPages - 4 ? totalPages - 7 + i : page - 3 + i));
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${pg === page ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                  >
                    {pg + 1}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Próxima →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
