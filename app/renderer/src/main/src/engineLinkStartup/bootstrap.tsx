import '@ant-design/v5-patch-for-react-19'
import '@/i18n/i18n'
import { Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { NotificationProvider } from '@/utils/notification'
import { YakitAntdProvider } from '@/theme/antdTheme'
import { registerLinkAppSyncHandlers } from './utils/appSync'
import { checkLinkBridgeCapabilities } from './utils/bridgeSelfCheck'

if (import.meta.env.DEV) checkLinkBridgeCapabilities()
const disposeLinkAppSync = registerLinkAppSyncHandlers()
if (import.meta.hot) import.meta.hot.dispose(disposeLinkAppSync)

createRoot(document.getElementById('root')!).render(
  <Suspense fallback={null}>
    <YakitAntdProvider>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </YakitAntdProvider>
  </Suspense>,
)
