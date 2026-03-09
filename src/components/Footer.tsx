import { useStoreBranding } from '@/hooks/use-store-branding';

export default function Footer() {
  const { storeName, storeSlogan } = useStoreBranding();

  return (
    <footer className="bg-[var(--bg-secondary)] border-t border-[var(--border-color)] mt-16 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <span className="text-lg">🍗</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                {storeName}
              </h3>
              <p className="text-xs text-[var(--text-muted)]">{storeSlogan}</p>
            </div>
          </div>

          {/* Info */}
          <div className="text-center sm:text-right">
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              📍 R. Palhambu, 212 - Dois Carneiros<br className="hidden sm:block" />
              <span className="sm:hidden">, </span>Jaboatão dos Guararapes - PE, 54290-102
            </p>
            <p className="text-sm text-[var(--text-muted)] mt-2">
              🕐 Seg a Sex: 19h às 23h<br className="hidden sm:block" />
              <span className="sm:hidden"> | </span>Sáb e Dom: 17h às 00h
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--border-color)] text-center">
          <p className="text-xs text-[var(--text-muted)]">
            © {new Date().getFullYear()} {storeName}. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
