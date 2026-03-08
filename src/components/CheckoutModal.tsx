import { X, Send, MapPin, User, CreditCard, Home, ChevronRight, ShoppingBag, ArrowLeft, Trash2, Banknote, QrCode } from 'lucide-react';
import { useCartStore } from '@/store/cart-store';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

type DeliveryZone = 'residence' | 'dois_unidos' | '';
type Step = 1 | 2;

export default function CheckoutModal() {
  const { items, isCheckoutOpen, closeCheckout, getTotalPrice, clearCart, removeItem } = useCartStore();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [nome, setNome] = useState('');
  const [rua, setRua] = useState('');
  const [numero, setNumero] = useState('');
  const [referencia, setReferencia] = useState('');
  const [pagamento, setPagamento] = useState('');
  const [zone, setZone] = useState<DeliveryZone>('');
  const [mounted, setMounted] = useState(false);

  const endereco = zone === 'residence'
    ? [rua, numero].filter(Boolean).join(', ')
    : [rua, numero, referencia].filter(Boolean).join(', ');

  useEffect(() => { setMounted(true); }, []);

  // Reset to step 1 when modal opens
  useEffect(() => {
    if (isCheckoutOpen) setStep(1);
  }, [isCheckoutOpen]);

  if (!mounted) return null;

  const formatPrice = (price: number) =>
    price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const getDeliveryFee = () => (zone === 'dois_unidos' ? 3 : 0);
  const getZoneName = () => {
    if (zone === 'residence') return 'Residence Club Dr. Moacyr André Gomes';
    if (zone === 'dois_unidos') return 'Dois Unidos';
    return '';
  };

  const deliveryFee = getDeliveryFee();
  const subtotal = getTotalPrice();
  const finalTotal = subtotal + deliveryFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zone) { alert('Por favor, selecione seu bairro/condomínio para entrega.'); return; }

    let savedOrderId: string | null = null;

    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: nome,
          delivery_zone: zone,
          delivery_zone_name: getZoneName(),
          address: endereco,
          payment_method: pagamento,
          subtotal,
          delivery_fee: deliveryFee,
          total: finalTotal,
        })
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
      }
    } catch (error) {
      console.error('Erro ao salvar pedido:', error);
    }

    const lines: string[] = [];
    lines.push('*=== NOVO PEDIDO - G & S SALGADOS ===*');
    lines.push('');
    lines.push('*ITENS DO PEDIDO:*');
    items.forEach((item) => {
      lines.push(`- ${item.quantity}x ${item.name} - ${formatPrice(item.price * item.quantity)}`);
      if (item.selectedFlavors?.length) lines.push(`  > Sabores: ${item.selectedFlavors.join(', ')}`);
      if (item.selectedAcomp?.length) lines.push(`  > Acompanhamentos: ${item.selectedAcomp.join(', ')}`);
    });
    lines.push('------------------------------------');
    lines.push(`*Subtotal:* ${formatPrice(subtotal)}`);
    lines.push(`*Taxa de Entrega:* ${deliveryFee === 0 ? 'Gratis' : formatPrice(deliveryFee)} (${getZoneName()})`);
    lines.push(`*VALOR TOTAL: ${formatPrice(finalTotal)}*`);
    lines.push('');
    lines.push('*DADOS DA ENTREGA:*');
    lines.push(`*Nome:* ${nome}`);
    lines.push(`*Bairro:* ${getZoneName()}`);
    lines.push(`*Endereco:* ${endereco}`);
    lines.push(`*Pagamento:* ${pagamento}`);
    lines.push('');
    lines.push('Agradecemos a preferencia!');

    const message = lines.join('\n');

    // Try sending via Evolution API (automatic WhatsApp)
    const { error: fnError } = await supabase.functions.invoke('send-whatsapp', {
      body: { message },
    });

    if (fnError) {
      console.warn('Evolution API falhou, abrindo WhatsApp manualmente:', fnError);
      window.open(`https://wa.me/5581992429014?text=${encodeURIComponent(message)}`, '_blank');
    }

    clearCart();
    closeCheckout();
    setNome(''); setRua(''); setNumero(''); setReferencia(''); setPagamento(''); setZone('');

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

            {/* ── STEP 1: Order Summary ── */}
            {step === 1 && (
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
            {step === 2 && (
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

                {/* Bairro */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] mb-2">
                    <Home className="w-4 h-4" />
                    Bairro / Condomínio de Entrega
                  </label>
                  <div className="space-y-2">
                    <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${zone === 'residence' ? 'border-orange-500 bg-orange-500/10' : 'border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-orange-500/30'}`}>
                      <input type="radio" name="zone" value="residence" checked={zone === 'residence'} onChange={() => setZone('residence')} className="w-4 h-4 accent-orange-500" required />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[var(--text-primary)]">Residence Club Dr. Moacyr André Gomes</p>
                        <p className="text-xs text-green-500 font-medium">Entrega Grátis</p>
                      </div>
                    </label>
                    <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${zone === 'dois_unidos' ? 'border-orange-500 bg-orange-500/10' : 'border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-orange-500/30'}`}>
                      <input type="radio" name="zone" value="dois_unidos" checked={zone === 'dois_unidos'} onChange={() => setZone('dois_unidos')} className="w-4 h-4 accent-orange-500" required />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[var(--text-primary)]">Dois Unidos</p>
                        <p className="text-xs text-[var(--text-secondary)]">Taxa: R$ 3,00</p>
                      </div>
                    </label>
                  </div>
                  <p className="text-xs text-orange-500/80 mt-2 italic">⚠️ Entregas apenas nas localidades acima.</p>
                </div>

                {/* Endereço */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] mb-2">
                    <MapPin className="w-4 h-4" />
                    {zone === 'residence' ? 'Bloco e Apartamento' : 'Endereço'}
                  </label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={rua}
                        onChange={(e) => setRua(e.target.value)}
                        required
                        placeholder={zone === 'residence' ? 'Bloco' : 'Rua'}
                        disabled={!zone}
                        className="w-[70%] px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <input
                        type="text"
                        value={numero}
                        onChange={(e) => setNumero(e.target.value)}
                        required
                        placeholder={zone === 'residence' ? 'Apto' : 'Nº'}
                        disabled={!zone}
                        className="w-[30%] px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                    {zone !== 'residence' && (
                      <input
                        type="text"
                        value={referencia}
                        onChange={(e) => setReferencia(e.target.value)}
                        placeholder="Referência (opcional)"
                        disabled={!zone}
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
                        onClick={() => setPagamento(value)}
                        className={`flex items-center gap-2 px-3 py-3 rounded-xl border transition-all text-sm font-medium ${pagamento === value ? 'border-orange-500 bg-orange-500/10 text-orange-500' : 'border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] hover:border-orange-500/40'}`}
                      >
                        {icon}
                        {label}
                      </button>
                    ))}
                  </div>
                  <input type="hidden" value={pagamento} required />
                </div>

                {/* Total com entrega */}
                {zone && (
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
