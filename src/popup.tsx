import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './popup.css'
import PopupView from './components/PopupView'

createRoot(document.getElementById('popup-root')!).render(
  <StrictMode>
    <PopupView />
  </StrictMode>,
)
