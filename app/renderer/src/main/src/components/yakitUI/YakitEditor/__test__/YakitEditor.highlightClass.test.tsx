import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('lottie-web', () => ({ default: { loadAnimation: vi.fn(() => ({ destroy: vi.fn() })) } }))
vi.mock('@xterm/xterm', () => ({ Terminal: class Terminal {} }))
vi.mock('react-resize-detector', () => ({
  default: () => null,
}))
vi.mock('@/utils/globalShortcutKey/shortcutKeyFocusHook/ShortcutKeyFocusHook', () => {
  const React = require('react')
  return {
    default: ({ children }: { children?: unknown }) => React.createElement('div', null, children),
  }
})

const { deltaDecorations, editor } = vi.hoisted(() => {
  const deltaDecorations = vi.fn((_: string[], next: { id?: string; options?: { className?: string } }[]) =>
    next.map((item, index) => item.id || `decoration-${index}`),
  )
  const disposable = { dispose: vi.fn() }
  const model = {
    deltaDecorations,
    isDisposed: () => false,
    getVersionId: () => 1,
    getPositionAt: () => ({ lineNumber: 1, column: 1 }),
    getValueInRange: () => '',
    getValue: () => 'NEEDLE',
    getLineContent: () => 'NEEDLE',
    dispose: vi.fn(),
    onDidChangeContent: () => disposable,
  }
  const editor = {
    getModel: () => model,
    createContextKey: () => ({ set: vi.fn() }),
    addCommand: vi.fn(),
    onDidChangeModelContent: () => disposable,
    onDidChangeCursorPosition: () => disposable,
    getContribution: () => undefined,
    onMouseDown: () => disposable,
    onKeyDown: () => disposable,
    getDomNode: () => document.createElement('div'),
    dispose: vi.fn(),
    setSelection: vi.fn(),
    layout: vi.fn(),
    focus: vi.fn(),
    getPosition: () => null,
    getSelection: () => null,
    trigger: vi.fn(),
  }
  return { deltaDecorations, editor }
})

vi.mock('react-monaco-editor', () => {
  const React = require('react')
  const MonacoEditorStub = (props: {
    language?: string
    editorDidMount?: (editor: unknown, monaco: unknown) => void
  }) => {
    React.useEffect(() => {
      props.editorDidMount?.(editor, {})
    }, [])
    return React.createElement('div', { 'data-testid': 'monaco-editor', 'data-language': props.language })
  }
  return {
    default: MonacoEditorStub,
    monaco: {
      KeyMod: { CtrlCmd: 2048 },
      KeyCode: { KeyV: 52 },
      Range: class Range {
        constructor(
          public startLineNumber: number,
          public startColumn: number,
          public endLineNumber: number,
          public endColumn: number,
        ) {}
      },
      editor: {
        registerLinkOpener: vi.fn(),
        EditorOption: { lineHeight: 19 },
      },
    },
  }
})

vi.mock('@/utils/monacoSpec/theme', () => ({ applyYakitMonacoTheme: vi.fn() }))
vi.mock('@/utils/monacoSpec/fuzzHTTPMonacoSpec', () => ({}))
vi.mock('@/utils/monacoSpec/yakEditor', () => ({ setEditorContext: vi.fn(), YaklangMonacoSpec: 'yak' }))
vi.mock('@/utils/monacoSpec/html', () => ({}))
vi.mock('@/utils/monacoSpec/syntaxflowEditor', () => ({ SyntaxFlowMonacoSpec: 'syntaxflow' }))

import { YakitEditor } from '../YakitEditor'
import { setEditorContext } from '@/utils/monacoSpec/yakEditor'

const hit = { startLineNumber: 2, startColumn: 1, endLineNumber: 2, endColumn: 7 }

const flushDecorations = async () => {
  await act(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
  })
}

const classNameOf = (prefix: string) => {
  const last = deltaDecorations.mock.calls.at(-1)?.[1] as
    | { id?: string; options?: { className?: string } }[]
    | undefined
  return last?.find((item) => String(item.id).startsWith(prefix))?.options?.className
}

beforeEach(() => {
  deltaDecorations.mockClear()
  vi.mocked(setEditorContext).mockClear()
  window.require = (() => ({ ipcRenderer: { invoke: vi.fn(), on: vi.fn(), removeListener: vi.fn() } })) as never
})

describe('YakitEditor AI 模型脚本', () => {
  it('使用 Yak 高亮并保留独立的 ai-model 分析上下文', () => {
    const view = render(<YakitEditor type="ai-model" value="chat = func(req, emit) { return req.Prompt }" />)

    expect(view.getByTestId('monaco-editor')).toHaveAttribute('data-language', 'yak')
    expect(setEditorContext).toHaveBeenCalledWith(editor, 'plugin', 'ai-model')
  })
})

describe('YakitEditor 高亮类名切换', () => {
  it('同一编辑器、同一坐标只切换类名时，会再次绘制并使用新类名', async () => {
    const props = {
      value: 'NEEDLE',
      type: 'plaintext' as const,
      highLightText: [{ ...hit, hoverVal: '' }],
      highLightFind: [hit],
      highLightClass: 'hight-light-default-bg-color',
      highLightFindClass: 'hight-light-file-search-hit',
    }
    const view = render(<YakitEditor {...props} />)
    await flushDecorations()

    const callsAfterMount = deltaDecorations.mock.calls.length
    expect(callsAfterMount).toBeGreaterThan(0)
    expect(classNameOf('hight-light-find_')).toBe('hight-light-file-search-hit')
    expect(classNameOf('hight-light-text_')).toBe('hight-light-default-bg-color')

    view.rerender(
      <YakitEditor
        {...props}
        highLightClass="hight-light-yak-runner-color"
        highLightFindClass="hight-light-yak-runner-color"
      />,
    )
    await flushDecorations()

    expect(deltaDecorations.mock.calls.length).toBeGreaterThan(callsAfterMount)
    expect(classNameOf('hight-light-find_')).toBe('hight-light-yak-runner-color')
    expect(classNameOf('hight-light-text_')).toBe('hight-light-yak-runner-color')
  })
})
