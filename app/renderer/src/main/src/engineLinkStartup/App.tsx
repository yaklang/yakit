import { memo, useEffect, useState } from 'react'
import { StartupPage } from './pages/StartupPage'
import { GetMainColor, getStartupReleaseEditionName, isCommunityEdition, isIRify, isMemfit } from '@/utils/envfile'
import { useTheme } from '@/hook/useTheme'
import { applyYakitThemeColors } from '@/utils/applyYakitThemeColors'
import { yakitApp } from './utils/bridgeFacade'
import styles from './App.module.scss'

const App: React.FC = memo(() => {
  const { theme } = useTheme()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    yakitApp.markRendererReady()
    const titleElement = document.getElementById('app-html-title')
    if (titleElement) {
      titleElement.textContent = getStartupReleaseEditionName()
    }

    // 解压命令执行引擎脚本压缩包
    yakitApp.generateStartEngine()
    // 告诉主进程软件的版本(CE|EE)
    yakitApp.setEnterpriseToDomain(!isCommunityEdition())

    // 通知应用退出
    const offCloseWindow = yakitApp.onCloseWindow(() => {
      yakitApp.exitApp({ showCloseMessageBox: true, isIRify: isIRify(), isMemfit: isMemfit() })
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
