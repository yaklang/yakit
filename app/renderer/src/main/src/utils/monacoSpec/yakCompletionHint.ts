import { monaco } from 'react-monaco-editor'

// 该模块为「纯增强」：在 yak 编辑器里，当用户光标停留一会儿(空闲)时，
// 于光标附近淡入一条极轻量的提示，告诉用户如何主动唤起自动补全，随后自动淡出。
// 设计原则(务必保持)：
//   1. 绝不抛异常打断 Monaco 事件循环——所有回调整体 try/catch 兜底；
//   2. 只读编辑器 / 非 yak 语言 / 未聚焦 / 补全面板已打开 时不展示；
//   3. 定时器与 content widget 在编辑器销毁时全部清理，避免内存泄漏；
//   4. 有冷却时间与总次数上限，避免对老用户造成打扰；
//   5. widget 使用 pointer-events:none，绝不拦截用户操作。
//
// 该文件不修改任何既有逻辑，仅新增行为，可随时整体移除而不影响其他功能。

const YAK_LANGUAGE_ID = 'yak'

// 空闲多久后展示提示
const IDLE_MS = 2600
// 提示可见时长(淡入后停留，随后淡出)
const VISIBLE_MS = 3600
// 淡入/淡出过渡时长，需与 CSS transition 一致
const FADE_MS = 220
// 同一编辑器两次提示之间的最小间隔
const COOLDOWN_MS = 20000
// 全生命周期(持久化)最多展示次数，达到后不再打扰
const MAX_TOTAL_SHOWS = 12
const STORAGE_KEY = 'yak_completion_hint_shows'

const WIDGET_ID = 'yak.completion.hint.widget'

interface HintState {
  idleTimer: ReturnType<typeof setTimeout> | null
  hideTimer: ReturnType<typeof setTimeout> | null
  removeTimer: ReturnType<typeof setTimeout> | null
  widget: monaco.editor.IContentWidget | null
  lastShownAt: number
  disposed: boolean
}

const stateMap = new WeakMap<monaco.editor.ICodeEditor, HintState>()

const isMacPlatform = (): boolean => {
  try {
    const nav: any = typeof navigator !== 'undefined' ? navigator : undefined
    if (!nav) return false
    const p = String(nav.platform || nav.userAgent || '')
    return p.toLowerCase().includes('mac')
  } catch (e) {
    return false
  }
}

// 提示文案：优先展示我们新增的 Alt+/(mac 上 ⌥/)，同时提示 Monaco 自带的 Ctrl+Space。
const getHintText = (): string => {
  return isMacPlatform() ? '⌥ / 或 ⌃Space 唤起补全' : 'Alt+/ 或 Ctrl+Space 唤起补全'
}

const readTotalShows = (): number => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const n = raw ? parseInt(raw, 10) : 0
    return Number.isFinite(n) && n >= 0 ? n : 0
  } catch (e) {
    return 0
  }
}

const bumpTotalShows = () => {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(readTotalShows() + 1))
  } catch (e) {
    // ignore
  }
}

// 判断补全面板是否已经打开：只读地查 DOM，失败则保守认为未打开。
const isSuggestWidgetVisible = (editor: monaco.editor.ICodeEditor): boolean => {
  try {
    const dom = editor.getDomNode()
    if (!dom) return false
    const w = dom.querySelector('.suggest-widget')
    if (!w) return false
    return (w as HTMLElement).classList.contains('visible')
  } catch (e) {
    return false
  }
}

const isReadOnly = (editor: monaco.editor.ICodeEditor): boolean => {
  try {
    return !!editor.getOption(monaco.editor.EditorOption.readOnly)
  } catch (e) {
    return false
  }
}

const isYakEditor = (editor: monaco.editor.ICodeEditor): boolean => {
  try {
    const model = editor.getModel()
    return !!model && model.getLanguageId() === YAK_LANGUAGE_ID
  } catch (e) {
    return false
  }
}

const buildWidget = (editor: monaco.editor.ICodeEditor, text: string): monaco.editor.IContentWidget => {
  const domNode = document.createElement('div')
  domNode.textContent = text
  // 全部使用内联样式，避免依赖额外的样式文件/构建配置
  domNode.style.cssText = [
    'padding:2px 8px',
    'font-size:12px',
    'line-height:18px',
    'border-radius:4px',
    'background:rgba(40,40,40,0.86)',
    'color:#e6e6e6',
    'white-space:nowrap',
    'pointer-events:none',
    'user-select:none',
    'opacity:0',
    `transition:opacity ${FADE_MS}ms ease`,
    'box-shadow:0 2px 8px rgba(0,0,0,0.25)',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
  ].join(';')

  const widget: monaco.editor.IContentWidget = {
    getId: () => WIDGET_ID,
    getDomNode: () => domNode,
    getPosition: () => {
      try {
        const pos = editor.getPosition()
        if (!pos) return null
        return {
          position: pos,
          preference: [
            monaco.editor.ContentWidgetPositionPreference.BELOW,
            monaco.editor.ContentWidgetPositionPreference.ABOVE,
          ],
        }
      } catch (e) {
        return null
      }
    },
  }
  return widget
}

