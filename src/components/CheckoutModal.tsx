import { X, Send, MapPin, User, CreditCard, Home, ChevronRight, ShoppingBag, ArrowLeft, Trash2, Banknote, QrCode, Phone, MessageSquare, Clock, AlertCircle, Tag, CheckCircle2, Loader2 } from 'lucide-react';
import { useCartStore } from '@/store/cart-store';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useDeliveryZones, useStoreHours, getStoreStatusFromHours } from '@/hooks/use-store-settings';

type Step = 1 | 2;

type AppliedCoupon = {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  discountAmount: number;
};

export default function CheckoutModal() {
  const { items, isCheckoutOpen, closeCheckout, getTotalPrice, clearCart, removeItem } = useCartStore();
  const navigate = useNavigate();
  const { zones, loading: zonesLoading } = useDeliveryZones();
  const { hours, loading: hoursLoading } = useStoreHours();

  const [step, setStep] = useState<Step>(1);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [rua, setRua] = useState('');
  const [numero, setNumero] = useState('');
  const [referencia, setReferencia] = useState('');
  const [pagamento, setPagamento] = useState('');
  const [zoneKey, setZoneKey] = useState('');
  const [troco, setTroco] = useState('');
  const [mounted, setMounted] = useState(false);

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  const selectedZone = zones.find(z => z.key === zoneKey);
  const isResidence = zoneKey === 'residence';

  const endereco = isResidence
    ? [rua, numero].filter(Boolean).join(', ')
    : [rua, numero, referencia].filter(Boolean).join(', ');

  useEffect(() => { setMounted(true); }, []);

  // Reset to step 1 when modal opens
  useEffect(() => {
    if (isCheckoutOpen) { setStep(1); }
  }, [isCheckoutOpen]);

  if (!mounted) return null;

  const storeStatus = !hoursLoading ? getStoreStatusFromHours(hours) : null;
  const isStoreClosed = storeStatus !== null && !storeStatus.isOpen;

  const formatPrice = (price: number) =>
    price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const deliveryFee = selectedZone?.fee ?? 0;
  const subtotal = getTotalPrice();
  const discountAmount = appliedCoupon?.discountAmount ?? 0;
  const finalTotal = Math.max(0, subtotal - discountAmount) + deliveryFee;

  const validateCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setCouponError('');

    const { data, error } = await supabase
      .from('coupons' as any)
      .select('*')
      .eq('code', code)
      .eq('active', true)
      .maybeSingle();

    setCouponLoading(false);

    if (error || !data) {
      setCouponError('Cupom inválido ou inativo.');
      return;
    }

    const coupon = data as any;

    // Check expiry
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      setCouponError('Este cupom expirou.');
      return;
    }

    // Check max uses
    if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
      setCouponError('Este cupom atingiu o limite de usos.');
      return;
    }

    // Check min order
    if (coupon.min_order > 0 && subtotal < coupon.min_order) {
      setCouponError(`Pedido mínimo de ${formatPrice(coupon.min_order)} para este cupom.`);
      return;
    }

    const discountAmount = coupon.type === 'percent'
      ? Math.min(subtotal, (subtotal * coupon.value) / 100)
      : Math.min(subtotal, coupon.value);

    setAppliedCoupon({
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discountAmount,
    });
    setCouponInput('');
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneKey) { alert('Por favor, selecione seu bairro/condomínio para entrega.'); return; }

    // Build notes: merge observações + troco
    let notasFinal = observacoes.trim();
    if (pagamento === 'Dinheiro' && troco.trim()) {
      const trocoNote = `Troco para: ${troco.trim()}`;
      notasFinal = notasFinal ? `${notasFinal} | ${trocoNote}` : trocoNote;
    }

    let savedOrderId: string | null = null;

    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: nome,
          customer_phone: telefone || null,
          delivery_zone: zoneKey,
          delivery_zone_name: selectedZone?.name ?? zoneKey,
          address: endereco,
          payment_method: pagamento,
          subtotal,
          delivery_fee: deliveryFee,
          total: finalTotal,
          notes: notasFinal || null,
        } as any)
        .select('id')
        .single();

      if (!orderError && orderData) {
        savedOrderId = orderData.id;
        const orderItems = items.map((item) => ({
          order_id: orderData.id,
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          selected_flavors: item.selectedFlavors || [],
          selected_acomp: item.selectedAcomp || [],
        }));
        await supabase.from('order_items').insert(orderItems);

        // Increment coupon uses_count
        if (appliedCoupon) {
          await supabase
            .from('coupons' as any)
            .update({ uses_count: (appliedCoupon as any).uses_count_raw + 1 } as any)
            .eq('id', appliedCoupon.id);
        }
      }
    } catch (error) {
      console.error('Erro ao salvar pedido:', error);
    }

    const now = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    const totalItems = items.reduce((acc, i) => acc + i.quantity, 0);
    const zoneName = selectedZone?.name ?? zoneKey;

    // ── Mensagem para o lojista ──
    const ownerLines: string[] = [];
    ownerLines.push('🍢 *NOVO PEDIDO — G&S SALGADOS* 🍢');
    ownerLines.push(`🕐 ${now}`);
    ownerLines.push('━━━━━━━━━━━━━━━━━━━━━━━');
    ownerLines.push('');
    ownerLines.push(`🛒 *ITENS DO PEDIDO* (${totalItems} ${totalItems === 1 ? 'item' : 'itens'})`);
    ownerLines.push('');
    items.forEach((item, idx) => {
      ownerLines.push(`${idx + 1}. *${item.name}*`);
      ownerLines.push(`   📦 Qtd: ${item.quantity}x  |  💰 ${formatPrice(item.price * item.quantity)}`);
      if (item.selectedFlavors?.length) ownerLines.push(`   🍽️ Sabores: ${item.selectedFlavors.join(', ')}`);
      if (item.selectedAcomp?.length)   ownerLines.push(`   🥗 Acomp: ${item.selectedAcomp.join(', ')}`);
    });
    ownerLines.push('');
    ownerLines.push('━━━━━━━━━━━━━━━━━━━━━━━');
    ownerLines.push(`💵 Subtotal: ${formatPrice(subtotal)}`);
    if (deliveryFee > 0) {
      ownerLines.push(`🛵 Entrega (${zoneName}): ${formatPrice(deliveryFee)}`);
    } else {
      ownerLines.push(`🛵 Entrega (${zoneName}): *Grátis* ✅`);
    }
    ownerLines.push(`💳 Pagamento: ${pagamento}`);
    if (pagamento === 'Dinheiro' && troco.trim()) ownerLines.push(`💵 Troco para: ${troco.trim()}`);
    ownerLines.push('');
    ownerLines.push(`✅ *TOTAL: ${formatPrice(finalTotal)}*`);
    ownerLines.push('━━━━━━━━━━━━━━━━━━━━━━━');
    ownerLines.push('');
    ownerLines.push('📍 *DADOS DE ENTREGA*');
    ownerLines.push(`👤 Cliente: ${nome}`);
    if (telefone) ownerLines.push(`📱 Telefone: ${telefone}`);
    ownerLines.push(`🏠 Endereço: ${endereco}`);
    ownerLines.push(`📌 Bairro: ${zoneName}`);
    if (notasFinal) {
      ownerLines.push('');
      ownerLines.push(`📝 *Observações:* ${notasFinal}`);
    }
    ownerLines.push('');
    ownerLines.push('_Pedido gerado automaticamente pelo site_ 🤖');

    // ── Mensagem de confirmação para o cliente ──
    const clientLines: string[] = [];
    clientLines.push(`Olá, *${nome}*! 👋`);
    clientLines.push('');
    clientLines.push('✅ *Seu pedido foi recebido com sucesso!*');
    clientLines.push('🍢 *G&S SALGADOS*');
    clientLines.push('━━━━━━━━━━━━━━━━━━━━━━━');
    clientLines.push('');
    items.forEach((item, idx) => {
      clientLines.push(`${idx + 1}. ${item.quantity}x ${item.name} — ${formatPrice(item.price * item.quantity)}`);
      if (item.selectedFlavors?.length) clientLines.push(`   🍽️ ${item.selectedFlavors.join(', ')}`);
    });
    clientLines.push('');
    clientLines.push(`💰 *Total: ${formatPrice(finalTotal)}*`);
    if (deliveryFee === 0) clientLines.push('🛵 Entrega: *Grátis* ✅');
    clientLines.push(`💳 Pagamento: ${pagamento}`);
    if (pagamento === 'Dinheiro' && troco.trim()) clientLines.push(`💵 Troco para: ${troco.trim()}`);
    if (notasFinal) clientLines.push(`📝 Obs: ${notasFinal}`);
    clientLines.push('━━━━━━━━━━━━━━━━━━━━━━━');
    clientLines.push('');
    clientLines.push('Em breve entraremos em contato para confirmar. Obrigado! 😊');

    const message = ownerLines.join('\n');
    const customerMessage = clientLines.join('\n');

    // Enviar via Evolution API
    const { error: fnError } = await supabase.functions.invoke('send-whatsapp', {
      body: {
        message,
        customerPhone: telefone || undefined,
        customerMessage: telefone ? customerMessage : undefined,
      },
    });

    if (fnError) {
      console.warn('Evolution API falhou, abrindo WhatsApp manualmente:', fnError);
      window.open(`https://wa.me/5581992429014?text=${encodeURIComponent(message)}`, '_blank');
    }

    clearCart();
    closeCheckout();
    setNome(''); setTelefone(''); setRua(''); setNumero(''); setReferencia(''); setPagamento(''); setZoneKey(''); setObservacoes(''); setTroco('');

    if (savedOrderId) {
      navigate(`/pedido/${savedOrderId}`);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isCheckoutOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={closeCheckout}
      />

      {/* Modal */}
      <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-all duration-300 ${isCheckoutOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div
          className={`w-full max-w-lg max-h-[90vh] bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl overflow-hidden transform transition-all duration-300 flex flex-col ${isCheckoutOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)] flex-shrink-0">
            <div className="flex items-center gap-3">
              {step === 2 && (
                <button
                  onClick={() => setStep(1)}
                  className="p-1.5 rounded-lg bg-[var(--bg-primary)] hover:opacity-80 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 text-[var(--text-muted)]" />
                </button>
              )}
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  {step === 1 ? 'Resumo do Pedido' : 'Dados de Entrega'}
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  {step === 1 ? 'Confira seus itens antes de continuar' : 'Preencha seus dados para enviar via WhatsApp'}
                </p>
              </div>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full transition-colors ${step === 1 ? 'bg-orange-500' : 'bg-orange-500/30'}`} />
                <div className={`w-2 h-2 rounded-full transition-colors ${step === 2 ? 'bg-orange-500' : 'bg-orange-500/30'}`} />
              </div>
              <button
                onClick={closeCheckout}
                className="p-2 rounded-xl bg-[var(--bg-primary)] hover:opacity-80 transition-colors"
              >
                <X className="w-5 h-5 text-[var(--text-muted)]" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1">

            {/* ── STORE CLOSED BANNER ── */}
            {isStoreClosed && (
              <div className="mx-5 mt-5 bg-red-500/10 border border-red-500/30 rounded-2xl p-5 flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-red-500/15 flex items-center justify-center">
                  <Clock className="w-7 h-7 text-red-500" />
                </div>
                <div>
                  <p className="font-bold text-[var(--text-primary)] text-base">Estamos fechados no momento</p>
                  <p className="text-sm text-[var(--text-muted)] mt-1">Não é possível realizar pedidos fora do horário de funcionamento.</p>
                </div>
                <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 w-full">
                  <div className="flex items-center gap-2 justify-center">
                    <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    <p className="text-sm font-medium text-[var(--text-primary)]">{storeStatus?.hours}</p>
                  </div>
                </div>
                <button
                  onClick={closeCheckout}
                  className="w-full py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] font-medium text-sm hover:opacity-80 transition-all"
                >
                  Voltar ao cardápio
                </button>
              </div>
            )}

            {/* ── STEP 1: Order Summary ── */}
            {!isStoreClosed && step === 1 && (
              <div className="p-5 space-y-4">
                {/* Items */}
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="relative flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
                      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{item.name}</p>
                          <p className="text-sm font-bold text-orange-500 flex-shrink-0">{formatPrice(item.price * item.quantity)}</p>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{item.quantity}x {formatPrice(item.price)}</p>
                        {item.selectedFlavors?.length ? (
                          <p className="text-[11px] text-orange-500/80 mt-0.5">{item.selectedFlavors.join(', ')}</p>
                        ) : null}
                        {item.selectedAcomp?.length ? (
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">+ {item.selectedAcomp.join(', ')}</p>
                        ) : null}
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="absolute bottom-2 right-2 p-1 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        aria-label="Remover item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">
                      <ShoppingBag className="w-4 h-4 inline mr-1.5 opacity-60" />
                      {items.reduce((acc, i) => acc + i.quantity, 0)} itens
                    </span>
                    <span className="text-[var(--text-muted)] font-medium">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
                    <span>Taxa de entrega</span>
                    <span className="text-xs italic">calculada no próximo passo</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
                    <span className="font-bold text-[var(--text-primary)]">Subtotal</span>
                    <span className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">{formatPrice(subtotal)}</span>
                  </div>
                </div>

                {/* Continue button */}
                {items.length === 0 ? (
                  <button
                    onClick={() => { closeCheckout(); document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }); }}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-base shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                  >
                    <ShoppingBag className="w-5 h-5" />
                    Ver Cardápio
                  </button>
                ) : (
                  <button
                    onClick={() => setStep(2)}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-base shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                  >
                    Continuar
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            {/* ── STEP 2: Delivery + Payment ── */}
            {!isStoreClosed && step === 2 && (
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {/* Nome */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] mb-2">
                    <User className="w-4 h-4" />
                    Nome
                  </label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                    placeholder="Seu nome completo"
                    className="w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/25 transition-all"
                  />
                </div>

                {/* Telefone (opcional — para confirmação via WhatsApp) */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] mb-2">
                    <Phone className="w-4 h-4" />
                    WhatsApp <span className="text-xs font-normal opacity-60">(opcional — receba confirmação)</span>
                  </label>
                  <input
                    type="tel"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(81) 9 9999-9999"
                    className="w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/25 transition-all"
                  />
                </div>

                {/* Bairro */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] mb-2">
                    <Home className="w-4 h-4" />
                    Bairro / Condomínio de Entrega
                  </label>
                  <div className="space-y-2">
                    {zonesLoading ? (
                      <div className="text-sm text-[var(--text-muted)] italic py-2">Carregando zonas...</div>
                    ) : zones.map(zone => (
                      <label
                        key={zone.key}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${zoneKey === zone.key ? 'border-orange-500 bg-orange-500/10' : 'border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-orange-500/30'}`}
                      >
                        <input
                          type="radio"
                          name="zone"
                          value={zone.key}
                          checked={zoneKey === zone.key}
                          onChange={() => setZoneKey(zone.key)}
                          className="w-4 h-4 accent-orange-500"
                          required
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[var(--text-primary)]">{zone.name}</p>
                          <p className={`text-xs font-medium ${zone.fee === 0 ? 'text-green-500' : 'text-[var(--text-secondary)]'}`}>
                            {zone.fee === 0 ? 'Entrega Grátis' : `Taxa: ${zone.fee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-orange-500/80 mt-2 italic">⚠️ Entregas apenas nas localidades acima.</p>
                </div>

                {/* Endereço */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] mb-2">
                    <MapPin className="w-4 h-4" />
                    {isResidence ? 'Bloco e Apartamento' : 'Endereço'}
                  </label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={rua}
                        onChange={(e) => setRua(e.target.value)}
                        required
                        placeholder={isResidence ? 'Bloco' : 'Rua'}
                        disabled={!zoneKey}
                        className="w-[70%] px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <input
                        type="text"
                        value={numero}
                        onChange={(e) => setNumero(e.target.value)}
                        required
                        placeholder={isResidence ? 'Apto' : 'Nº'}
                        disabled={!zoneKey}
                        className="w-[30%] px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                    {!isResidence && (
                      <input
                        type="text"
                        value={referencia}
                        onChange={(e) => setReferencia(e.target.value)}
                        placeholder="Referência (opcional)"
                        disabled={!zoneKey}
                        className="w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    )}
                  </div>
                </div>

                {/* Pagamento */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] mb-2">
                    <CreditCard className="w-4 h-4" />
                    Forma de Pagamento
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'PIX', label: 'PIX', icon: <QrCode className="w-4 h-4" /> },
                      { value: 'Dinheiro', label: 'Dinheiro', icon: <Banknote className="w-4 h-4" /> },
                      { value: 'Cartão de Crédito', label: 'Crédito', icon: <CreditCard className="w-4 h-4" /> },
                      { value: 'Cartão de Débito', label: 'Débito', icon: <CreditCard className="w-4 h-4" /> },
                    ].map(({ value, label, icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => { setPagamento(value); if (value !== 'Dinheiro') setTroco(''); }}
                        className={`flex items-center gap-2 px-3 py-3 rounded-xl border transition-all text-sm font-medium ${pagamento === value ? 'border-orange-500 bg-orange-500/10 text-orange-500' : 'border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] hover:border-orange-500/40'}`}
                      >
                        {icon}
                        {label}
                      </button>
                    ))}
                  </div>
                  <input type="hidden" value={pagamento} required />
                </div>

                {/* Troco — apenas para Dinheiro */}
                {pagamento === 'Dinheiro' && (
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] mb-2">
                      <Banknote className="w-4 h-4" />
                      Troco para quanto? <span className="text-xs font-normal opacity-60">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={troco}
                      onChange={(e) => setTroco(e.target.value)}
                      placeholder="Ex: R$ 50,00 · ou deixe vazio se não precisar"
                      className="w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/25 transition-all"
                    />
                  </div>
                )}

                {/* Observações */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] mb-2">
                    <MessageSquare className="w-4 h-4" />
                    Observações <span className="text-xs font-normal opacity-60">(opcional)</span>
                  </label>
                  <textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    maxLength={300}
                    rows={3}
                    placeholder="Ex: Ponto de referência, instruções especiais de entrega, preferências..."
                    className="w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/25 transition-all resize-none text-sm"
                  />
                  <p className="text-xs text-[var(--text-muted)] mt-1 text-right">{observacoes.length}/300</p>
                </div>

                {zoneKey && (
                  <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-4 space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">Subtotal</span>
                      <span className="text-[var(--text-muted)] font-medium">{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">Taxa de entrega</span>
                      <span className={deliveryFee === 0 ? 'text-green-500 font-medium' : 'text-[var(--text-muted)] font-medium'}>
                        {deliveryFee === 0 ? 'Grátis' : formatPrice(deliveryFee)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
                      <span className="font-bold text-[var(--text-primary)]">Total</span>
                      <span className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">{formatPrice(finalTotal)}</span>
                    </div>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-base shadow-xl shadow-green-500/25 hover:shadow-green-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                >
                  <Send className="w-5 h-5" />
                  Enviar Pedido ({formatPrice(finalTotal)})
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
