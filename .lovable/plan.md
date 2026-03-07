
## Analise do Projeto

O projeto `ges-salgados` é um sistema de cardápio/lanchonete construído em **Next.js 16 + React 19 + Tailwind CSS v4 + Supabase + Zustand**.

**Problema central:** O Lovable roda **React + Vite**, e Next.js NÃO é suportado. Isso significa que não é possível simplesmente "puxar" o código — ele precisa ser **portado** para funcionar aqui.

### O que o projeto faz:
- Cardápio online de salgados/coxinhas com categorias (Todos, Coxinhas, Salgados, Porções, Pastel, Bebidas)
- Produtos carregados do Supabase (`products` e `acompanhamentos`)
- Carrinho lateral com quantidade, sabores e acompanhamentos
- Modal de checkout com taxa de entrega por bairro
- Envio do pedido via WhatsApp
- Dark/light mode
- Modal para escolha de sabores de pastel

### Estrutura de componentes:
```
Header, HeroBanner, CategoryFilter, ProductCard
CartSidebar, CartFloatingButton
CheckoutModal, PastelFlavorModal
Footer
```

### Stack original vs Lovable:
```
Original (Next.js)        → Lovable (React+Vite)
------------------------------------------------------
next/font                 → Google Fonts via index.css
Server Components         → React hooks/useEffect
API Route /api/orders     → Supabase direto ou Edge Fn
zustand                   → zustand (compativel!)
@supabase/supabase-js     → @supabase/supabase-js
Tailwind v4               → Tailwind v3 (ja instalado)
CSS vars customizadas     → mesmas vars no index.css
```

## Plano de Portagem

### O que vou fazer (em modo Build):

1. **Instalar dependencias** — `zustand` e `@supabase/supabase-js`

2. **Recriar os types** — `src/types/index.ts` (Product, CartItem, Category) — identico ao original

3. **Recriar o cart store** — `src/store/cart-store.ts` com Zustand (identico, remover `'use client'`)

4. **Recriar os componentes** portando de Next.js para React puro:
   - `Header.tsx`, `HeroBanner.tsx`, `Footer.tsx`
   - `CategoryFilter.tsx`, `ProductCard.tsx`
   - `CartSidebar.tsx`, `CartFloatingButton.tsx`
   - `CheckoutModal.tsx`, `PastelFlavorModal.tsx`

5. **Recriar o lib/supabase.ts** usando variaveis de ambiente do Lovable

6. **Atualizar o index.css** com as CSS vars do globals.css original (temas claro/escuro)

7. **Atualizar `src/pages/Index.tsx`** para buscar produtos do Supabase com `useEffect` e renderizar o `HomeClient`

8. **Configurar Supabase** — conectar o Lovable Cloud ao Supabase com as tabelas `products` e `acompanhamentos`

### Observacoes importantes:
- A rota `/api/orders` (Next.js API Route) sera substituida por uma chamada direta ao Supabase (insert na tabela `orders`)
- O envio por WhatsApp (link `wa.me`) funciona igual
- As imagens dos produtos ficam hospedadas no Supabase Storage ou URLs externas, sem mudanca
- O dark mode usara `next-themes` (ja instalado no Lovable) em vez da implementacao customizada do Next.js

### Prerequisito para voce:
Voce precisara conectar o Supabase nas configuracoes do Lovable (**Settings → Cloud**) e fornecer as variaveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, ou usar o **Lovable Cloud** integrado e criar as tabelas la.
