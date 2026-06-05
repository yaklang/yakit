import { Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n/i18n'
import './index.scss'
import App from './App'
import { ConfigProvider } from 'antd'
import { NotificationProvider } from './utils/notification'

createRoot(document.getElementById('root')!).render(
  <Suspense fallback={'loading'}>
    <ConfigProvider wave={{ disabled: true }}>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </ConfigProvider>
  </Suspense>,
)
