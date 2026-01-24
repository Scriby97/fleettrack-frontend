'use client';

import { useEffect } from 'react';

export function UnregisterServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
          console.log('[SW_CLEANUP] Service Worker unregistered');
        }
      });
      
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => {
            caches.delete(name);
            console.log('[SW_CLEANUP] Cache deleted:', name);
          });
        });
      }
    }
  }, []);

  return null;
}
