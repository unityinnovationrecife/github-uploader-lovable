import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, TrendingUp, ShoppingBag, DollarSign, Package, Download, FileText, FileSpreadsheet } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type StatCard = { label: string; value: string; icon: React.ElementType; color: string };

type DayStat = { date: string; pedidos: number; faturamento: number };
type ProductStat = { name: string; quantidade: number; faturamento: number };

const COLORS = {
  primary: 'hsl(var(--primary))',
  orange: '#f97316',
  green: '#22c55e',
  blue: '#3b82f6',
};

export default function AdminRelatorios() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<30 | 7>(30);

  const [stats, setStats] = useState({ totalOrders: 0, totalRevenue: 0, avgTicket: 0, pendingOrders: 0 });
  const [dayStats, setDayStats] = useState<DayStat[]>([]);
  const [topProducts, setTopProducts] = useState<ProductStat[]>([]);

  useEffect(() => {
    document.title = 'Relatórios | Admin';
    return () => { document.title = 'G&S Salgados'; };
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const since = new Date();
      since.setDate(since.getDate() - period);
      const sinceISO = since.toISOString();

      // Pedidos no período
      const { data: orders } = await supabase
        .from('orders')
        .select('id, total, status, created_at')
        .gte('created_at', sinceISO)
        .neq('status', 'cancelled');

      if (!orders) { setLoading(false); return; }

      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);
      const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const pendingOrders = orders.filter(o => o.status === 'pending').length;
      setStats({ totalOrders, totalRevenue, avgTicket, pendingOrders });

      // Pedidos por dia
      const dayMap: Record<string, DayStat> = {};
      for (let i = period - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        dayMap[key] = { date: key, pedidos: 0, faturamento: 0 };
      }
      orders.forEach(o => {
        const key = new Date(o.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        if (dayMap[key]) {
          dayMap[key].pedidos++;
          dayMap[key].faturamento += Number(o.total);
        }
      });
      setDayStats(Object.values(dayMap));

      // Produtos mais vendidos
      const orderIds = orders.map(o => o.id);
      if (orderIds.length > 0) {
        const { data: items } = await supabase
          .from('order_items')
          .select('product_name, quantity, unit_price')
          .in('order_id', orderIds);

        if (items) {
          const productMap: Record<string, ProductStat> = {};
          items.forEach(item => {
            if (!productMap[item.product_name]) {
              productMap[item.product_name] = { name: item.product_name, quantidade: 0, faturamento: 0 };
            }
            productMap[item.product_name].quantidade += item.quantity;
            productMap[item.product_name].faturamento += item.quantity * Number(item.unit_price);
          });
          const sorted = Object.values(productMap).sort((a, b) => b.quantidade - a.quantidade).slice(0, 8);
          setTopProducts(sorted);
        }
      } else {
        setTopProducts([]);
      }

      setLoading(false);
    };

    load();
  }, [period]);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const statCards: StatCard[] = [
    { label: 'Pedidos no período', value: String(stats.totalOrders), icon: ShoppingBag, color: 'text-blue-500' },
    { label: 'Faturamento total', value: fmt(stats.totalRevenue), icon: DollarSign, color: 'text-green-500' },
    { label: 'Ticket médio', value: fmt(stats.avgTicket), icon: TrendingUp, color: 'text-orange-500' },
    { label: 'Aguardando confirmação', value: String(stats.pendingOrders), icon: Package, color: 'text-yellow-500' },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-border bg-background">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground text-sm mt-1">Visão geral do desempenho</p>
        </div>
        {/* Seletor de período */}
        <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
          {([7, 30] as const).map((d) => (
            <button
              key={d}
              onClick={() => setPeriod(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                period === d ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {d === 7 ? '7 dias' : '30 dias'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {loading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {statCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div key={card.label} className="bg-card border border-border rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-muted-foreground">{card.label}</p>
                        <Icon className={`w-4 h-4 ${card.color}`} />
                      </div>
                      <p className="text-xl font-bold text-foreground leading-tight">{card.value}</p>
                    </div>
                  );
                })}
              </div>

              {/* Gráfico: pedidos e faturamento por dia */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <h2 className="text-sm font-semibold text-foreground mb-4">Pedidos & Faturamento por dia</h2>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={dayStats} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                      interval={period === 30 ? 4 : 0}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `R$${v}`}
                    />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }}
                      formatter={(value: number, name: string) =>
                        name === 'faturamento' ? [fmt(value), 'Faturamento'] : [value, 'Pedidos']
                      }
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line yAxisId="left" type="monotone" dataKey="pedidos" stroke={COLORS.blue} strokeWidth={2} dot={false} name="pedidos" />
                    <Line yAxisId="right" type="monotone" dataKey="faturamento" stroke={COLORS.green} strokeWidth={2} dot={false} name="faturamento" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Gráfico: produtos mais vendidos */}
              {topProducts.length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-5">
                  <h2 className="text-sm font-semibold text-foreground mb-4">Produtos mais vendidos (quantidade)</h2>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={topProducts}
                      layout="vertical"
                      margin={{ top: 0, right: 8, left: 8, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={120}
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }}
                        formatter={(value: number, name: string) =>
                          name === 'faturamento' ? [fmt(value), 'Faturamento'] : [value, 'Unidades vendidas']
                        }
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="quantidade" fill={COLORS.orange} radius={[0, 6, 6, 0]} name="Unidades" />
                      <Bar dataKey="faturamento" fill={COLORS.green} radius={[0, 6, 6, 0]} name="Faturamento (R$)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {topProducts.length === 0 && (
                <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-2xl text-sm">
                  Sem dados de produtos para o período selecionado.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
