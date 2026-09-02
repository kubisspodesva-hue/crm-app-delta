'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // Service worker registrujeme jen v produkci - v `next dev` by cache
    // service workeru jen komplikovala vývoj (staré assety, hot reload apod.)
    if (process.env.NODE_ENV !== 'production') return;

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Registrace service workeru selhala:', err);
      });
    });
  }, []);

  return null;
}
