import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  MapPin, Clock, Plus, Trash2, Save, GripVertical, Loader2, Settings,
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

function GeneralTab() {
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from('store_settings' as never)
      .select('value')
      .eq('key', 'whatsapp_number')
      .maybeSingle()
      .then(({ data }: { data: { value: string } | null }) => {
        if (data?.value) setWhatsapp(data.value);
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    if (!whatsapp.trim()) { toast.error('Número obrigatório'); return; }
    setSaving(true);
    const { error } = await (supabase as ReturnType<typeof supabase.from> extends never ? never : typeof supabase)
      .from('store_settings' as never)
      .upsert({ key: 'whatsapp_number', value: whatsapp.trim() }, { onConflict: 'key' });
    setSaving(false);
    if (error) { toast.error('Erro ao salvar'); return; }
    toast.success('Número salvo com sucesso!');
  }

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
          Número exibido no botão flutuante da loja. Use o formato internacional sem espaços ou símbolos (ex: 5581999999999).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="whatsapp-number">Número do WhatsApp</Label>
          <div className="flex gap-2">
            <Input
              id="whatsapp-number"
              value={whatsapp}
              onChange={e => setWhatsapp(e.target.value)}
              placeholder="5581999999999"
              maxLength={20}
            />
            <Button onClick={handleSave} disabled={saving} className="flex-shrink-0">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span className="ml-1">Salvar</span>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Código do país + DDD + número (55 = Brasil)
          </p>
        </div>

        <div className="rounded-lg bg-muted/50 border border-border p-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Preview do link: </span>
          <span className="font-mono text-xs break-all">
            wa.me/{whatsapp || '5581999999999'}
          </span>
        </div>
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
          Gerencie zonas de entrega, taxas de frete e horários de funcionamento
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <Tabs defaultValue="zones" className="space-y-6">
          <TabsList className="grid grid-cols-2 w-full max-w-sm">
            <TabsTrigger value="zones" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Zonas de Entrega
            </TabsTrigger>
            <TabsTrigger value="hours" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Horários
            </TabsTrigger>
          </TabsList>

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
