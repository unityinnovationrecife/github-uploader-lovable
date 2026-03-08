import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrderSound } from '@/hooks/use-order-sound';
import { useToast } from '@/hooks/use-toast';

/**
 * Escuta novos pedidos via Supabase Realtime.
 * Mantém a contagem de pedidos pendentes (não arquivados).
 * Dispara som + toast a cada novo INSERT com status "pending".
 */
export function usePendingOrders() {
  const [pendingCount, setPendingCount] = useState(0);
  const { playNotification } = useOrderSound();
  const { toast } = useToast();
  const initializedRef = useRef(false);

  // Busca contagem atual de pendentes ao montar
  const fetchPendingCount = useCallback(async () => {
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .eq('archived', false);
    setPendingCount(count ?? 0);
  }, []);

  useEffect(() => {
    fetchPendingCount().then(() => {
      initializedRef.current = true;
    });

    const channel = supabase
      .channel('pending-orders-badge')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new as { status: string; customer_name: string; total: number; archived: boolean };
          if (!initializedRef.current) return;

          if (newOrder.status === 'pending' && !newOrder.archived) {
            setPendingCount((c) => c + 1);
            playNotification();
            toast({
              title: '🛎️ Novo pedido!',
              description: `${newOrder.customer_name} — ${newOrder.total.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}`,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          const updated = payload.new as { status: string; archived: boolean };
          const previous = payload.old as { status: string; archived: boolean };

          const wasActive = previous.status === 'pending' && !previous.archived;
          const isActive = updated.status === 'pending' && !updated.archived;

          if (wasActive && !isActive) {
            // Saiu de pendente → decrementa
            setPendingCount((c) => Math.max(0, c - 1));
          } else if (!wasActive && isActive) {
            // Voltou para pendente → incrementa
            setPendingCount((c) => c + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPendingCount, playNotification, toast]);

  const clearBadge = useCallback(() => setPendingCount(0), []);

  return { pendingCount, clearBadge };
}
