import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/**
 * Robust Service Worker Registration System V3.7
 * Implementiert Umgebungserkennung zur Vermeidung von Sandbox-Fehlern (Kategorie B).
 */
const isAiStudio = window.location.hostname.includes('usercontent.goog');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(registration => {
      console.debug('[PWA] ServiceWorker registered:', registration.scope);
      
      // Regelmäßige Prüfung auf Updates (alle 30 Min)
      setInterval(() => {
        registration.update();
      }, 1000 * 60 * 30);

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
    }).catch(err => {
      // In der AI Studio Sandbox schlägt die Registrierung aufgrund von Cross-Origin-Policies 
      // zwangsläufig fehl. Wir loggen dies nur als Debug-Information, um die Konsole sauber zu halten.
      if (isAiStudio) {
        console.debug('[PWA] ServiceWorker registration skipped (AI Studio Sandbox environment)');
      } else {
        console.warn('[PWA] ServiceWorker registration failed:', err);
      }
    });
  });

  // Automatischer Reload bei neuem Controller (Update-Abschluss)
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      console.info('[PWA] Controller changed. Refreshing...');
      window.location.reload();
      refreshing = true;
    }
  });
}

// Splash-Screen Entfernung
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