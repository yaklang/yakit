import { memo, useEffect, useState } from 'react'
import { StartupPage } from './pages/StartupPage'
import './theme/ThemeClass.scss'
import './theme/yakit.scss'
import { GetMainColor, getReleaseEditionName, isCommunityEdition, isIRify, isMemfit } from './utils/envfile'
import { useTheme } from './hooks/useTheme'
import { generateAllThemeColors } from './yakit-colors-generator'
import { yakitApp } from './utils/electronBridge'
import styles from './App.module.scss'

function applyThemeColors(theme: 'light' | 'dark', colors: Record<string, string>) {
  const html = document.documentElement

  html.setAttribute('data-theme', theme)

  Object.entries(colors).forEach(([key, value]) => {
    html.style.setProperty(`${key}`, value)
  })
}

const App: React.FC = memo(() => {
  const { theme } = useTheme()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    yakitApp.markRendererReady()
    const titleElement = document.getElementById('app-html-title')
    if (titleElement) {
      titleElement.textContent = getReleaseEditionName()
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
    const targetEditionColor = GetMainColor(theme)
    const colors = generateAllThemeColors(theme, targetEditionColor)
    applyThemeColors(theme, colors)
    setReady(true)
  }, [theme])

  return <div className={styles['app']}>{ready && <StartupPage />}</div>
})

export default App
