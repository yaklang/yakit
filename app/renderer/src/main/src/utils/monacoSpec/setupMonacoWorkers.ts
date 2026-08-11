// CRA 时代由 MonacoWebpackPlugin 自动注入 editor.main.css；Vite 下必须显式引入，
// 否则 .monaco-editor 无样式，编辑器 DOM 会渲染成重叠错乱的纯文本
import 'monaco-editor/min/vs/editor/editor.main.css'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

/** Vite `?worker`：dev / prod（含 asar 相对路径）均可加载 Monaco worker */
export function setupMonacoWorkers() {
  window.MonacoEnvironment = {
    getWorker(_moduleId: string, label: string) {
      switch (label) {
        case 'json':
          return new JsonWorker()
        case 'css':
        case 'scss':
        case 'less':
          return new CssWorker()
        case 'html':
        case 'handlebars':
        case 'razor':
        case 'markdown':
          return new HtmlWorker()
        case 'typescript':
        case 'javascript':
          return new TsWorker()
        default:
          return new EditorWorker()
      }
    },
  }
}
