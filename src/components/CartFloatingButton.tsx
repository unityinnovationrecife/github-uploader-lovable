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
      className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-auto sm:right-6 sm:w-auto z-40 flex items-center justify-between sm:gap-6 px-5 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-2xl shadow-orange-500/30 active:scale-[0.98] transition-all duration-300 animate-slide-up-cart hover:shadow-orange-500/50"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <ShoppingCart className="w-6 h-6" />
          <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white text-orange-600 text-[10px] font-bold flex items-center justify-center">
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
      <div className="flex items-center gap-2">
        <span className="font-extrabold text-lg">{formatPrice(totalPrice)}</span>
        <ArrowRight className="w-5 h-5 hidden sm:block" />
      </div>
    </button>
  );
}
