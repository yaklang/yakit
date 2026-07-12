interface ExecResult {
  Hash: string
  OutputJson: string
  Raw: Uint8Array
  IsMessage: boolean
  Message: Uint8Array
  Id?: number
  Progress: number
  RuntimeID?: string
}

export const writeXTerm = (xterm: any, data: string) => {
  if (xterm && xterm?.current) {
    xterm.current.terminal.write(data)
  }
}

export const writeExecResultXTerm = (xterm: any, result: ExecResult, encoding?: 'utf8' | 'latin1') => {
  if ((result?.Raw || []).length > 0) {
    writeXTerm(xterm, Buffer.from(result.Raw).toString(encoding || 'utf8'))
  }
}

export const xtermFit = (xtermRef: any, columns?: number, rows?: number) => {
  if (xtermRef && xtermRef?.current && isTerminalReady(xtermRef.current.terminal)) {
    try {
      xtermRef.current.terminal.resize(columns || 100, rows || 10)
    } catch (e) {
      // 关键词: xterm resize error swallowed, 防止 _renderService.dimensions 崩溃冒泡到 UI
    }
  }
}

export const xtermClear = (xtermRef: any, columns?: number, rows?: number) => {
  if (xtermRef && xtermRef?.current && isTerminalReady(xtermRef.current.terminal)) {
    try {
      xtermRef.current.terminal.reset()
    } catch (e) {
      // 关键词: xterm reset error swallowed, 防止 Viewport.syncScrollArea 在 renderer 未就绪时崩溃
    }
  }
}

// 关键词: xterm dimensions crash, _renderService undefined, terminal.reset 报错
// xterm 的 RenderService.dimensions getter 在 renderer 未就绪/已 dispose 时会抛
// "Cannot read properties of undefined (reading 'dimensions')"。
// 该校验用于在 open 尚未完成、或组件已被 dispose 时，避免 reset/resize 触发 Viewport.syncScrollArea 崩溃。
export const isTerminalReady = (terminal: any): boolean => {
  if (!terminal) return false
  // terminal.element 仅在 Terminal.open 成功后被赋值
  if (!terminal.element) return false
  // 兜底：能拿到内部 RenderService 时，用其公开的 hasRenderer 判定
  const renderService = terminal._core?._renderService
  if (renderService && typeof renderService.hasRenderer === 'function') {
    return renderService.hasRenderer()
  }
  // 拿不到内部结构时，退化成仅依赖 element 是否存在
  return true
}
