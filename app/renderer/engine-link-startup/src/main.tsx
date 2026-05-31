import { Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.scss'
import '@/i18n/i18n'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <Suspense fallback={null}>
    <App />
  </Suspense>,
)
