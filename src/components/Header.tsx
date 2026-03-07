import { ShoppingCart, Sun, Moon } from 'lucide-react';
import { useCartStore } from '@/store/cart-store';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export default function Header() {
  const { toggleCart, getTotalItems } = useCartStore();
  const { theme, setTheme } = useTheme();
  const [totalItems, setTotalItems] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      setTotalItems(getTotalItems());
    }
  });

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[var(--bg-header)] border-b border-[var(--border-color)] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <span className="text-xl">🍗</span>
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">
                G & S <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">Salgados</span>
              </h1>
              <p className="text-[10px] sm:text-xs text-[var(--text-muted)] -mt-0.5">O melhor sabor da cidade</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-orange-500/50 transition-all duration-300"
              aria-label="Alternar tema"
            >
              {mounted && theme === 'dark' ? (
                <Sun className="w-5 h-5 text-amber-400" />
              ) : (
                <Moon className="w-5 h-5 text-[var(--text-muted)]" />
              )}
            </button>

            {/* Cart Button - Desktop */}
            <button
              onClick={toggleCart}
              className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] transition-all duration-300 hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/10 group"
            >
              <ShoppingCart className="w-5 h-5 text-[var(--text-muted)] group-hover:text-orange-500 transition-colors" />
              <span className="text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">Carrinho</span>
              {mounted && totalItems > 0 && (
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold animate-bounce-subtle">
                  {totalItems}
                </span>
              )}
            </button>

            {/* Cart Button - Mobile */}
            <button
              onClick={toggleCart}
              className="sm:hidden relative p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]"
            >
              <ShoppingCart className="w-5 h-5 text-[var(--text-muted)]" />
              {mounted && totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold animate-bounce-subtle">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
