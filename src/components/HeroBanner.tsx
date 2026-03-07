import { Flame, ChevronRight } from 'lucide-react';
import heroLogo from '@/assets/hero-logo.png';

export default function HeroBanner() {
  const scrollToProducts = () => {
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-600/20 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-red-600/10 via-transparent to-transparent" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
        <div className="text-center font-bold items-center justify-center flex flex-col">
          {/* Logo */}
          <div className="mb-6 animate-fade-in">
            <img src={heroLogo} alt="G&S Salgados" className="w-48 h-48 sm:w-64 sm:h-64 object-contain drop-shadow-2xl" />
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 mb-6 animate-fade-in">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-orange-300 font-medium">Peça agora pelo WhatsApp</span>
          </div>

          {/* Title */}
          <h2 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-white mb-4 sm:mb-6 animate-slide-up">
            O sabor que você{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-red-500">
              merece
            </span>
          </h2>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-8 sm:mb-10 animate-slide-up-delay">
            Lanches artesanais, ingredientes frescos e um sabor incrível.
            Monte seu pedido e receba rapidinho!
          </p>

          {/* CTA Button */}
          <button
            onClick={scrollToProducts}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-lg shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105 transition-all duration-300 animate-slide-up-delay-2"
          >
            Ver Cardápio
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 sm:gap-12 mt-12 sm:mt-16 animate-fade-in-delay">
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-white">500+</p>
              <p className="text-xs sm:text-sm text-zinc-400">Pedidos/mês</p>
            </div>
            <div className="w-px h-10 bg-zinc-700" />
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-white">4.9</p>
              <p className="text-xs sm:text-sm text-zinc-400">Avaliação ⭐</p>
            </div>
            <div className="w-px h-10 bg-zinc-700" />
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-white">30min</p>
              <p className="text-xs sm:text-sm text-zinc-400">Tempo médio</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
