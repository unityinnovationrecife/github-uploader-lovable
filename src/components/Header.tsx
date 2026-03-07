import { ShoppingCart, Sun, Moon, Clock, Truck, X } from 'lucide-react';
import { useCartStore } from '@/store/cart-store';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import logo from '@/assets/logo.png';

function getStoreStatus() {
  const now = new Date();
  const day = now.getDay(); // 0=Dom, 1=Seg, ..., 5=Sex, 6=Sáb
  const hour = now.getHours();
  const minute = now.getMinutes();
  const time = hour + minute / 60;

  const isWeekend = day === 0 || day === 6; // Dom ou Sáb

  if (isWeekend) {
    // Sáb e Dom: 17h às 00h
    const open = time >= 17;
    const closingSoon = time >= 23;
    return { isOpen: open, closingSoon, hours: 'Sáb e Dom: 17h às 00h' };
  } else {
    // Seg a Sex: 19h às 23h
    const open = time >= 19 && time < 23;
    const closingSoon = time >= 22.5;
    return { isOpen: open, closingSoon, hours: 'Seg a Sex: 19h às 23h' };
  }
}

export default function Header() {
  const { toggleCart, getTotalItems } = useCartStore();
  const { theme, setTheme } = useTheme();
  const [totalItems, setTotalItems] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [storeStatus, setStoreStatus] = useState(getStoreStatus());

  useEffect(() => {
    setMounted(true);
    // Atualiza o status a cada minuto
    const interval = setInterval(() => {
      setStoreStatus(getStoreStatus());
    }, 60_000);
    return () => clearInterval(interval);
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
    <div className="sticky top-0 z-40 w-full">
      {/* ── Barra de destaque ── */}
      <div className="w-full bg-gradient-to-r from-orange-500 via-amber-500 to-red-500 text-white text-xs sm:text-sm py-2 px-4 flex items-center justify-center gap-2 font-medium tracking-wide">
        <Truck className="w-4 h-4 shrink-0" />
        <span>🚚 Entrega rápida na região!</span>
      </div>

      {/* ── Header principal ── */}
      <header className="w-full backdrop-blur-xl bg-[var(--bg-header)] border-b border-[var(--border-color)] transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">

            {/* Logo + status */}
            <div className="flex items-center gap-3">
              <img src={logo} alt="G&S Salgados" className="h-12 sm:h-16 w-auto object-contain" />
              {mounted && (
                <div className="flex flex-col gap-0.5">
                  <span
                    className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      storeStatus.isOpen
                        ? storeStatus.closingSoon
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                        : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        storeStatus.isOpen
                          ? storeStatus.closingSoon
                            ? 'bg-amber-500 animate-pulse'
                            : 'bg-green-500 animate-pulse'
                          : 'bg-red-500'
                      }`}
                    />
                    {storeStatus.isOpen
                      ? storeStatus.closingSoon
                        ? 'Fechando em breve'
                        : 'Aberto agora'
                      : 'Fechado'}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                    <Clock className="w-3 h-3" />
                    {storeStatus.hours}
                  </span>
                </div>
              )}
            </div>

            {/* Ações */}
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
    </div>
  );
}
