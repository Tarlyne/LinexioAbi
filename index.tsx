import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/**
 * Robust Service Worker Registration System V4.2
 * Nutzt absolute Pfade zur Vermeidung von Scope-Konflikten auf GitHub Pages.
 */
const isAiStudio = window.location.hostname.includes('usercontent.goog');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Registrierung über den absoluten Pfad des Repositoriums
    const swPath = '/LinexioAbi/sw.js';

    navigator.serviceWorker
      .register(swPath)
      .then((registration) => {
        console.debug('[PWA] ServiceWorker registered:', registration.scope);

        setInterval(
          () => {
            registration.update();
          },
          1000 * 60 * 30
        );

        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.info('[PWA] New version detected. Activation on next reload.');
                }
              }
            };
          }
        };
      })
      .catch((err) => {
        if (isAiStudio) {
          console.debug('[PWA] ServiceWorker registration skipped (AI Studio Sandbox environment)');
        } else {
          console.warn('[PWA] ServiceWorker registration failed:', err);
        }
      });
  });

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      console.info('[PWA] Controller changed. Refreshing...');
      window.location.reload();
      refreshing = true;
    }
  });
}

window.addEventListener('load', () => {
  const splash = document.getElementById('splash-screen');
  if (splash) {
    setTimeout(() => {
      splash.style.opacity = '0';
      splash.style.visibility = 'hidden';
      setTimeout(() => splash.remove(), 500);
    }, 400);
  }
});
