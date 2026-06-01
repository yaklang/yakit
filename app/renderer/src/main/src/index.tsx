import ReactDOM from 'react-dom'
import reportWebVitals from './reportWebVitals'
/** 该样式必须放在APP组件的前面，因为里面有antd样式，放后面会把APP组件内的样式覆盖 */
import './index.css'
import NewApp from './NewApp'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { DndProvider } from 'react-dnd'
// import {createRoot} from "react-dom/client"
import './yakitUI.scss'
import './theme/yakit.scss'
import './yakitLib.scss'
import './assets/global.scss'
import './theme/scrollbar.scss'
import { Suspense, useEffect, useState } from 'react'
import ChildNewApp from './ChildNewApp'
import MarkdownPdfPrintPage from './pages/irifyAiCodeAudit/MarkdownPdfPrint/MarkdownPdfPrintPage'
import { getLocalValue } from './utils/kv'
import { GetMainColor, getRemoteI18nGV } from './utils/envfile'
import i18n from '@/i18n/i18n'
import { useTheme } from './hook/useTheme'
import { applyYakitThemeColors } from './utils/applyYakitThemeColors'
import { registerAppSyncHandlers } from '@/auxWindow/utils/messaging'
import { setupConcurrentStreamMainBridge } from '@/pages/ai-agent/components/ConcurrentStreamCard/concurrentStream/concurrentStreamMainBridge'
import { debugToPrintLogs } from './utils/logCollection'
import { ConfigProvider } from 'antd'

const MONACO_WORKER_BASE = 'static/js/monaco'

window.MonacoEnvironment = {
  getWorkerUrl: function (moduleId, label) {
    switch (label) {
      case 'json':
        return `${MONACO_WORKER_BASE}/json.worker.js`
      case 'yaml':
        return `${MONACO_WORKER_BASE}/yaml.worker.js`
      case 'java':
        return `${MONACO_WORKER_BASE}/java.worker.js`
      case 'go':
        return `${MONACO_WORKER_BASE}/go.worker.js`
      case 'html':
      case 'markdown':
        return `${MONACO_WORKER_BASE}/html.worker.js`
      case 'css':
        return `${MONACO_WORKER_BASE}/css.worker.js`
      default:
        // 有代码高亮、查找、代码折叠等基础功能
        // 但是它不包含各个语言的智能分析、补全、校验等高级功能
        return `${MONACO_WORKER_BASE}/editor.worker.js`
    }
  },
}

const getQueryParam = (param) => {
  return new URLSearchParams(window.location.search).get(param)
}

const App = () => {
  const [windowType, setWindowType] = useState(getQueryParam('window'))

  useEffect(() => {
    getLocalValue(getRemoteI18nGV())
      .then((savedLang) => {
        if (savedLang) {
          i18n.changeLanguage(savedLang)
        }
      })
      .catch((err) => console.error(err))

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
  return (
    <ConfigProvider wave={{ disabled: true }}>{windowType === 'child' ? <ChildNewApp /> : <NewApp />}</ConfigProvider>
  )
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
setupConcurrentStreamMainBridge()

ReactDOM.render(
  // <React.StrictMode>
  <DndProvider backend={HTML5Backend}>
    <Suspense fallback={<div>loading...</div>}>
      <App />
    </Suspense>
  </DndProvider>,
  // </React.StrictMode>,
  document.getElementById('root'),
)
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
