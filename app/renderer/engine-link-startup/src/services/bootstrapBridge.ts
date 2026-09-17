import { ipc } from './ipc'

function report(content: string) {
  if (!window.yakitTransport) return
  if (!document.body?.children?.length || !document.getElementById('root')?.children?.length) {
    void ipc.invoke('local', 'render-crash-flag', {}).catch(() => {})
  }
  if (content) void ipc.invoke('local', 'render-error-log', content).catch(() => {})
}

const rejection = (event: PromiseRejectionEvent) =>
  report(event.reason instanceof Error ? event.reason.stack || '' : '')
const error = (event: ErrorEvent) => report(`${event.message || ''}\n${event.error?.stack || ''}\n`)
window.addEventListener('unhandledrejection', rejection)
window.addEventListener('error', error)
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    window.removeEventListener('unhandledrejection', rejection)
    window.removeEventListener('error', error)
  })
