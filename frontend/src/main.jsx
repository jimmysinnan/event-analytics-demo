import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Détection ouverture en mode fichier (file://) — redirige vers localhost
if (window.location.protocol === 'file:') {
  document.getElementById('root').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#05080F;font-family:system-ui;padding:2rem;text-align:center">
      <div>
        <div style="font-size:2rem;margin-bottom:1rem">⚠️</div>
        <p style="color:#F0F4FF;font-size:1.125rem;font-weight:600;margin-bottom:.75rem">
          L'application ne peut pas s'ouvrir comme fichier
        </p>
        <p style="color:#8B9BB4;font-size:.9375rem;margin-bottom:1.5rem">
          Double-cliquez sur <strong style="color:#21AAFA">start.bat</strong><br>
          puis ouvrez <strong style="color:#10B981">http://localhost:5174</strong>
        </p>
        <code style="background:#111D33;color:#06B6D4;padding:.5rem 1rem;border-radius:.5rem;font-size:.875rem">
          C:\\Users\\jimmy\\event-analytics-demo\\start.bat
        </code>
      </div>
    </div>
  `
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
