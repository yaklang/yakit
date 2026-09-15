import { useEffect } from 'react'
import '@ant-design/v5-patch-for-react-19'
import { createRoot } from 'react-dom/client'
import 'antd/dist/reset.css'
import '@/theme/yakit.scss'
import './styles/aux-base.scss'
import '@/theme/scrollbar.scss'
import '@/theme/componentsTheme/formItemHelp.css'
import { ConfigProvider } from 'antd'
import { YakitAntdProvider } from '@/theme/antdTheme'
import { NotificationProvider } from '@/utils/notification'
import AuxWindowApp from './AuxWindowApp'
import { useTheme, resolveTheme } from '@/hook/useTheme'
import { applyAuxThemeColors } from '@/auxWindow/utils/applyAuxThemeColors'
import { registerAppSyncHandlers } from '@/auxWindow/utils/messaging'
import { setupMonacoWorkers } from '@/utils/monacoSpec/setupMonacoWorkers'

setupMonacoWorkers()
applyAuxThemeColors(resolveTheme(useTheme.getState().theme))

const initialLoading = document.getElementById('initial-loading')
if (initialLoading) {
  initialLoading.remove()
}

const App = () => {
  useEffect(() => {
    return registerAppSyncHandlers()
  }, [])

  return <AuxWindowApp />
}

ConfigProvider.config({
  holderRender: (node) => <YakitAntdProvider>{node}</YakitAntdProvider>,
})

createRoot(document.getElementById('root')!).render(
  <YakitAntdProvider>
    <NotificationProvider>
      <App />
    </NotificationProvider>
  </YakitAntdProvider>,
)
