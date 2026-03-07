import { ShoppingCart, ArrowRight } from 'lucide-react';
import { useCartStore } from '@/store/cart-store';
import { useEffect, useState } from 'react';

export default function CartFloatingButton() {
  const { toggleCart, getTotalItems, getTotalPrice } = useCartStore();
  const [totalItems, setTotalItems] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      setTotalItems(getTotalItems());
      setTotalPrice(getTotalPrice());
    }
  });

  if (!mounted || totalItems === 0) return null;

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  return (
    <button
      onClick={toggleCart}
      className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-auto sm:right-6 sm:w-auto z-40 flex items-center justify-between sm:gap-6 px-5 py-4 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-red-600 text-white shadow-2xl shadow-orange-500/40 active:scale-[0.97] transition-all duration-300 animate-cart-enter animate-cart-pulse hover:shadow-orange-500/60 hover:scale-[1.02]"
      style={{
        backgroundSize: '200% auto',
      }}
    >
      {/* Shimmer overlay */}
      <span className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-cart-shimmer" style={{ backgroundSize: '200% auto' }} />
      </span>

      <div className="flex items-center gap-3 relative">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
          <ShoppingCart className="w-6 h-6 relative" />
          <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white text-orange-600 text-[10px] font-bold flex items-center justify-center shadow-md">
            {totalItems}
          </span>
        </div>
        <div className="text-left">
          <span className="font-bold text-sm sm:text-base block">Ver carrinho</span>
          <span className="text-[10px] sm:text-xs text-white/80">
            {totalItems} {totalItems === 1 ? 'item' : 'itens'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 relative">
        <span className="font-extrabold text-lg">{formatPrice(totalPrice)}</span>
        <ArrowRight className="w-5 h-5 hidden sm:block animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDirection: 'alternate' }} />
      </div>
    </button>
  );
}
