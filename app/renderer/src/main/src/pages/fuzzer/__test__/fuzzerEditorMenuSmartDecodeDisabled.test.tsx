import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * disabled editor only mounts shade (z-index 999) and blurs via fake input; Monaco is not set readOnly.
 * SmartDecode float portals into the wrapper at z-index 1050, so it stacks above the shade and Replace still writes.
 * Contract: when disabled, close and do not render SmartDecode (prefer over lowering float below shade).
 *
 * Source regexes below do not execute the effect. Clearing smartDecode only when `disabled` is in the
 * dependency list is what stops a previously opened float from coming back after the editor is enabled again.
 */
const here = path.dirname(fileURLToPath(import.meta.url))
const yakitEditorSrc = readFileSync(
  path.resolve(here, '../../../components/yakitUI/YakitEditor/YakitEditor.tsx'),
  'utf8',
)
const shadeScss = readFileSync(
  path.resolve(here, '../../../components/yakitUI/YakitEditor/YakitEditor.module.scss'),
  'utf8',
)
const smartDecodeScss = readFileSync(path.resolve(here, '../HTTPFuzzerEditorMenu.module.scss'), 'utf8')

const menuApi = vi.hoisted(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    class ResizeObserverPolyfill {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    globalThis.ResizeObserver = ResizeObserverPolyfill as unknown as typeof ResizeObserver
  }
  if (typeof globalThis.IntersectionObserver === 'undefined') {
    class IntersectionObserverPolyfill {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    }
    globalThis.IntersectionObserver = IntersectionObserverPolyfill as unknown as typeof IntersectionObserver
  }
  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    })) as typeof window.matchMedia
  }
  const ipcRenderer = {
    on: () => undefined,
    off: () => undefined,
    once: () => undefined,
    removeListener: () => undefined,
    removeAllListeners: () => undefined,
    send: () => undefined,
    invoke: () => Promise.resolve({}),
  }
  ;(window as unknown as { require: (id: string) => unknown }).require = (id: string) => {
    if (id === 'electron') return { ipcRenderer }
    return {}
  }
  return {
    onOpenSmartDecode: undefined as ((rangeValue: string, anchorRect?: DOMRect) => void) | undefined,
  }
})

vi.mock('lottie-web', () => ({ default: { loadAnimation: () => undefined, destroy: () => undefined } }))
vi.mock('@xterm/xterm', () => ({ Terminal: class Terminal {} }))

vi.mock('react-monaco-editor', () => {
  const React = require('react')
  const lazyFn = () => {
    const fn = () => makeProxy()
    return fn
  }
  const makeProxy = (): unknown =>
    new Proxy(lazyFn(), {
      get: (_target, prop) => {
        if (prop === Symbol.toPrimitive) return () => 'monaco-mock'
        if (prop === 'then') return undefined
        return makeProxy()
      },
    })
  const fakeEditor = {
    setSelection() {},
    onKeyDown() {},
    layout() {},
    getAction() {
      return { run() {} }
    },
    getDomNode() {
      return document.createElement('div')
    },
    hasTextFocus() {
      return false
    },
    getSelection() {
      return null
    },
    getModel() {
      return null
    },
    trigger() {},
  }
  const MonacoEditor = (props: { editorDidMount?: (editor: typeof fakeEditor, monaco: unknown) => void }) => {
    React.useEffect(() => {
      props.editorDidMount?.(fakeEditor, makeProxy())
    }, [])
    return React.createElement('div', { 'data-testid': 'monaco-editor' })
  }
  return { default: MonacoEditor, monaco: makeProxy() }
})

vi.mock('@/utils/monacoSpec/yakEditor', () => ({
  setEditorContext: () => undefined,
  YaklangMonacoSpec: 'yak',
}))
vi.mock('@/utils/monacoSpec/syntaxflowEditor', () => ({
  SyntaxFlowMonacoSpec: 'syntaxflow',
}))
vi.mock('@/utils/monacoSpec/theme', () => ({
  applyYakitMonacoTheme: () => undefined,
}))
vi.mock('@/utils/monacoSpec/fuzzHTTPMonacoSpec', () => ({}))
vi.mock('@/utils/monacoSpec/html', () => ({}))

