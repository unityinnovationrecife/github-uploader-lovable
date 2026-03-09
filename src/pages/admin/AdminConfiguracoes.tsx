import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  MapPin, Clock, Plus, Trash2, Save, GripVertical, Loader2, Settings, Palette,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DeliveryZone {
  id: string;
  key: string;
  name: string;
  fee: number;
  display_order: number;
  active: boolean;
}

interface StoreHour {
  id: string;
  day_type: string;
  label: string;
  open_hour: number;
  open_minute: number;
  close_hour: number;
  close_minute: number;
  active: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const pad2 = (n: number) => String(n).padStart(2, '0');
const toTimeString = (h: number, m: number) => `${pad2(h)}:${pad2(m)}`;
const fromTimeString = (t: string): [number, number] => {
  const [h, m] = t.split(':').map(Number);
  return [h || 0, m || 0];
};

// ─── Geral ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const DEFAULT_MESSAGE = 'Olá! Vim pelo cardápio online e gostaria de mais informações.';

// ─── Aparência ────────────────────────────────────────────────────────────────

const DEFAULT_STORE_NAME = 'G & S Salgados';
const DEFAULT_STORE_SLOGAN = 'O melhor sabor da cidade';

function AppearanceTab() {
  const [storeName, setStoreName] = useState('');
  const [storeSlogan, setStoreSlogan] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    db.from('store_settings')
      .select('key, value')
      .in('key', ['store_name', 'store_slogan'])
      .then(({ data }: { data: { key: string; value: string }[] | null }) => {
        if (data) {
          const name = data.find((r: { key: string }) => r.key === 'store_name');
          const slogan = data.find((r: { key: string }) => r.key === 'store_slogan');
          setStoreName(name?.value ?? DEFAULT_STORE_NAME);
          setStoreSlogan(slogan?.value ?? DEFAULT_STORE_SLOGAN);
        } else {
          setStoreName(DEFAULT_STORE_NAME);
          setStoreSlogan(DEFAULT_STORE_SLOGAN);
        }
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    if (!storeName.trim()) { toast.error('Nome da loja obrigatório'); return; }
    setSaving(true);
    const { error } = await db
      .from('store_settings')
      .upsert(
        [
          { key: 'store_name', value: storeName.trim() },
          { key: 'store_slogan', value: storeSlogan.trim() || DEFAULT_STORE_SLOGAN },
        ],
        { onConflict: 'key' },
      );
    setSaving(false);
    if (error) { toast.error('Erro ao salvar'); return; }
    toast.success('Aparência atualizada!');
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="text-base">Identidade da Loja</CardTitle>
        <CardDescription>
          Nome e slogan exibidos no cabeçalho da loja para os clientes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Nome */}
        <div className="space-y-1.5">
          <Label htmlFor="store-name">Nome da loja</Label>
          <Input
            id="store-name"
            value={storeName}
            onChange={e => setStoreName(e.target.value)}
            placeholder={DEFAULT_STORE_NAME}
            maxLength={60}
          />
          <p className="text-xs text-muted-foreground">
            Aparece ao lado do logo no cabeçalho (visível em telas maiores).
          </p>
        </div>

        {/* Slogan */}
        <div className="space-y-1.5">
          <Label htmlFor="store-slogan">Slogan</Label>
          <Input
            id="store-slogan"
            value={storeSlogan}
            onChange={e => setStoreSlogan(e.target.value)}
            placeholder={DEFAULT_STORE_SLOGAN}
            maxLength={80}
          />
          <p className="text-xs text-muted-foreground">
            Frase curta exibida abaixo do nome da loja.
          </p>
        </div>

        {/* Preview */}
        <div className="rounded-lg bg-muted/50 border border-border p-4 space-y-0.5">
          <p className="text-xs font-medium text-muted-foreground mb-2">Preview no cabeçalho</p>
          <p className="text-sm font-bold text-foreground leading-none">
            {storeName || DEFAULT_STORE_NAME}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {storeSlogan || DEFAULT_STORE_SLOGAN}
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar aparência
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Geral ───────────────────────────────────────────────────────────────────

function GeneralTab() {
  const [whatsapp, setWhatsapp] = useState('');
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    db.from('store_settings')
      .select('key, value')
      .in('key', ['whatsapp_number', 'whatsapp_message'])
      .then(({ data }: { data: { key: string; value: string }[] | null }) => {
        if (data) {
          const num = data.find(r => r.key === 'whatsapp_number');
          const msg = data.find(r => r.key === 'whatsapp_message');
          if (num?.value) setWhatsapp(num.value);
          if (msg?.value) setMessage(msg.value);
        }
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    if (!whatsapp.trim()) { toast.error('Número obrigatório'); return; }
    setSaving(true);
    const { error } = await db
      .from('store_settings')
      .upsert(
        [
          { key: 'whatsapp_number', value: whatsapp.trim() },
          { key: 'whatsapp_message', value: message.trim() || DEFAULT_MESSAGE },
        ],
        { onConflict: 'key' },
      );
    setSaving(false);
    if (error) { toast.error('Erro ao salvar'); return; }
    toast.success('Configurações salvas!');
  }

  const previewLink = `wa.me/${whatsapp || '5581999999999'}?text=${encodeURIComponent(message || DEFAULT_MESSAGE)}`;

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="text-base">Botão de WhatsApp</CardTitle>
        <CardDescription>
          Configure o número e a mensagem pré-preenchida do botão flutuante na loja.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Número */}
        <div className="space-y-1.5">
          <Label htmlFor="whatsapp-number">Número do WhatsApp</Label>
          <Input
            id="whatsapp-number"
            value={whatsapp}
            onChange={e => setWhatsapp(e.target.value)}
            placeholder="5581999999999"
            maxLength={20}
          />
          <p className="text-xs text-muted-foreground">
            Formato internacional sem espaços: código do país + DDD + número (ex: 5581999999999)
          </p>
        </div>

        {/* Mensagem */}
        <div className="space-y-1.5">
          <Label htmlFor="whatsapp-message">Mensagem pré-preenchida</Label>
          <Textarea
            id="whatsapp-message"
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={3}
            maxLength={300}
            placeholder={DEFAULT_MESSAGE}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground text-right">
            {message.length}/300 caracteres
          </p>
        </div>

        {/* Preview */}
        <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-1">
          <p className="text-xs font-medium text-foreground">Preview do link</p>
          <p className="font-mono text-[11px] text-muted-foreground break-all leading-relaxed">
            {previewLink}
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar configurações
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Zonas de Entrega ─────────────────────────────────────────────────────────

function DeliveryZonesTab() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newZone, setNewZone] = useState({ name: '', fee: '' });

  useEffect(() => { fetchZones(); }, []);

  async function fetchZones() {
    setLoading(true);
    const { data } = await supabase
      .from('delivery_zones')
      .select('*')
      .order('display_order');
    if (data) setZones(data as DeliveryZone[]);
    setLoading(false);
  }

  async function handleSave(zone: DeliveryZone) {
    setSaving(zone.id);
    const { error } = await supabase
      .from('delivery_zones')
      .update({
        name: zone.name,
        fee: zone.fee,
        active: zone.active,
      })
      .eq('id', zone.id);
    setSaving(null);
    if (error) { toast.error('Erro ao salvar zona'); return; }
    toast.success('Zona salva com sucesso!');
  }

  async function handleToggleActive(zone: DeliveryZone) {
    const updated = { ...zone, active: !zone.active };
    setZones(prev => prev.map(z => z.id === zone.id ? updated : z));
    await supabase.from('delivery_zones').update({ active: updated.active }).eq('id', zone.id);
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover esta zona de entrega?')) return;
    const { error } = await supabase.from('delivery_zones').delete().eq('id', id);
    if (error) { toast.error('Erro ao remover zona'); return; }
    setZones(prev => prev.filter(z => z.id !== id));
    toast.success('Zona removida.');
  }

  async function handleAdd() {
    if (!newZone.name.trim()) { toast.error('Nome obrigatório'); return; }
    const fee = parseFloat(newZone.fee) || 0;
    const key = newZone.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const maxOrder = zones.reduce((m, z) => Math.max(m, z.display_order), 0);
    const { data, error } = await supabase
      .from('delivery_zones')
      .insert({ key, name: newZone.name.trim(), fee, display_order: maxOrder + 1 })
      .select()
      .single();
    if (error) { toast.error('Erro ao adicionar zona'); return; }
    setZones(prev => [...prev, data as DeliveryZone]);
    setNewZone({ name: '', fee: '' });
    setAdding(false);
    toast.success('Zona adicionada!');
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-4">
      {zones.map(zone => (
        <Card key={zone.id} className={`transition-opacity ${zone.active ? '' : 'opacity-60'}`}>
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <GripVertical className="w-4 h-4 text-muted-foreground mt-3 flex-shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Nome da Zona</Label>
                    <Input
                      value={zone.name}
                      onChange={e => setZones(prev => prev.map(z => z.id === zone.id ? { ...z, name: e.target.value } : z))}
                      placeholder="Ex: Bairro Central"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Taxa de Entrega (R$)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.50"
                      value={zone.fee}
                      onChange={e => setZones(prev => prev.map(z => z.id === zone.id ? { ...z, fee: parseFloat(e.target.value) || 0 } : z))}
                      placeholder="0,00"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={zone.active}
                      onCheckedChange={() => handleToggleActive(zone)}
                    />
                    <span className="text-sm text-muted-foreground">
                      {zone.active ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(zone.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSave(zone)}
                      disabled={saving === zone.id}
                    >
                      {saving === zone.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span className="ml-1">Salvar</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Add Zone */}
      {adding ? (
        <Card className="border-dashed border-primary/40">
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm font-medium">Nova Zona de Entrega</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Nome</Label>
                <Input
                  value={newZone.name}
                  onChange={e => setNewZone(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Centro, Bairro X"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Taxa (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.50"
                  value={newZone.fee}
                  onChange={e => setNewZone(p => ({ ...p, fee: e.target.value }))}
                  placeholder="0,00 = Grátis"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" onClick={handleAdd}>
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewZone({ name: '', fee: '' }); }}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" className="w-full border-dashed" onClick={() => setAdding(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Zona de Entrega
        </Button>
      )}
    </div>
  );
}

// ─── Horários ─────────────────────────────────────────────────────────────────

function StoreHoursTab() {
  const [hours, setHours] = useState<StoreHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => { fetchHours(); }, []);

  async function fetchHours() {
    setLoading(true);
    const { data } = await supabase.from('store_hours').select('*').order('day_type');
    if (data) setHours(data as StoreHour[]);
    setLoading(false);
  }

  function updateField(id: string, field: keyof StoreHour, value: unknown) {
    setHours(prev => prev.map(h => h.id === id ? { ...h, [field]: value } : h));
  }

  async function handleSave(hour: StoreHour) {
    setSaving(hour.id);
    const { error } = await supabase
      .from('store_hours')
      .update({
        label: hour.label,
        open_hour: hour.open_hour,
        open_minute: hour.open_minute,
        close_hour: hour.close_hour,
        close_minute: hour.close_minute,
        active: hour.active,
      })
      .eq('id', hour.id);
    setSaving(null);
    if (error) { toast.error('Erro ao salvar horário'); return; }
    toast.success('Horário salvo com sucesso!');
  }

  const dayLabel: Record<string, string> = {
    weekday: '📅 Dias de Semana',
    weekend: '🎉 Final de Semana',
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-4">
      {hours.map(hour => (
        <Card key={hour.id} className={`transition-opacity ${hour.active ? '' : 'opacity-60'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{dayLabel[hour.day_type] || hour.day_type}</CardTitle>
            <CardDescription>
              Ex: "Seg a Sex" ou "Sáb e Dom" — como aparece no cabeçalho
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Rótulo de exibição</Label>
              <Input
                value={hour.label}
                onChange={e => updateField(hour.id, 'label', e.target.value)}
                placeholder="Seg a Sex"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Abre às</Label>
                <Input
                  type="time"
                  value={toTimeString(hour.open_hour, hour.open_minute)}
                  onChange={e => {
                    const [h, m] = fromTimeString(e.target.value);
                    setHours(prev => prev.map(x => x.id === hour.id ? { ...x, open_hour: h, open_minute: m } : x));
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Fecha às</Label>
                <Input
                  type="time"
                  value={toTimeString(hour.close_hour, hour.close_minute)}
                  onChange={e => {
                    const [h, m] = fromTimeString(e.target.value);
                    setHours(prev => prev.map(x => x.id === hour.id ? { ...x, close_hour: h, close_minute: m } : x));
                  }}
                />
                {hour.close_hour === 0 && hour.close_minute === 0 && (
                  <p className="text-[11px] text-amber-500">00:00 = meia-noite</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <Switch
                  checked={hour.active}
                  onCheckedChange={v => updateField(hour.id, 'active', v)}
                />
                <span className="text-sm text-muted-foreground">
                  {hour.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <Button
                size="sm"
                onClick={() => handleSave(hour)}
                disabled={saving === hour.id}
              >
                {saving === hour.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span className="ml-1">Salvar</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminConfiguracoes() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-border bg-card">
        <h1 className="text-xl font-bold text-foreground">Configurações da Loja</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gerencie configurações gerais, zonas de entrega e horários de funcionamento
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <Tabs defaultValue="appearance" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-xl">
            <TabsTrigger value="appearance" className="flex items-center gap-1.5">
              <Palette className="w-4 h-4" />
              Aparência
            </TabsTrigger>
            <TabsTrigger value="general" className="flex items-center gap-1.5">
              <Settings className="w-4 h-4" />
              Geral
            </TabsTrigger>
            <TabsTrigger value="zones" className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              Zonas
            </TabsTrigger>
            <TabsTrigger value="hours" className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              Horários
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appearance">
            <AppearanceTab />
          </TabsContent>

          <TabsContent value="general">
            <GeneralTab />
          </TabsContent>

          <TabsContent value="zones" className="max-w-2xl">
            <DeliveryZonesTab />
          </TabsContent>

          <TabsContent value="hours" className="max-w-2xl">
            <StoreHoursTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
