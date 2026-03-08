import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2, X, Check, Loader2, ImagePlus, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  emoji: string;
  has_flavors: boolean;
  available_flavors: string[] | null;
  max_flavors: number | null;
  allow_duplicate_flavors: boolean;
  has_acomp: boolean;
  display_order: number;
  visible: boolean;
};

const CATEGORIES = ['Coxinhas', 'Salgados', 'Porções', 'Pastel', 'Bebidas'];

const emptyForm = (): Omit<Product, 'id'> => ({
  name: '',
  description: '',
  price: 0,
  image: '',
  category: 'Salgados',
  emoji: '🍽️',
  has_flavors: false,
  available_flavors: null,
  max_flavors: null,
  allow_duplicate_flavors: false,
  has_acomp: false,
  display_order: 0,
  visible: true,
});

export default function AdminProdutos() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [flavorsText, setFlavorsText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('display_order');
    setProducts(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const openNew = () => {
    setForm(emptyForm());
    setFlavorsText('');
    setImageFile(null);
    setImagePreview('');
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setForm({ ...p });
    setFlavorsText((p.available_flavors || []).join(', '));
    setImageFile(null);
    setImagePreview(p.image || '');
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let imageUrl = form.image;

      // Upload image file if selected
      if (imageFile) {
        setUploadingImage(true);
        imageUrl = await uploadImage(imageFile);
        setUploadingImage(false);
      }

      if (!imageUrl) {
        toast({ title: 'Adicione uma imagem ao produto', variant: 'destructive' });
        setSaving(false);
        return;
      }

      const flavors = flavorsText
        ? flavorsText.split(',').map(s => s.trim()).filter(Boolean)
        : null;

      const payload = {
        ...form,
        image: imageUrl,
        available_flavors: flavors,
        price: Number(form.price),
      };

      let error;
      if (editingId) {
        ({ error } = await supabase.from('products').update(payload).eq('id', editingId));
      } else {
        const id = form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
        ({ error } = await supabase.from('products').insert({ ...payload, id }));
      }

      if (error) {
        toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: editingId ? 'Produto atualizado!' : 'Produto criado!' });
        setShowForm(false);
        fetchProducts();
      }
    } catch (err: any) {
      toast({ title: 'Erro ao fazer upload da imagem', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir "${name}"?`)) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir', variant: 'destructive' });
    } else {
      toast({ title: 'Produto excluído' });
      fetchProducts();
    }
  };

  const toggleVisible = async (id: string, current: boolean) => {
    const { error } = await supabase.from('products').update({ visible: !current }).eq('id', id);
    if (!error) {
      setProducts(prev => prev.map(p => p.id === id ? { ...p, visible: !current } : p));
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header fixo */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-border bg-background sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Produtos</h1>
          <p className="text-muted-foreground text-sm">{products.length} produtos cadastrados</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" />
          Novo Produto
        </button>
      </div>

      {/* Tabela com scroll */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : products.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl text-center py-12 text-muted-foreground">
            Nenhum produto cadastrado ainda.
          </div>
        ) : (
          CATEGORIES.filter(cat => products.some(p => p.category === cat)).map(cat => {
            const group = products.filter(p => p.category === cat);
            return (
              <div key={cat} className="bg-card border border-border rounded-2xl overflow-hidden">
                {/* Category header */}
                <div className="px-4 py-2.5 bg-muted/50 border-b border-border flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">{cat}</span>
                  <span className="text-xs text-muted-foreground">({group.length})</span>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Produto</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Preço</th>
                      <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase hidden sm:table-cell">Disponível</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {group.map((p) => (
                      <tr key={p.id} className={`hover:bg-muted/30 transition-colors ${!p.visible ? 'bg-red-500/5' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {p.image ? (
                              <div className="relative flex-shrink-0">
                                <img src={p.image} alt={p.name} className={`w-10 h-10 rounded-lg object-cover ${!p.visible ? 'grayscale opacity-60' : ''}`} />
                                {!p.visible && (
                                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold px-1 rounded-full">
                                    Esgt
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className={`text-xl w-10 h-10 flex items-center justify-center ${!p.visible ? 'grayscale opacity-60' : ''}`}>{p.emoji}</span>
                            )}
                            <div>
                              <p className={`font-medium text-sm ${p.visible ? 'text-foreground' : 'text-muted-foreground line-through'}`}>{p.name}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1">{p.description}</p>
                              {!p.visible && (
                                <span className="inline-block mt-0.5 text-[10px] font-semibold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-full">
                                  Esgotado na loja
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-foreground">
                            {Number(p.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </td>
                        {/* Toggle Disponível/Esgotado */}
                        <td className="px-4 py-3 hidden sm:table-cell text-center">
                          <div className="flex flex-col items-center gap-1">
                            <button
                              onClick={() => toggleVisible(p.id, p.visible ?? true)}
                              title={p.visible ? 'Marcar como Esgotado' : 'Marcar como Disponível'}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                                p.visible ? 'bg-green-500' : 'bg-red-400'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                                  p.visible ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                            <span className={`text-[10px] font-semibold ${p.visible ? 'text-green-600' : 'text-red-500'}`}>
                              {p.visible ? 'Disponível' : 'Esgotado'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-end">
                            {/* Toggle mobile (só aparece em telas pequenas) */}
                            <button
                              onClick={() => toggleVisible(p.id, p.visible ?? true)}
                              title={p.visible ? 'Marcar como Esgotado' : 'Marcar como Disponível'}
                              className={`sm:hidden relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                                p.visible ? 'bg-green-500' : 'bg-red-400'
                              }`}
                            >
                              <span
                                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                                  p.visible ? 'translate-x-4' : 'translate-x-1'
                                }`}
                              />
                            </button>
                            <button onClick={() => openEdit(p)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                              <Pencil className="w-4 h-4 text-muted-foreground" />
                            </button>
                            <button onClick={() => handleDelete(p.id, p.name)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors">
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">
                {editingId ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Nome *</label>
                  <input
                    required value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Descrição *</label>
                <textarea
                  required value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Preço (R$) *</label>
                  <input
                    type="number" step="0.01" min="0" required value={form.price}
                    onChange={e => setForm({ ...form, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Categoria *</label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                  >
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Imagem do Produto *</label>
                  {/* Image Preview */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-full aspect-video rounded-xl border-2 border-dashed border-border bg-muted/30 hover:bg-muted/60 transition-all cursor-pointer overflow-hidden flex items-center justify-center"
                  >
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Upload className="w-6 h-6 text-white" />
                          <span className="text-white text-sm ml-2">Trocar imagem</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ImagePlus className="w-8 h-8" />
                        <span className="text-xs text-center">Clique para selecionar<br />JPG, PNG, WEBP</span>
                      </div>
                    )}
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                  {imageFile && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{imageFile.name}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Ordem de Exibição</label>
                  <input
                    type="number" value={form.display_order}
                    onChange={e => setForm({ ...form, display_order: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                  />
                </div>
              </div>

              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox" checked={form.has_acomp}
                    onChange={e => setForm({ ...form, has_acomp: e.target.checked })}
                    className="rounded accent-primary"
                  />
                  <span className="text-sm font-medium text-foreground">Aceita acompanhamentos?</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox" checked={form.has_flavors}
                    onChange={e => setForm({ ...form, has_flavors: e.target.checked })}
                    className="rounded accent-primary"
                  />
                  <span className="text-sm font-medium text-foreground">Tem opções de sabores?</span>
                </label>

                {form.has_flavors && (
                  <div className="space-y-3 pl-6">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Sabores disponíveis (separados por vírgula)</label>
                      <input
                        value={flavorsText}
                        onChange={e => setFlavorsText(e.target.value)}
                        placeholder="Frango, Queijo, Carne..."
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Máximo de sabores</label>
                      <input
                        type="number" min="1" value={form.max_flavors || ''}
                        onChange={e => setForm({ ...form, max_flavors: e.target.value ? Number(e.target.value) : null })}
                        className="w-32 px-3 py-2 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox" checked={form.allow_duplicate_flavors}
                        onChange={e => setForm({ ...form, allow_duplicate_flavors: e.target.checked })}
                        className="rounded accent-primary"
                      />
                      <span className="text-sm text-foreground">Permitir sabores repetidos?</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
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
