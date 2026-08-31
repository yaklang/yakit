import { Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n/i18n'
import './index.scss'
import App from './App'
import { ConfigProvider } from 'antd'
import { NotificationProvider } from './utils/notification'
import { yakitAntdTheme } from './theme/antdTheme'

createRoot(document.getElementById('root')!).render(
  <Suspense fallback={'loading'}>
    <ConfigProvider theme={yakitAntdTheme} wave={{ disabled: true }} button={{ autoInsertSpace: false }}>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </ConfigProvider>
  </Suspense>,
)
