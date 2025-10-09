import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { RealtimeProvider } from './context/RealtimeProvider.jsx'
import { initPWA } from './utils/pwa.js'

// Initialiser la PWA
initPWA().then((result) => {
  console.log('[PWA] Initialisation terminée:', result);
}).catch((error) => {
  console.error('[PWA] Erreur d\'initialisation:', error);
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <RealtimeProvider>
        <App />
      </RealtimeProvider>
    </BrowserRouter>
  </StrictMode>,
)
