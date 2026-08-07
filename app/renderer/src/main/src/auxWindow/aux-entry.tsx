import { useEffect } from 'react'
import ReactDOM from 'react-dom'
import 'antd/dist/antd.css'
import '@/theme/yakit.scss'
import './styles/aux-base.scss'
import '@/theme/scrollbar.scss'
import AuxWindowApp from './AuxWindowApp'
import { useTheme } from '@/hook/useTheme'
import { applyAuxThemeColors } from '@/auxWindow/utils/applyAuxThemeColors'
import { registerAppSyncHandlers } from '@/auxWindow/utils/messaging'
import { setupMonacoWorkers } from '@/setupMonacoWorkers'

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

ReactDOM.render(<App />, document.getElementById('root'))
