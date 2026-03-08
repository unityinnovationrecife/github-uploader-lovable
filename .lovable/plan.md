
## Análise do Estado Atual do Sistema

### O que já está implementado:

**Loja (cliente)**
- Cardápio completo com categorias, filtro visual e busca por categoria
- Carrinho lateral + botão flutuante
- Checkout em 2 passos (itens + dados de entrega)
- Seleção de sabores (Pastel) e acompanhamentos
- Observações/nota no pedido
- Indicador de loja aberta/fechada no header
- Notificação WhatsApp para lojista + cliente via Evolution API
- Rastreamento de pedido em tempo real (`/pedido/:id`) com timeline e link compartilhável

**Painel Admin**
- Autenticação (login/logout)
- Gestão de produtos (CRUD + upload de imagem + toggle visível)
- Gestão de acompanhamentos
- Gestão de pedidos (filtros, busca, paginação, mudança de status, arquivar, impressão térmica)
- Notificações: push (Notification API) + som + toast ao receber novo pedido
- Relatórios com gráficos (pedidos/dia, produtos mais vendidos, exportação CSV/PDF)
- Configurações: zonas de entrega com taxas + horários de funcionamento

---

### O que falta para o sistema estar completo:

**1. Bloquear checkout quando loja fechada** (CRÍTICO para operação)
- O `getStoreStatusFromHours` já existe e o Header já exibe o status
- Mas o checkout não verifica se a loja está aberta — cliente consegue fechar pedido a qualquer hora
- Solução: exibir banner e bloquear botão "Finalizar Pedido" quando `storeStatus.isOpen === false`

**2. Toggle de produto esgotado/indisponível no admin** (já existe o campo `visible` mas falta toggle rápido)
- `AdminProdutos` já tem campo `visible` no formulário de edição completo
- Mas não tem toggle rápido na listagem para marcar como "Esgotado" sem abrir o formulário
- Produtos invisíveis somem do cardápio — seria melhor um estado "esgotado" que aparece mas não permite adicionar

**3. Notificação WhatsApp automática ao mudar status** (muito requisitado)
- Ao mudar status no `AdminPedidos` (ex: confirmed → delivering), nenhuma mensagem é enviada ao cliente
- A Edge Function `send-whatsapp` já está pronta para uso
- Falta: no `handleStatusChange` do AdminPedidos, invocar a função com mensagem de status para o `customer_phone`

**4. Valor mínimo de pedido** (bom para operação)
- Não existe configuração de pedido mínimo
- Falta: campo em `AdminConfiguracoes` + tabela `store_settings` + bloqueio no checkout

**5. Campo de troco no checkout** (quando pagamento = Dinheiro)
- Não há campo "troco para quanto?" quando cliente seleciona dinheiro
- Simples de adicionar no `CheckoutModal` step 2

**6. Busca de produtos no cardápio** (UX)
- O `HomeClient` tem apenas filtro por categoria
- Falta uma barra de busca por nome

---

### Plano de implementação (itens mais impactantes primeiro):

**Prioridade 1 — Bloquear checkout quando fechado**
- Verificar `storeStatus.isOpen` dentro do `CheckoutModal` usando `useStoreHours` + `getStoreStatusFromHours`
- Mostrar tela de bloqueio no lugar do formulário com horário de funcionamento

**Prioridade 2 — WhatsApp automático ao mudar status**
- Em `AdminPedidos`, na função `handleStatusChange`, invocar `send-whatsapp` com mensagem personalizada por status (confirmado, preparando, saiu para entrega, entregue)
- Só enviar se `order.customer_phone` estiver preenchido

**Prioridade 3 — Campo de troco no checkout**
- Adicionar `useState troco` no `CheckoutModal`
- Exibir input condicional quando `pagamento === 'Dinheiro'`
- Incluir na mensagem WhatsApp e no banco (coluna `change_for` ou incluir nas `notes`)

**Prioridade 4 — Toggle rápido de disponibilidade no admin**
- Na listagem de produtos, adicionar switch "Disponível/Esgotado" ao lado de cada produto
- Badge "Esgotado" no `ProductCard` na loja para produtos com `visible = false` (em vez de ocultar)

**Prioridade 5 — Busca de produtos**
- Input de busca acima das categorias no `HomeClient`
- Filtrar `filteredProducts` por nome em tempo real

**Prioridade 6 — Valor mínimo de pedido**
- Migration: tabela `store_settings` com chave/valor
- Configurações admin: campo "Pedido mínimo (R$)"
- Checkout: bloquear se `subtotal < minimumOrder`

---

### Arquivos que serão alterados:

```text
Prioridade 1 — Bloquear checkout
  src/components/CheckoutModal.tsx        (adicionar verificação de horário)

Prioridade 2 — WhatsApp ao mudar status
  src/pages/admin/AdminPedidos.tsx        (invocar send-whatsapp no handleStatusChange)

Prioridade 3 — Campo de troco
  src/components/CheckoutModal.tsx        (input condicional + mensagem WA)

Prioridade 4 — Toggle disponibilidade
  src/pages/admin/AdminProdutos.tsx       (switch rápido na listagem)
  src/components/ProductCard.tsx          (badge "Esgotado")

Prioridade 5 — Busca de produtos
  src/components/HomeClient.tsx           (barra de busca + filtro)

Prioridade 6 — Pedido mínimo
  supabase/migrations/...                 (tabela store_settings)
  src/pages/admin/AdminConfiguracoes.tsx  (campo pedido mínimo)
  src/components/CheckoutModal.tsx        (validação)
```

---

### O que implementar nessa mensagem:

Implementar os 3 mais críticos juntos:
1. Bloquear checkout quando a loja está fechada
2. WhatsApp automático ao mudar status do pedido no admin
3. Campo de troco quando pagamento = Dinheiro

Estes 3 itens não exigem migration de banco e têm impacto direto na operação real da loja.
