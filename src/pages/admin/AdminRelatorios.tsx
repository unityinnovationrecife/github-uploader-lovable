import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, TrendingUp, ShoppingBag, DollarSign, Package, Download, FileText, FileSpreadsheet, Tag } from 'lucide-react';
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
type CouponStat = {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  uses_count: number;
  active: boolean;
  expires_at: string | null;
};

type FullOrder = {
  id: string;
  created_at: string;
  customer_name: string;
  customer_phone: string | null;
  address: string;
  delivery_zone_name: string;
  payment_method: string;
  status: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
};

const COLORS = {
  primary: 'hsl(var(--primary))',
  orange: '#f97316',
  green: '#22c55e',
  blue: '#3b82f6',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  out_for_delivery: 'Em entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'PIX',
  card: 'Cartão',
  credit_card: 'Crédito',
  debit_card: 'Débito',
};

function escapeCsv(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(';') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportOrdersCSV(orders: FullOrder[], period: number) {
  const headers = ['ID', 'Data', 'Cliente', 'Telefone', 'Endereço', 'Zona', 'Pagamento', 'Status', 'Subtotal', 'Frete', 'Total'];
  const rows = orders.map(o => [
    o.id,
    new Date(o.created_at).toLocaleString('pt-BR'),
    o.customer_name,
    o.customer_phone ?? '',
    o.address,
    o.delivery_zone_name,
    PAYMENT_LABELS[o.payment_method] ?? o.payment_method,
    STATUS_LABELS[o.status] ?? o.status,
    Number(o.subtotal).toFixed(2).replace('.', ','),
    Number(o.delivery_fee).toFixed(2).replace('.', ','),
    Number(o.total).toFixed(2).replace('.', ','),
  ]);
  const csv = [headers, ...rows].map(r => r.map(escapeCsv).join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `pedidos-${period}dias.csv`);
}

function exportProductsCSV(products: ProductStat[], period: number) {
  const headers = ['Produto', 'Unidades Vendidas', 'Faturamento (R$)'];
  const rows = products.map(p => [
    p.name,
    p.quantidade,
    p.faturamento.toFixed(2).replace('.', ','),
  ]);
  const csv = [headers, ...rows].map(r => r.map(escapeCsv).join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `produtos-mais-vendidos-${period}dias.csv`);
}

async function exportOrdersPDF(orders: FullOrder[], period: number, stats: { totalOrders: number; totalRevenue: number; avgTicket: number }) {
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const now = new Date().toLocaleDateString('pt-BR');

  const rows = orders.map(o => `
    <tr>
      <td>${new Date(o.created_at).toLocaleDateString('pt-BR')}</td>
      <td>${o.customer_name}</td>
      <td>${o.address}</td>
      <td>${PAYMENT_LABELS[o.payment_method] ?? o.payment_method}</td>
      <td>${STATUS_LABELS[o.status] ?? o.status}</td>
      <td style="text-align:right">${fmt(Number(o.total))}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Relatório de Pedidos – ${period} dias</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 24px; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  .sub { color: #666; font-size: 11px; margin-bottom: 20px; }
  .cards { display: flex; gap: 16px; margin-bottom: 20px; }
  .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; min-width: 140px; }
  .card .label { font-size: 10px; color: #6b7280; }
  .card .val { font-size: 16px; font-weight: 700; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f3f4f6; text-align: left; padding: 6px 8px; font-size: 11px; border-bottom: 2px solid #e5e7eb; }
  td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
  tr:nth-child(even) td { background: #fafafa; }
  .footer { margin-top: 16px; font-size: 10px; color: #9ca3af; text-align: right; }
</style>
</head>
<body>
<h1>Relatório de Pedidos</h1>
<p class="sub">Período: últimos ${period} dias &bull; Gerado em ${now}</p>
<div class="cards">
  <div class="card"><div class="label">Total de pedidos</div><div class="val">${stats.totalOrders}</div></div>
  <div class="card"><div class="label">Faturamento total</div><div class="val">${fmt(stats.totalRevenue)}</div></div>
  <div class="card"><div class="label">Ticket médio</div><div class="val">${fmt(stats.avgTicket)}</div></div>
</div>
<table>
  <thead><tr><th>Data</th><th>Cliente</th><th>Endereço</th><th>Pagamento</th><th>Status</th><th style="text-align:right">Total</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<p class="footer">G&amp;S Salgados &bull; Exportado via painel admin</p>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  }
}

export default function AdminRelatorios() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<30 | 7>(30);
  const [exporting, setExporting] = useState(false);

  const [stats, setStats] = useState({ totalOrders: 0, totalRevenue: 0, avgTicket: 0, pendingOrders: 0 });
  const [dayStats, setDayStats] = useState<DayStat[]>([]);
  const [topProducts, setTopProducts] = useState<ProductStat[]>([]);
  const [allOrders, setAllOrders] = useState<FullOrder[]>([]);
  const [couponStats, setCouponStats] = useState<CouponStat[]>([]);

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

      const { data: orders } = await supabase
        .from('orders')
        .select('id, total, subtotal, delivery_fee, status, created_at, customer_name, customer_phone, address, delivery_zone_name, payment_method')
        .gte('created_at', sinceISO)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (!orders) { setLoading(false); return; }

      setAllOrders(orders as FullOrder[]);

      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);
      const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const pendingOrders = orders.filter(o => o.status === 'pending').length;
      setStats({ totalOrders, totalRevenue, avgTicket, pendingOrders });

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

      // Load coupon stats (all coupons, ordered by uses)
      const { data: coupons } = await supabase
        .from('coupons' as any)
        .select('id, code, type, value, uses_count, active, expires_at')
        .order('uses_count', { ascending: false });
      setCouponStats((coupons ?? []) as unknown as CouponStat[]);

      setLoading(false);
    };

    load();
  }, [period]);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleExport = async (type: 'csv-orders' | 'csv-products' | 'pdf') => {
    setExporting(true);
    try {
      if (type === 'csv-orders') exportOrdersCSV(allOrders, period);
      else if (type === 'csv-products') exportProductsCSV(topProducts, period);
      else if (type === 'pdf') await exportOrdersPDF(allOrders, period, stats);
    } finally {
      setExporting(false);
    }
  };

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

        <div className="flex items-center gap-2">
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

          {/* Exportar */}
          {!loading && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={exporting} className="gap-1.5">
                  {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => handleExport('csv-orders')} className="gap-2 cursor-pointer">
                  <FileSpreadsheet className="w-4 h-4 text-green-600" />
                  CSV – Lista de pedidos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('csv-products')} className="gap-2 cursor-pointer" disabled={topProducts.length === 0}>
                  <FileSpreadsheet className="w-4 h-4 text-green-600" />
                  CSV – Produtos vendidos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')} className="gap-2 cursor-pointer">
                  <FileText className="w-4 h-4 text-red-500" />
                  PDF – Imprimir / salvar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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
