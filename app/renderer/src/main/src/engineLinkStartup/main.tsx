import '@ant-design/v5-patch-for-react-19'
import '@/i18n/i18n'
/** 主项目全局样式；antd reset 必须先于业务组件样式 */
import 'antd/dist/reset.css'
import '@/styles/index.css'
import '@/theme/componentsTheme/antdCssVar.scss'
import '@/theme/componentsTheme/form.scss'
import '@/theme/yakitBase.scss'
import '@/theme/scrollbar.scss'
import './theme/themeClass.scss'
import '@/theme/componentsTheme/formItemHelp.css'
import './index.scss'
import { Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { NotificationProvider } from '@/utils/notification'
import { YakitAntdProvider } from '@/theme/antdTheme'
import { registerLinkAppSyncHandlers } from './utils/appSync'
import { checkLinkBridgeCapabilities } from './utils/bridgeSelfCheck'
import { getEngineLinkBridge } from './utils/bridgeFacade'
import { installDroppedFilePath } from './utils/installDroppedFilePath'

installDroppedFilePath(File, getEngineLinkBridge()?.app?.getPathForFile)

if (import.meta.env.DEV) checkLinkBridgeCapabilities()
const disposeLinkAppSync = registerLinkAppSyncHandlers()
if (import.meta.hot) import.meta.hot.dispose(disposeLinkAppSync)

createRoot(document.getElementById('root')!).render(
  <Suspense fallback={'loading'}>
    <YakitAntdProvider>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </YakitAntdProvider>
  </Suspense>,
)
