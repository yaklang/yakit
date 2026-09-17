import { ipc } from '../../../shared/communication/window-client'
import { memo, useEffect, useState } from 'react'
import { StartupPage } from './pages/StartupPage'
import './theme/ThemeClass.scss'
import './theme/yakit.scss'
import { GetMainColor, getReleaseEditionName, isCommunityEdition, isIRify, isMemfit } from './utils/envfile'
import { useTheme } from './hooks/useTheme'
import { applyYakitThemeColors } from './utils/applyYakitThemeColors'
import styles from './App.module.scss'

const App: React.FC = memo(() => {
  const { theme } = useTheme()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    ipc.invoke('local', 'engine-win-render-ok', {})
    const titleElement = document.getElementById('app-html-title')
    if (titleElement) {
      titleElement.textContent = getReleaseEditionName()
    }

    // 解压命令执行引擎脚本压缩包
    ipc.invoke('local', 'generate-start-engine', {})
    // 告诉主进程软件的版本(CE|EE)
    ipc.invoke('local', 'is-enpritrace-to-domain', !isCommunityEdition())

    // 通知应用退出
    const offCloseWindow = ipc.on('close-engineLinkWin-renderer', () => {
      ipc.invoke('local', 'app-exit', { showCloseMessageBox: true, isIRify: isIRify(), isMemfit: isMemfit() })
    })

    return () => {
      offCloseWindow()
    }
  }, [])

  // 主题色处理
  useEffect(() => {
    applyYakitThemeColors(theme, GetMainColor(theme))
    setReady(true)
  }, [theme])

  return <div className={styles['app']}>{ready && <StartupPage />}</div>
})

export default App
