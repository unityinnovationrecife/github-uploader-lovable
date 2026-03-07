import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/store/cart-store';
import { useEffect, useState } from 'react';

export default function CartSidebar() {
  const {
    items,
    isCartOpen,
    toggleCart,
    increaseQuantity,
    decreaseQuantity,
    removeItem,
    getTotalPrice,
    openCheckout,
  } = useCartStore();

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

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isCartOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={toggleCart}
      />

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-[var(--bg-secondary)] border-l border-[var(--border-color)] z-50 transform transition-transform duration-300 ease-out ${
          isCartOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Seu Carrinho</h2>
                <p className="text-xs text-[var(--text-muted)]">
                  {items.length} {items.length === 1 ? 'item' : 'itens'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleCart}
              className="p-2 rounded-xl bg-[var(--bg-primary)] hover:bg-[var(--border-color)] transition-colors"
            >
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-20 h-20 rounded-full bg-[var(--bg-primary)] flex items-center justify-center mb-4">
                  <ShoppingBag className="w-10 h-10 text-[var(--text-muted)]" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-muted)] mb-2">Carrinho vazio</h3>
                <p className="text-sm text-[var(--text-muted)]">Adicione itens deliciosos ao seu pedido!</p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] group hover:border-orange-500/30 transition-all"
                >
                  {/* Emoji */}
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 mt-0.5 bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">{item.name}</h3>
                    {item.selectedFlavors && item.selectedFlavors.length > 0 && (
                      <p className="text-[11px] text-orange-500/80 mt-0.5 leading-tight">
                        {item.selectedFlavors.join(', ')}
                      </p>
                    )}
                    {item.selectedAcomp && item.selectedAcomp.length > 0 && (
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-tight">
                        + {item.selectedAcomp.join(', ')}
                      </p>
                    )}
                    <p className="text-xs text-[var(--text-muted)] mt-1">{formatPrice(item.price)} cada</p>
                    <p className="text-sm font-bold text-orange-500 mt-0.5">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => decreaseQuantity(item.id)}
                      className="w-7 h-7 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-orange-500/40 flex items-center justify-center transition-colors"
                    >
                      <Minus className="w-3 h-3 text-[var(--text-muted)]" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold text-[var(--text-primary)]">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => increaseQuantity(item.id)}
                      className="w-7 h-7 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-orange-500/40 flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-3 h-3 text-[var(--text-muted)]" />
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-colors ml-0.5"
                    >
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="p-5 border-t border-[var(--border-color)] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-base text-[var(--text-muted)]">Total</span>
                <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">
                  {formatPrice(getTotalPrice())}
                </span>
              </div>
              <button
                onClick={openCheckout}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-base shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
              >
                Finalizar Pedido
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
