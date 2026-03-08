import { Plus, Minus, ShoppingCart } from 'lucide-react';
import { Product } from '@/types';
import { useCartStore } from '@/store/cart-store';
import { useEffect, useState } from 'react';

interface ProductCardProps {
  product: Product;
  onSelectFlavors?: (product: Product) => void;
}

export default function ProductCard({ product, onSelectFlavors }: ProductCardProps) {
  const { items, addItem, increaseQuantity, decreaseQuantity } = useCartStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cartItem = mounted ? items.find((item) => item.id === product.id) : undefined;
  const quantity = cartItem?.quantity ?? 0;
  const isAvailable = product.available !== false;

  const handleAdd = () => {
    if (!isAvailable) return;
    if (product.hasFlavors && onSelectFlavors) {
      onSelectFlavors(product);
      return;
    }
    addItem(product);
  };

  const handleIncrease = () => {
    if (!isAvailable) return;
    if (product.hasFlavors && onSelectFlavors) {
      onSelectFlavors(product);
      return;
    }
    increaseQuantity(product.id);
  };

  const handleDecrease = () => {
    decreaseQuantity(product.id);
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const isCombo = product.id.startsWith('combo-');

  return (
    <div
      className={`group relative bg-[var(--bg-card)] border rounded-2xl overflow-hidden transition-all duration-500 flex flex-col h-full ${
        !isAvailable
          ? 'border-[var(--border-color)] opacity-80'
          : isCombo
          ? 'border-orange-500/30 hover:border-orange-500/50 hover:shadow-orange-500/10 hover:shadow-xl hover:-translate-y-1'
          : 'border-[var(--border-color)] hover:border-orange-500/30 hover:shadow-orange-500/5 hover:shadow-xl hover:-translate-y-1'
      }`}
      style={{ boxShadow: 'var(--card-shadow)' }}
    >
      {/* Esgotado overlay badge */}
      {!isAvailable && (
        <div className="absolute inset-0 z-20 flex items-start justify-end p-3 pointer-events-none">
          <span className="px-2.5 py-1 rounded-full bg-zinc-800/90 backdrop-blur-sm text-[10px] font-bold text-zinc-300 uppercase tracking-wider border border-zinc-600/50 shadow-lg">
            Esgotado
          </span>
        </div>
      )}

      {/* Combo badge */}
      {isCombo && isAvailable && (
        <div className="absolute top-3 right-3 z-10">
          <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-orange-500 to-red-600 text-[10px] font-bold text-white uppercase tracking-wider shadow-lg">
            Oferta
          </span>
        </div>
      )}

      {/* Featured badge */}
      {product.featured && isAvailable && !isCombo && (
        <div className="absolute top-3 right-3 z-10">
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-[10px] font-bold text-white uppercase tracking-wider shadow-lg shadow-yellow-500/30">
            🔥 Mais pedido
          </span>
        </div>
      )}

      {/* Image area */}
      <div
        className={`relative aspect-[4/3] overflow-hidden ${
          isCombo && isAvailable
            ? 'bg-gradient-to-br from-orange-950/50 to-red-950/50'
            : 'bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900'
        }`}
      >
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className={`w-full h-full object-cover transition-all duration-500 ${
              isAvailable ? 'group-hover:scale-110' : 'grayscale opacity-60'
            }`}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-5xl sm:text-6xl transition-transform duration-500 ${isAvailable ? 'group-hover:scale-125' : 'grayscale opacity-60'}`}>
              {product.emoji}
            </span>
          </div>
        )}
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        {/* Category badge */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10">
          <span className="px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[var(--badge-bg)] backdrop-blur-sm text-[10px] sm:text-xs font-medium text-[var(--badge-text)] border border-[var(--border-color)]">
            {product.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5 flex flex-col flex-1">
        <div className="flex-1">
          <h3 className={`text-sm sm:text-base font-bold mb-1 transition-colors ${isAvailable ? 'text-[var(--text-primary)] group-hover:text-orange-500' : 'text-[var(--text-muted)]'}`}>
            {product.name}
          </h3>
          <p className="text-xs text-[var(--text-muted)] mb-3 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        <div className="space-y-3 mt-auto">
          <p className={`text-lg sm:text-xl font-extrabold ${isAvailable ? 'text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500' : 'text-[var(--text-muted)]'}`}>
            {formatPrice(product.price)}
          </p>

          {/* Esgotado — sem botão de compra */}
          {!isAvailable ? (
            <div className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-muted)] cursor-not-allowed select-none">
              <ShoppingCart className="w-3.5 h-3.5 opacity-50" />
              Indisponível
            </div>
          ) : quantity > 0 && !product.hasFlavors ? (
            <div className="flex items-center justify-between">
              <button
                onClick={handleDecrease}
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] hover:border-orange-500/50 transition-all active:scale-90"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-base font-bold text-[var(--text-primary)]">
                {quantity}
              </span>
              <button
                onClick={handleIncrease}
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all active:scale-90"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAdd}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              {product.hasFlavors ? 'Escolher' : 'Adicionar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
