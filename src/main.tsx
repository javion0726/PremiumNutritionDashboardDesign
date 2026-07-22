import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Apply the stored reduced-motion preference before first paint.
try {
  const cfg = JSON.parse(localStorage.getItem('rj_cfg') || '{}')
  if (cfg.reducedMotion) document.documentElement.classList.add('reduced-motion')
} catch { /* noop */ }

// PWA: register the service worker (production builds only).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {})
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
