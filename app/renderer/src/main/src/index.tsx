import ReactDOM from 'react-dom'
/** 该样式必须放在APP组件的前面，因为里面有antd样式，放后面会把APP组件内的样式覆盖 */
import 'antd/dist/reset.css'
import './styles/index.css'
import NewApp from './newApp/NewApp'
import { ConfigProvider } from 'antd'
import { yakitAntdTheme } from './theme/antdTheme'
import { NotificationProvider } from './utils/notification'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { DndProvider } from 'react-dnd'
// import {createRoot} from "react-dom/client"
import './theme/yakit.scss'
import './assets/global.scss'
import './theme/scrollbar.scss'
import './pages/GlobalClass.scss'
import './theme/componentsTheme/formItemHelp.css'
import { Suspense, lazy, useEffect, useState } from 'react'
const ChildNewApp = lazy(() => import('./newApp/ChildNewApp'))
const MarkdownPdfPrintPage = lazy(() => import('./pages/irifyAiCodeAudit/MarkdownPdfPrint/MarkdownPdfPrintPage'))
import { GetMainColor } from './utils/envfile'
import { useTheme } from './hook/useTheme'
import { applyYakitThemeColors } from './utils/applyYakitThemeColors'
import { registerAppSyncHandlers } from '@/auxWindow/utils/messaging'
import { debugToPrintLogs } from './utils/logCollection'

// 延迟加载并发流桥接，避免首屏同步拉入 AI-agent 会话机制
import('@/pages/ai-agent/components/ConcurrentStreamCard/concurrentStream/concurrentStreamMainBridge')
  .then(({ setupConcurrentStreamMainBridge }) => setupConcurrentStreamMainBridge())
  .catch((err) => {
    // chunk 失败时全局 unhandledrejection 也会记日志；此处显式 catch，避免启动期控制台噪音
    debugToPrintLogs({
      page: 'index',
      fun: 'setupConcurrentStreamMainBridge',
      content: err,
    })
  })

import { setupMonacoWorkers } from './utils/monacoSpec/setupMonacoWorkers'
setupMonacoWorkers()

const getQueryParam = (param) => {
  return new URLSearchParams(window.location.search).get(param)
}

const App = () => {
  const [windowType, setWindowType] = useState(getQueryParam('window'))

  useEffect(() => {
    const onPopState = () => {
      setWindowType(getQueryParam('window'))
    }

    window.addEventListener('popstate', onPopState)

    // 捕获运行中的JS 语法错误及异常
    const onErrorLog = (event: ErrorEvent) => {
      debugToPrintLogs({
        page: 'index',
        fun: 'addEventListener error',
        content: event,
      })
    }
    window.addEventListener('error', onErrorLog)

    // 捕获运行中的Promise未处理的异常
    const onUnhandledrejectionLog = (event: PromiseRejectionEvent) => {
      debugToPrintLogs({
        page: 'index',
        fun: 'addEventListener unhandledrejection',
        content: event,
      })
    }
    window.addEventListener('unhandledrejection', onUnhandledrejectionLog)
    return () => {
      window.removeEventListener('popstate', onPopState)
      window.removeEventListener('error', onErrorLog)
      window.removeEventListener('unhandledrejection', onUnhandledrejectionLog)
    }
  }, [])

  const { theme } = useTheme()
  useEffect(() => {
    applyYakitThemeColors(theme, GetMainColor(theme))
  }, [theme])

  if (windowType === 'markdown-pdf-print') {
    return <MarkdownPdfPrintPage />
  }
  return windowType === 'child' ? <ChildNewApp /> : <NewApp />
}

// 只在子窗口移除 loading
if (window.location.search.includes('window=child') || window.location.search.includes('window=markdown-pdf-print')) {
  const initialLoading = document.getElementById('initial-loading')
  if (initialLoading) {
    initialLoading.remove()
  }
}

// const divRoot = document.getElementById("root")
// if (divRoot) {
//     createRoot(divRoot).render(
//         // <React.StrictMode>
//         <DndProvider backend={HTML5Backend}>
//             <NewApp />
//         </DndProvider>
//         // </React.StrictMode>,
//     )
// } else {
//     // 正常情况/理论情况下，是不会出现这个情况
//     createRoot(document.body).render(<div>此安装包有问题,请联系Yakit官方管理员</div>)
// }
// ahooks useVirtualList在createRoot(divRoot).render生成下的元素会出现渲染不及时，掉帧闪的问题，暂时先换成ReactDOM.render，期待官方修复
// antd menu 存在多个二级菜单时, 在createRoot(divRoot).render生成下，会导致鼠标从一个二级菜单移动到下一个二级菜单后，前一个二级菜单不消失的情况，暂不确定原因，等升级antd5后再次尝试

registerAppSyncHandlers()

ReactDOM.render(
  // <React.StrictMode>
  <DndProvider backend={HTML5Backend}>
    <ConfigProvider theme={yakitAntdTheme} wave={{ disabled: true }} button={{ autoInsertSpace: false }}>
      <NotificationProvider>
        <Suspense fallback={<div>loading...</div>}>
          <App />
        </Suspense>
      </NotificationProvider>
    </ConfigProvider>
  </DndProvider>,
  // </React.StrictMode>,
  document.getElementById('root'),
)
