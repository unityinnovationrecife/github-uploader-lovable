import { useEffect, useState } from 'react';
import { useNavigate, NavLink, Outlet } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  ChefHat, Package, ShoppingBag, UtensilsCrossed, LogOut,
  Menu, X, Store, BarChart2, Settings, Bell, BellOff, BellRing, Tag, Tv,
} from 'lucide-react';
import logo from '@/assets/logo.png';
import { usePendingOrders } from '@/hooks/use-pending-orders';
import { useBrowserNotification } from '@/hooks/use-browser-notification';

export default function AdminLayout() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const { pendingCount } = usePendingOrders();
  const { permission, isSupported, requestPermission } = useBrowserNotification();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/admin/login');
      setChecking(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) navigate('/admin/login');
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const navItems = [
    { to: '/admin/produtos', icon: Package, label: 'Produtos', badge: 0 },
    { to: '/admin/pedidos', icon: ShoppingBag, label: 'Pedidos', badge: pendingCount },
    { to: '/admin/acompanhamentos', icon: UtensilsCrossed, label: 'Acompanhamentos', badge: 0 },
    { to: '/admin/cupons', icon: Tag, label: 'Cupons', badge: 0 },
    { to: '/admin/relatorios', icon: BarChart2, label: 'Relatórios', badge: 0 },
    { to: '/admin/configuracoes', icon: Settings, label: 'Configurações', badge: 0 },
  ];

  // Botão de notificação push: renderização condicional por estado
  const NotifButton = ({ mobile = false }: { mobile?: boolean }) => {
    if (!isSupported) return null;

    if (permission === 'granted') {
      return (
        <div
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-green-600 ${
            mobile ? '' : 'cursor-default'
          }`}
          title="Notificações push ativadas"
        >
          <BellRing className="w-4 h-4 flex-shrink-0" />
          <span>Notificações ativas</span>
        </div>
      );
    }

    if (permission === 'denied') {
      return (
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-muted-foreground cursor-not-allowed"
          title="Permissão negada pelo navegador. Habilite nas configurações do navegador."
        >
          <BellOff className="w-4 h-4 flex-shrink-0" />
          <span>Notificações bloqueadas</span>
        </div>
      );
    }

    // 'default' — ainda não pediu
    return (
      <button
        onClick={requestPermission}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-primary hover:bg-primary/10 transition-all w-full border border-primary/20"
        title="Receba alertas mesmo com a aba em segundo plano"
      >
        <Bell className="w-4 h-4 flex-shrink-0 animate-bounce" />
        <span>Ativar notificações</span>
      </button>
    );
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-60 bg-card border-r border-border">
        <div className="p-4 border-b border-border flex items-center justify-center">
          <a href="/" title="Voltar para a loja">
            <img src={logo} alt="G&S Salgados" className="h-16 w-auto object-contain hover:opacity-80 transition-opacity" />
          </a>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label, badge }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  {badge > 0 && (
                    <span
                      className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold leading-none ${
                        isActive
                          ? 'bg-primary-foreground text-primary'
                          : 'bg-destructive text-destructive-foreground animate-pulse'
                      }`}
                    >
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border space-y-1">
          {/* Botão de notificações push */}
          <NotifButton />
        <a
            href="/tv-fila"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all w-full border border-transparent hover:border-primary/20"
          >
            <Tv className="w-4 h-4" />
            TV de Fila
          </a>
          <a
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all w-full"
          >
            <Store className="w-4 h-4" />
            Ver Loja
          </a>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all w-full"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <ChefHat className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground text-sm">Admin</span>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-bold bg-destructive text-destructive-foreground animate-pulse">
              {pendingCount > 99 ? '99+' : pendingCount}
            </span>
          )}
          <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded-lg hover:bg-muted transition-colors">
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMenuOpen(false)}>
          <div className="absolute top-14 left-0 right-0 bg-card border-b border-border p-4 space-y-1" onClick={e => e.stopPropagation()}>
            {navItems.map(({ to, icon: Icon, label, badge }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1">{label}</span>
                    {badge > 0 && (
                      <span
                        className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold leading-none ${
                          isActive
                            ? 'bg-primary-foreground text-primary'
                            : 'bg-destructive text-destructive-foreground animate-pulse'
                        }`}
                      >
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
            {/* Botão de notificações no menu mobile */}
            <div className="pt-2 border-t border-border mt-2">
              <NotifButton mobile />
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all w-full"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-hidden pt-14 md:pt-0 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
