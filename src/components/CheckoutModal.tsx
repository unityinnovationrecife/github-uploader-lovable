import { X, Send, MapPin, User, CreditCard, Home } from 'lucide-react';
import { useCartStore } from '@/store/cart-store';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type DeliveryZone = 'residence' | 'dois_unidos' | '';

export default function CheckoutModal() {
  const { items, isCheckoutOpen, closeCheckout, getTotalPrice, clearCart } = useCartStore();
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [pagamento, setPagamento] = useState('');
  const [zone, setZone] = useState<DeliveryZone>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const getDeliveryFee = () => {
    if (zone === 'residence') return 0;
    if (zone === 'dois_unidos') return 3;
    return 0;
  };

  const getZoneName = () => {
    if (zone === 'residence') return 'Residence Club Dr. Moacyr André Gomes';
    if (zone === 'dois_unidos') return 'Dois Unidos';
    return '';
  };

  const deliveryFee = getDeliveryFee();
  const finalTotal = getTotalPrice() + deliveryFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!zone) {
      alert('Por favor, selecione seu bairro/condomínio para entrega.');
      return;
    }

    // Save order to Supabase directly
    try {
      const { error } = await supabase.from('orders').insert({
        customer_name: nome,
        delivery_zone: zone,
        delivery_zone_name: getZoneName(),
        address: endereco,
        payment_method: pagamento,
        subtotal: getTotalPrice(),
        delivery_fee: deliveryFee,
        total: finalTotal,
        items: items.map((item) => ({
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          selected_flavors: item.selectedFlavors || [],
          selected_acomp: item.selectedAcomp || [],
        })),
      });
      if (error) {
        console.error('Erro ao salvar pedido:', error);
      }
    } catch (error) {
      console.error('Erro ao salvar pedido:', error);
    }

    // Build WhatsApp message
    const lines: string[] = [];
    lines.push('*=== NOVO PEDIDO - G & S SALGADOS ===*');
    lines.push('');
    lines.push('*ITENS DO PEDIDO:*');

    items.forEach((item) => {
      lines.push('- ' + item.quantity + 'x ' + item.name + ' - ' + formatPrice(item.price * item.quantity));
      if (item.selectedFlavors && item.selectedFlavors.length > 0) {
        lines.push('  > Sabores: ' + item.selectedFlavors.join(', '));
      }
      if (item.selectedAcomp && item.selectedAcomp.length > 0) {
        lines.push('  > Acompanhamentos: ' + item.selectedAcomp.join(', '));
      }
    });

    lines.push('------------------------------------');
    lines.push('*Subtotal:* ' + formatPrice(getTotalPrice()));
    lines.push('*Taxa de Entrega:* ' + (deliveryFee === 0 ? 'Gratis' : formatPrice(deliveryFee)) + ' (' + getZoneName() + ')');
    lines.push('*VALOR TOTAL: ' + formatPrice(finalTotal) + '*');
    lines.push('');
    lines.push('*DADOS DA ENTREGA:*');
    lines.push('*Nome:* ' + nome);
    lines.push('*Bairro:* ' + getZoneName());
    lines.push('*Endereco:* ' + endereco);
    lines.push('*Pagamento:* ' + pagamento);
    lines.push('');
    lines.push('Agradecemos a preferencia!');

    const message = lines.join('\n');
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/5581992429014?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
    clearCart();
    closeCheckout();
    setNome('');
    setEndereco('');
    setPagamento('');
    setZone('');
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] transition-opacity duration-300 ${
          isCheckoutOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeCheckout}
      />

      {/* Modal */}
      <div
        className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-all duration-300 ${
          isCheckoutOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          className={`w-full max-w-lg max-h-[90vh] bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl overflow-hidden transform transition-all duration-300 flex flex-col ${
            isCheckoutOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)] flex-shrink-0">
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Finalizar Pedido</h2>
              <p className="text-xs text-[var(--text-muted)]">Preencha seus dados para enviar via WhatsApp</p>
            </div>
            <button
              onClick={closeCheckout}
              className="p-2 rounded-xl bg-[var(--bg-primary)] hover:opacity-80 transition-colors"
            >
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1">
            {/* Order summary */}
            <div className="p-5 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
              <h3 className="text-sm font-semibold text-[var(--text-muted)] mb-3">Resumo do Pedido</h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">
                        {item.emoji} {item.name} x{item.quantity}
                      </span>
                      <span className="text-[var(--text-muted)] font-medium">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                    {item.selectedFlavors && item.selectedFlavors.length > 0 && (
                      <p className="text-[11px] text-orange-500/70 ml-6">
                        {item.selectedFlavors.join(', ')}
                      </p>
                    )}
                    {item.selectedAcomp && item.selectedAcomp.length > 0 && (
                      <p className="text-[11px] text-[var(--text-muted)] ml-6 mt-0.5">
                        + {item.selectedAcomp.join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2 mt-4 pt-4 border-t border-[var(--border-color)]">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Subtotal</span>
                  <span className="text-[var(--text-muted)] font-medium">
                    {formatPrice(getTotalPrice())}
                  </span>
                </div>

                {zone && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">Taxa de entrega</span>
                    <span className={deliveryFee === 0 ? 'text-green-500 font-medium' : 'text-[var(--text-muted)] font-medium'}>
                      {deliveryFee === 0 ? 'Gratis' : formatPrice(deliveryFee)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <span className="text-base font-bold text-[var(--text-primary)]">Total</span>
                  <span className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">
                    {formatPrice(finalTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Form */}
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

              {/* Bairro / Condomínio */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] mb-2 mt-2">
                  <Home className="w-4 h-4" />
                  Bairro / Condomínio de Entrega
                </label>
                <div className="space-y-2">
                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      zone === 'residence'
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-orange-500/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="zone"
                      value="residence"
                      checked={zone === 'residence'}
                      onChange={() => setZone('residence')}
                      className="w-4 h-4 text-orange-500 accent-orange-500"
                      required
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--text-primary)]">Residence Club Dr. Moacyr André Gomes</p>
                      <p className="text-xs text-green-500 font-medium">Entrega Grátis</p>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      zone === 'dois_unidos'
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-orange-500/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="zone"
                      value="dois_unidos"
                      checked={zone === 'dois_unidos'}
                      onChange={() => setZone('dois_unidos')}
                      className="w-4 h-4 text-orange-500 accent-orange-500"
                      required
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--text-primary)]">Dois Unidos</p>
                      <p className="text-xs text-[var(--text-secondary)]">Taxa: R$ 3,00</p>
                    </div>
                  </label>
                </div>
                <p className="text-xs text-orange-500/80 mt-2 italic">⚠️ Entregas apenas nas localidades acima.</p>
              </div>

              {/* Endereço Detalhado */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] mb-2 mt-4">
                  <MapPin className="w-4 h-4" />
                  {zone === 'residence' ? 'Bloco e Apartamento' : 'Rua, Número, Referência'}
                </label>
                <input
                  type="text"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  required
                  placeholder={zone === 'residence' ? 'Ex: Bloco A, Apto 101' : 'Rua, número, refer.'}
                  disabled={!zone}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Pagamento */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] mb-2 mt-4">
                  <CreditCard className="w-4 h-4" />
                  Forma de Pagamento
                </label>
                <select
                  value={pagamento}
                  onChange={(e) => setPagamento(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/25 transition-all appearance-none"
                >
                  <option value="" disabled>Selecione...</option>
                  <option value="PIX">PIX</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Cartão de Débito">Cartão de Débito</option>
                </select>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-base shadow-xl shadow-green-500/25 hover:shadow-green-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
              >
                <Send className="w-5 h-5" />
                Finalizar Pedido ({formatPrice(finalTotal)})
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
