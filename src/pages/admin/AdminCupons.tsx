import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2, X, Loader2, Tag, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Coupon = {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  min_order: number;
  max_uses: number | null;
  uses_count: number;
  active: boolean;
  expires_at: string | null;
  created_at: string;
};

const emptyForm = (): Omit<Coupon, 'id' | 'uses_count' | 'created_at'> => ({
  code: '',
  type: 'percent',
  value: 10,
  min_order: 0,
  max_uses: null,
  active: true,
  expires_at: null,
});

export default function AdminCupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [expiresInput, setExpiresInput] = useState('');
  const { toast } = useToast();

  const fetchCoupons = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('coupons' as any)
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setCoupons(data as unknown as Coupon[]);
    setLoading(false);
  };

  useEffect(() => { fetchCoupons(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setExpiresInput('');
    setShowForm(true);
  };

  const openEdit = (c: Coupon) => {
    setEditingId(c.id);
    setForm({
      code: c.code,
      type: c.type,
      value: c.value,
      min_order: c.min_order,
      max_uses: c.max_uses,
      active: c.active,
      expires_at: c.expires_at,
    });
    setExpiresInput(c.expires_at ? c.expires_at.split('T')[0] : '');
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const codeNorm = form.code.trim().toUpperCase();
    if (!codeNorm) {
      toast({ title: 'Código obrigatório', variant: 'destructive' });
      setSaving(false);
      return;
    }

    const payload = {
      code: codeNorm,
      type: form.type,
      value: form.value,
      min_order: form.min_order,
      max_uses: form.max_uses || null,
      active: form.active,
      expires_at: expiresInput ? new Date(expiresInput + 'T23:59:59').toISOString() : null,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from('coupons' as any).update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('coupons' as any).insert({ ...payload, uses_count: 0 }));
    }

    setSaving(false);
    if (error) {
      toast({
        title: 'Erro ao salvar',
        description: error.code === '23505' ? 'Já existe um cupom com esse código.' : error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: editingId ? 'Cupom atualizado!' : 'Cupom criado!' });
      setShowForm(false);
      fetchCoupons();
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Excluir cupom "${code}"?`)) return;
    await supabase.from('coupons' as any).delete().eq('id', id);
    toast({ title: 'Cupom excluído' });
    fetchCoupons();
  };

  const toggleActive = async (c: Coupon) => {
    await supabase.from('coupons' as any).update({ active: !c.active }).eq('id', c.id);
    fetchCoupons();
  };

  const formatValue = (c: Coupon) =>
    c.type === 'percent'
      ? `${c.value}%`
      : c.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const isExpired = (c: Coupon) =>
    c.expires_at ? new Date(c.expires_at) < new Date() : false;

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cupons de Desconto</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie os cupons disponíveis para clientes</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"
        >
          <Plus className="w-4 h-4" />
          Novo Cupom
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <Tag className="w-12 h-12 opacity-30" />
          <p className="text-lg font-medium">Nenhum cupom cadastrado</p>
          <p className="text-sm">Clique em "Novo Cupom" para criar o primeiro.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Código</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Desconto</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">Pedido mín.</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Usos</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Validade</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => {
                  const expired = isExpired(c);
                  return (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-foreground tracking-wider bg-muted px-2 py-0.5 rounded-lg text-xs">
                          {c.code}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-primary">{formatValue(c)}</span>
                        <span className="text-xs text-muted-foreground ml-1">
                          {c.type === 'percent' ? 'percentual' : 'fixo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                        {c.min_order > 0
                          ? c.min_order.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                        {c.uses_count}{c.max_uses ? `/${c.max_uses}` : ''}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                        {c.expires_at
                          ? <span className={expired ? 'text-destructive font-medium' : ''}>
                              {new Date(c.expires_at).toLocaleDateString('pt-BR')}
                              {expired && ' (expirado)'}
                            </span>
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(c)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                            c.active && !expired
                              ? 'bg-green-500/15 text-green-600 hover:bg-green-500/25'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          {c.active && !expired
                            ? <><CheckCircle2 className="w-3 h-3" /> Ativo</>
                            : <><XCircle className="w-3 h-3" /> {expired ? 'Expirado' : 'Inativo'}</>
                          }
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(c)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id, c.code)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-bold text-foreground text-lg">
                {editingId ? 'Editar Cupom' : 'Novo Cupom'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-muted transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              {/* Código */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Código do cupom *</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="ex: PROMO10"
                  maxLength={20}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground font-mono uppercase focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all"
                />
              </div>

              {/* Tipo + Valor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Tipo</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as 'percent' | 'fixed' })}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:border-primary/50 transition-all"
                  >
                    <option value="percent">Percentual (%)</option>
                    <option value="fixed">Fixo (R$)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                    Valor {form.type === 'percent' ? '(%)' : '(R$)'}
                  </label>
                  <input
                    type="number"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                    min={0.01}
                    max={form.type === 'percent' ? 100 : undefined}
                    step={0.01}
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all"
                  />
                </div>
              </div>

              {/* Pedido mínimo + Usos máximos */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Pedido mínimo (R$)</label>
                  <input
                    type="number"
                    value={form.min_order}
                    onChange={(e) => setForm({ ...form, min_order: Number(e.target.value) })}
                    min={0}
                    step={0.01}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Usos máximos</label>
                  <input
                    type="number"
                    value={form.max_uses ?? ''}
                    onChange={(e) => setForm({ ...form, max_uses: e.target.value ? Number(e.target.value) : null })}
                    min={1}
                    step={1}
                    placeholder="Ilimitado"
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all"
                  />
                </div>
              </div>

              {/* Validade */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Data de expiração</label>
                <input
                  type="date"
                  value={expiresInput}
                  onChange={(e) => setExpiresInput(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all"
                />
                <p className="text-xs text-muted-foreground mt-1">Deixe em branco para sem validade</p>
              </div>

              {/* Ativo */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">Cupom ativo</p>
                  <p className="text-xs text-muted-foreground">Clientes poderão usar este cupom no checkout</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, active: !form.active })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${form.active ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.active ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-muted-foreground text-sm font-medium hover:bg-muted transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingId ? 'Salvar' : 'Criar Cupom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
