import { useCallback, useEffect, useState } from 'react';

type NotificationPermission = 'default' | 'granted' | 'denied';

/**
 * Wrapper para a Notification API do navegador.
 * - `permission`: estado atual da permissão
 * - `requestPermission()`: pede permissão ao usuário (precisa de gesto do usuário)
 * - `notify(title, options)`: exibe notificação se permitido
 */
export function useBrowserNotification() {
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
    return Notification.permission as NotificationPermission;
  });

  const isSupported = typeof window !== 'undefined' && 'Notification' in window;

  // Sincroniza se o usuário mudar permissão externamente
  useEffect(() => {
    if (!isSupported) return;
    setPermission(Notification.permission as NotificationPermission);
  }, [isSupported]);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) return 'denied';
    if (Notification.permission === 'granted') {
      setPermission('granted');
      return 'granted';
    }
    const result = await Notification.requestPermission();
    setPermission(result as NotificationPermission);
    return result as NotificationPermission;
  }, [isSupported]);

  const notify = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!isSupported || Notification.permission !== 'granted') return;
      const n = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });
      // Auto-fecha após 8 segundos
      setTimeout(() => n.close(), 8000);
      // Foca a aba ao clicar
      n.onclick = () => {
        window.focus();
        n.close();
      };
    },
    [isSupported]
  );

  return { permission, isSupported, requestPermission, notify };
}
