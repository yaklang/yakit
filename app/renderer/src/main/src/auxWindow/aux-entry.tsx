import { useEffect } from 'react'
import ReactDOM from 'react-dom'
import 'antd/dist/reset.css'
import '@/theme/yakit.scss'
import './styles/aux-base.scss'
import '@/theme/scrollbar.scss'
import '@/theme/componentsTheme/formItemHelp.css'
import { ConfigProvider } from 'antd'
import { yakitAntdTheme } from '@/theme/antdTheme'
import { NotificationProvider } from '@/utils/notification'
import AuxWindowApp from './AuxWindowApp'
import { useTheme } from '@/hook/useTheme'
import { applyAuxThemeColors } from '@/auxWindow/utils/applyAuxThemeColors'
import { registerAppSyncHandlers } from '@/auxWindow/utils/messaging'
import { setupMonacoWorkers } from '@/utils/monacoSpec/setupMonacoWorkers'

setupMonacoWorkers()
applyAuxThemeColors(useTheme.getState().theme)

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

ReactDOM.render(
  <ConfigProvider theme={yakitAntdTheme} wave={{ disabled: true }} button={{ autoInsertSpace: false }}>
    <NotificationProvider>
      <App />
    </NotificationProvider>
  </ConfigProvider>,
  document.getElementById('root'),
)
