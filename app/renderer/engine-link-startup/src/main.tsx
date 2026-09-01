import { Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n/i18n'
import './index.scss'
import App from './App'
import { NotificationProvider } from './utils/notification'
import { YakitAntdProvider } from './theme/antdTheme'

createRoot(document.getElementById('root')!).render(
  <Suspense fallback={'loading'}>
    <YakitAntdProvider>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </YakitAntdProvider>
  </Suspense>,
)