vi.mock('@/components/yakitUI/YakitEditor/fizzMenu/editerMenuFun', () => ({
  editerMenuFun: (params: { onOpenSmartDecode: (rangeValue: string, anchorRect?: DOMRect) => void }) => {
    menuApi.onOpenSmartDecode = params.onOpenSmartDecode
    return () => undefined
  },
}))

vi.mock('@/pages/fuzzer/HTTPFuzzerEditorMenu', () => {
  const React = require('react')
  return {
    SmartDecodeFloatPanel: ({ rangeValue }: { rangeValue: string }) =>
      React.createElement('div', { 'data-testid': 'smart-decode-float-panel' }, rangeValue),
    snapshotRect: (rect: DOMRect) => ({
      top: rect.top,
      left: rect.left,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    }),
  }
})

import { YakitEditor } from '../../../components/yakitUI/YakitEditor/YakitEditor'

const editorValue = 'GET / HTTP/1.1\r\n\r\n'
const anchor = () =>
  ({
    top: 20,
    left: 10,
    right: 90,
    bottom: 38,
    width: 80,
    height: 18,
    x: 10,
    y: 20,
    toJSON: () => ({}),
  }) as DOMRect

const editorElement = (disabled: boolean) => (
  <YakitEditor isShowSelectRangeMenu value={editorValue} disabled={disabled} />
)

describe('YakitEditor SmartDecode vs disabled', () => {
  it('documents shade below SmartDecode float (999 < 1050)', () => {
    expect(shadeScss).toMatch(/\.yakit-editor-shade\s*\{[\s\S]*?z-index:\s*999/)
    expect(smartDecodeScss).toMatch(/\.smart-decode-float-layer[\s\S]*?z-index:\s*1050/)
  })

  it('closes SmartDecode when disabled becomes true', () => {
    expect(yakitEditorSrc).toMatch(
      /useEffect\(\s*\(\)\s*=>\s*\{\s*if\s*\(\s*disabled\s*\)\s*setSmartDecode\(\s*null\s*\)/,
    )
  })

  it('does not render SmartDecodeFloatPanel while disabled', () => {
    expect(yakitEditorSrc).toMatch(/smartDecode\s*&&\s*!disabled\s*&&\s*\(/)
  })

  it('refuses to open SmartDecode while disabled', () => {
    expect(yakitEditorSrc).toMatch(/if\s*\(\s*disabled\s*\|\|\s*!rect\s*\)\s*return/)
  })
})

describe('YakitEditor SmartDecode disabled behavior', () => {
  afterEach(() => {
    cleanup()
    menuApi.onOpenSmartDecode = undefined
  })

  it('打开浮层后禁用会卸载，重新启用不恢复，禁用期间不能再打开', async () => {
    const view = render(editorElement(false))
    await waitFor(() => {
      expect(menuApi.onOpenSmartDecode).toEqual(expect.any(Function))
    })

    act(() => {
      menuApi.onOpenSmartDecode?.('selected-text', anchor())
    })
    expect(screen.getByTestId('smart-decode-float-panel')).toHaveTextContent('selected-text')

    view.rerender(editorElement(true))
    expect(screen.queryByTestId('smart-decode-float-panel')).not.toBeInTheDocument()

    act(() => {
      menuApi.onOpenSmartDecode?.('opened-while-disabled', anchor())
    })
    expect(screen.queryByTestId('smart-decode-float-panel')).not.toBeInTheDocument()

    view.rerender(editorElement(false))
    expect(screen.queryByTestId('smart-decode-float-panel')).not.toBeInTheDocument()
  })
})
