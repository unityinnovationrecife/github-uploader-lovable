import { MessageCircle } from 'lucide-react';
import { useWhatsAppNumber } from '@/hooks/use-whatsapp-number';

export default function WhatsAppButton() {
  const { number } = useWhatsAppNumber();
  const href = `https://wa.me/${number}?text=Olá! Vim pelo cardápio online e gostaria de mais informações.`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed bottom-6 left-6 z-50 group"
    >
      <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-[#25D366] shadow-xl shadow-[#25D366]/40 hover:shadow-[#25D366]/60 hover:scale-110 transition-all duration-300">
        <MessageCircle className="w-7 h-7 text-white fill-white" />
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-2xl bg-[#25D366] animate-ping opacity-25 pointer-events-none" />
      </div>
      {/* Tooltip */}
      <span className="absolute left-16 top-1/2 -translate-y-1/2 whitespace-nowrap bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs font-semibold px-3 py-1.5 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-200 pointer-events-none">
        Falar no WhatsApp
      </span>
    </a>
  );
}
