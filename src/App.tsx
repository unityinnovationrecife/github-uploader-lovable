import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/AdminLogin";
import AdminLayout from "./components/admin/AdminLayout";
import AdminProdutos from "./pages/admin/AdminProdutos";
import AdminPedidos from "./pages/admin/AdminPedidos";
import AdminAcompanhamentos from "./pages/admin/AdminAcompanhamentos";
import AdminRelatorios from "./pages/admin/AdminRelatorios";
import AdminConfiguracoes from "./pages/admin/AdminConfiguracoes";
import AdminCupons from "./pages/admin/AdminCupons";
import OrderTracking from "./pages/OrderTracking";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/pedido/:id" element={<OrderTracking />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/produtos" replace />} />
              <Route path="produtos" element={<AdminProdutos />} />
              <Route path="pedidos" element={<AdminPedidos />} />
              <Route path="acompanhamentos" element={<AdminAcompanhamentos />} />
              <Route path="relatorios" element={<AdminRelatorios />} />
              <Route path="configuracoes" element={<AdminConfiguracoes />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
