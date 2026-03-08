import { ShoppingCart, ClipboardList, Zap } from 'lucide-react';

const steps = [
  {
    icon: ShoppingCart,
    emoji: '🛒',
    title: 'Escolha seus itens',
    description: 'Navegue pelo cardápio, adicione sabores e acompanhamentos do seu jeito.',
    color: 'from-orange-500 to-amber-500',
    glow: 'shadow-orange-500/30',
    step: '01',
  },
  {
    icon: ClipboardList,
    emoji: '📋',
    title: 'Finalize o pedido',
    description: 'Preencha seus dados, escolha a zona de entrega e a forma de pagamento.',
    color: 'from-amber-500 to-yellow-500',
    glow: 'shadow-amber-500/30',
    step: '02',
  },
  {
    icon: Zap,
    emoji: '⚡',
    title: 'Receba em casa',
    description: 'Seu pedido é preparado na hora e entregue rapidinho na sua porta.',
    color: 'from-red-500 to-orange-500',
    glow: 'shadow-red-500/30',
    step: '03',
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-[var(--bg-secondary)] border-y border-[var(--border-color)] py-12 sm:py-16 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-12">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-orange-500 mb-2">
            É muito simples
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
            Como{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
              funciona?
            </span>
          </h2>
        </div>

        {/* Steps */}
        <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
          {/* Connector line (desktop) */}
          <div className="absolute hidden sm:block top-10 left-[calc(16.67%+1.5rem)] right-[calc(16.67%+1.5rem)] h-px bg-gradient-to-r from-orange-500/30 via-amber-500/30 to-red-500/30" />

          {steps.map((step, i) => (
            <div
              key={i}
              className="relative flex flex-col items-center text-center gap-4 animate-fade-in"
              style={{ animationDelay: `${i * 0.12}s` }}
            >
              {/* Step number badge */}
              <div className="relative z-10">
                <div
                  className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${step.color} shadow-xl ${step.glow} flex items-center justify-center text-3xl select-none`}
                >
                  {step.emoji}
                </div>
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[var(--bg-primary)] border-2 border-[var(--border-color)] flex items-center justify-center text-[10px] font-black text-[var(--text-muted)]">
                  {step.step}
                </span>
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] mb-1">
                  {step.title}
                </h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-xs mx-auto">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
