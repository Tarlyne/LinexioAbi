import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

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

// PWA Service Worker Registration - Umgebungsbewusst für GitHub Pages & Localhost
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isGitHubPages = window.location.hostname.endsWith('.github.io');
    
    // Registrierung nur in stabilen Umgebungen, um Origin-Fehler in Sandboxes (wie AI Studio) zu vermeiden
    if (isLocal || isGitHubPages) {
      navigator.serviceWorker.register('./sw.js').then(reg => {
        console.debug('ServiceWorker registered with scope:', reg.scope);
      }).catch(err => {
        console.error('ServiceWorker registration failed:', err);
      });
    } else {
      console.debug('ServiceWorker registration skipped (Sandbox/AI-Studio Environment)');
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