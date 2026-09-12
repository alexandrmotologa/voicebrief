import { useEffect, useCallback } from 'react';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        initData: string;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
        };
        colorScheme?: 'light' | 'dark';
        themeParams?: Record<string, string>;
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        MainButton?: {
          text: string;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          onClick: (fn: () => void) => void;
          offClick: (fn: () => void) => void;
        };
      };
    };
  }
}

export function useTelegram() {
  const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
    }
  }, [tg]);

  const hapticImpact = useCallback(
    (style: 'light' | 'medium' | 'heavy' = 'light') => {
      tg?.HapticFeedback?.impactOccurred(style);
    },
    [tg]
  );

  const hapticNotification = useCallback(
    (type: 'error' | 'success' | 'warning' = 'success') => {
      tg?.HapticFeedback?.notificationOccurred(type);
    },
    [tg]
  );

  const hapticSelection = useCallback(() => {
    tg?.HapticFeedback?.selectionChanged();
  }, [tg]);

  return {
    tg,
    user: tg?.initDataUnsafe?.user,
    colorScheme: tg?.colorScheme || 'dark',
    initData: tg?.initData || 'demo',
    hapticImpact,
    hapticNotification,
    hapticSelection,
  };
}
