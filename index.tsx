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

// PWA Service Worker Registration - Pfad-Korrektur für Hosting in Unterverzeichnissen
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isGitHubPages = window.location.hostname.endsWith('.github.io');
    
    if (isLocal || isGitHubPages) {
      // Nutze relativen Pfad ohne führenden Slash, damit Vite/GH-Pages das korrekt auflösen
      navigator.serviceWorker.register('./sw.js').then(reg => {
        console.debug('ServiceWorker registered:', reg.scope);
      }).catch(err => {
        console.warn('ServiceWorker registration failed:', err);
      });
    }
  });
}

// Remove splash screen after mounting
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