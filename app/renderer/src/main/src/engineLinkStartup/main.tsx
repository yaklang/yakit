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
import { getYakitBridge } from '@/services/yakitBridge'
import { installDroppedFilePath } from './utils/installDroppedFilePath'

// 先检查 preload 是否注入 bridge，再加载依赖 bridge 的 App 入口。
// 否则 bridgeFacade 顶层 getBridge() 会先抛错，bridgeSelfCheck 的提示不会执行。
const bridge = getYakitBridge() as unknown as EngineLinkBridge | undefined
const root = document.getElementById('root')

if (!bridge) {
  console.error('[engine-link] missing bridge capabilities: yakitBridge')
  if (root)
    root.textContent =
      'Link 启动页加载失败：preload 未注入 yakitBridge / Link startup failed: yakitBridge was not injected by preload'
} else {
  installDroppedFilePath(File, bridge.app?.getPathForFile)
  void import('./bootstrap').catch((error) => {
    console.error('[engine-link] bootstrap failed', error)
    if (root) root.textContent = 'Link 启动页加载失败 / Link startup failed'
  })
}
