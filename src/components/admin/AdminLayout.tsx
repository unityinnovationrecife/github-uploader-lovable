import { useEffect, useState } from 'react';
import { useNavigate, NavLink, Outlet } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ChefHat, Package, ShoppingBag, UtensilsCrossed, LogOut, Menu, X } from 'lucide-react';
import logo from '@/assets/logo.png';

export default function AdminLayout() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

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
    { to: '/admin/produtos', icon: Package, label: 'Produtos' },
    { to: '/admin/pedidos', icon: ShoppingBag, label: 'Pedidos' },
    { to: '/admin/acompanhamentos', icon: UtensilsCrossed, label: 'Acompanhamentos' },
  ];

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-60 bg-card border-r border-border">
        <div className="p-4 border-b border-border flex items-center justify-center">
          <img src={logo} alt="G&S Salgados" className="h-16 w-auto object-contain" />
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
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
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
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
        <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded-lg hover:bg-muted transition-colors">
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMenuOpen(false)}>
          <div className="absolute top-14 left-0 right-0 bg-card border-b border-border p-4 space-y-1" onClick={e => e.stopPropagation()}>
            {navItems.map(({ to, icon: Icon, label }) => (
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
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all w-full mt-2"
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
