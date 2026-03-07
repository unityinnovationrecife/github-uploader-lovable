import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2, X, Check, Loader2, GripVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Acomp = { id: number; name: string; display_order: number };

export default function AdminAcompanhamentos() {
  const [items, setItems] = useState<Acomp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [order, setOrder] = useState(0);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchItems = async () => {
    const { data } = await supabase.from('acompanhamentos').select('*').order('display_order');
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const openNew = () => {
    setName('');
    setOrder(items.length);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (item: Acomp) => {
    setName(item.name);
    setOrder(item.display_order);
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    let error;
    if (editingId !== null) {
      ({ error } = await supabase.from('acompanhamentos').update({ name, display_order: order }).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('acompanhamentos').insert({ name, display_order: order }));
    }

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: editingId !== null ? 'Atualizado!' : 'Criado!' });
      setShowForm(false);
      fetchItems();
    }
    setSaving(false);
  };

  const handleDelete = async (id: number, itemName: string) => {
    if (!confirm(`Excluir "${itemName}"?`)) return;
    const { error } = await supabase.from('acompanhamentos').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir', variant: 'destructive' });
    } else {
      toast({ title: 'Excluído!' });
      fetchItems();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header fixo */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-border bg-background sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Acompanhamentos</h1>
          <p className="text-muted-foreground text-sm">{items.length} acompanhamentos</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" />
          Novo
        </button>
      </div>

      {/* Lista com scroll */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">Nenhum acompanhamento ainda.</div>
            ) : (
              <div className="divide-y divide-border">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <GripVertical className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Ordem: {item.display_order}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(item)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button onClick={() => handleDelete(item.id, item.name)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-bold text-foreground">
                {editingId !== null ? 'Editar' : 'Novo'} Acompanhamento
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Nome *</label>
                <input
                  required value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Molho especial"
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Ordem de Exibição</label>
                <input
                  type="number" value={order}
                  onChange={e => setOrder(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition-all text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 transition-all text-sm"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
