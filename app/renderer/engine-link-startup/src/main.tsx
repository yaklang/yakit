import { Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n/i18n'
import './index.scss'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <Suspense fallback={'loading'}>
    <App />
  </Suspense>,
)
