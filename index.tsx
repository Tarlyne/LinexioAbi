
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.log('SW registration failed: ', err);
    });
  });
}

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

// Remove splash screen after mounting
window.addEventListener('load', () => {
  const splash = document.getElementById('splash-screen');
  if (splash) {
    // Kurze Verzögerung für smoothes Gefühl
    setTimeout(() => {
      splash.style.opacity = '0';
      splash.style.visibility = 'hidden';
      setTimeout(() => splash.remove(), 500);
    }, 400);
  }
});
