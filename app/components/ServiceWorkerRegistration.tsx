'use client';

import { useEffect } from 'react';
import { setupOnlineSync } from '@/lib/offline/sync';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    // ensure online sync handler is active in the client
    setupOnlineSync();

    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  return null;
}