const removeHint = (editor: monaco.editor.ICodeEditor, state: HintState) => {
  try {
    if (state.widget) {
      editor.removeContentWidget(state.widget)
    }
  } catch (e) {
    // ignore
  } finally {
    state.widget = null
  }
}

const clearTimers = (state: HintState) => {
  if (state.idleTimer) {
    clearTimeout(state.idleTimer)
    state.idleTimer = null
  }
  if (state.hideTimer) {
    clearTimeout(state.hideTimer)
    state.hideTimer = null
  }
  if (state.removeTimer) {
    clearTimeout(state.removeTimer)
    state.removeTimer = null
  }
}

// 立即隐藏(用户开始交互时调用)
const hideNow = (editor: monaco.editor.ICodeEditor, state: HintState) => {
  try {
    if (state.hideTimer) {
      clearTimeout(state.hideTimer)
      state.hideTimer = null
    }
    if (state.removeTimer) {
      clearTimeout(state.removeTimer)
      state.removeTimer = null
    }
    if (state.widget) {
      const node = state.widget.getDomNode()
      if (node) node.style.opacity = '0'
      removeHint(editor, state)
    }
  } catch (e) {
    // ignore
  }
}

const fadeOut = (editor: monaco.editor.ICodeEditor, state: HintState) => {
  try {
    if (!state.widget) return
    const node = state.widget.getDomNode()
    if (node) node.style.opacity = '0'
    state.removeTimer = setTimeout(() => {
      removeHint(editor, state)
    }, FADE_MS + 60)
  } catch (e) {
    removeHint(editor, state)
  }
}

const showHint = (editor: monaco.editor.ICodeEditor, state: HintState) => {
  try {
    if (state.disposed) return
    // 已有 widget 时先清掉，避免重复
    hideNow(editor, state)

    const widget = buildWidget(editor, getHintText())
    state.widget = widget
    editor.addContentWidget(widget)
    state.lastShownAt = Date.now()
    bumpTotalShows()

    // 下一帧再设 opacity=1 以触发过渡动画(淡入)
    const node = widget.getDomNode()
    if (node) {
      requestAnimationFrame(() => {
        try {
          if (state.widget === widget && node) {
            node.style.opacity = '1'
          }
        } catch (e) {
          // ignore
        }
      })
    }

    // 停留一段时间后淡出
    state.hideTimer = setTimeout(() => {
      fadeOut(editor, state)
    }, VISIBLE_MS)
  } catch (e) {
    // 出现任何异常都不要影响编辑器；尽量清理
    removeHint(editor, state)
  }
}

const canShow = (editor: monaco.editor.ICodeEditor, state: HintState): boolean => {
  if (state.disposed) return false
  if (readTotalShows() >= MAX_TOTAL_SHOWS) return false
  if (Date.now() - state.lastShownAt < COOLDOWN_MS) return false
  if (!isYakEditor(editor)) return false
  if (isReadOnly(editor)) return false
  if (!editor.hasTextFocus()) return false
  if (isSuggestWidgetVisible(editor)) return false
  return true
}

const scheduleIdle = (editor: monaco.editor.ICodeEditor, state: HintState) => {
  try {
    if (state.disposed) return
    if (state.idleTimer) {
      clearTimeout(state.idleTimer)
      state.idleTimer = null
    }
    // 达到总次数上限后不再安排，节省资源
    if (readTotalShows() >= MAX_TOTAL_SHOWS) return
    state.idleTimer = setTimeout(() => {
      try {
        if (canShow(editor, state)) {
          showHint(editor, state)
        }
      } catch (e) {
        // ignore
      }
    }, IDLE_MS)
  } catch (e) {
    // ignore
  }
}

// setupCompletionHint 为单个编辑器安装空闲补全提示。整体 try/catch，出错静默降级。
export const setupCompletionHint = (editor: monaco.editor.ICodeEditor) => {
  try {
    if (stateMap.has(editor)) return
    const state: HintState = {
      idleTimer: null,
      hideTimer: null,
      removeTimer: null,
      widget: null,
      lastShownAt: 0,
      disposed: false,
    }
    stateMap.set(editor, state)

    const onInteract = () => {
      hideNow(editor, state)
      scheduleIdle(editor, state)
    }

    editor.onDidChangeCursorPosition(() => onInteract())
    editor.onDidChangeModelContent(() => onInteract())
    editor.onDidFocusEditorText(() => scheduleIdle(editor, state))
    editor.onDidBlurEditorText(() => {
      clearTimers(state)
      hideNow(editor, state)
    })
    editor.onDidChangeModel(() => {
      // 切换 model(可能切换语言)时先隐藏，再按新语言重新判断
      hideNow(editor, state)
      clearTimers(state)
      scheduleIdle(editor, state)
    })
    editor.onDidDispose(() => {
      state.disposed = true
      clearTimers(state)
      removeHint(editor, state)
      stateMap.delete(editor)
    })
  } catch (e) {
    // 安装失败也不影响编辑器正常使用
    // eslint-disable-next-line no-console
    console.info('setupCompletionHint failed', e)
  }
}
