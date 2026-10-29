import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AreaInfoProps } from '../../YakRunnerIrifyAiCodeAuditType'
import type { FileDetailInfo } from '../RunnerTabsType'

const tabsId = 'tabs-1'
const sameHit = { startLineNumber: 3, startColumn: 1, endLineNumber: 3, endColumn: 6 }

const { revealPositionInCenter, emit, on, off, createEditor, bumpStore, storeListeners, getStoreVersion } = vi.hoisted(
  () => {
    const ipcRenderer = {
      invoke: vi.fn().mockResolvedValue({ RawJson: new Uint8Array(), Suggestions: [] }),
      on: vi.fn(),
      off: vi.fn(),
      removeListener: vi.fn(),
      removeAllListeners: vi.fn(),
      send: vi.fn(),
    }
    window.require = (() => ({ ipcRenderer })) as unknown as typeof window.require

    const listeners = new Map<string, Array<(data: string) => void>>()
    const revealPositionInCenter = vi.fn()
    const disposable = { dispose: () => {} }
    const createEditor = () => ({
      revealPositionInCenter,
      setValue: vi.fn(),
      setPosition: vi.fn(),
      setSelection: vi.fn(),
      focus: vi.fn(),
      getPosition: () => ({ lineNumber: 1, column: 1 }),
      getSelection: () => null,
      getModel: () => ({ getValueInRange: () => '' }),
      getScrolledVisiblePosition: () => null,
      revealLineInCenter: vi.fn(),
      onDidChangeCursorPosition: () => disposable,
      onDidChangeCursorSelection: () => disposable,
      onDidFocusEditorWidget: () => disposable,
      onDidBlurEditorWidget: () => disposable,
      onMouseUp: () => disposable,
      onDidScrollChange: () => disposable,
    })
    const storeListeners = new Set<() => void>()
    let storeVersion = 0
    const bumpStore = () => {
      storeVersion += 1
      storeListeners.forEach((listener) => listener())
    }
    return {
      revealPositionInCenter,
      createEditor,
      bumpStore,
      storeListeners,
      getStoreVersion: () => storeVersion,
      on: vi.fn((event: string, fn: (data: string) => void) => {
        listeners.set(event, [...(listeners.get(event) || []), fn])
      }),
      off: vi.fn((event: string, fn: (data: string) => void) => {
        listeners.set(
          event,
          (listeners.get(event) || []).filter((item) => item !== fn),
        )
      }),
      emit: vi.fn((event: string, data?: string) => {
        const handlers = listeners.get(event) || []
        handlers.forEach((fn) => fn(data as string))
      }),
    }
  },
)

const store: {
  areaInfo: AreaInfoProps[]
  activeFile?: FileDetailInfo
  runnerTabsId?: string
} = {
  areaInfo: [],
  activeFile: undefined,
  runnerTabsId: undefined,
}

vi.mock('lottie-web', () => ({ default: { loadAnimation: vi.fn(() => ({ destroy: vi.fn() })) } }))
vi.mock('@xterm/xterm', () => ({ Terminal: vi.fn() }))
vi.mock('@/utils/eventBus/eventBus', () => ({ default: { emit, on, off } }))
vi.mock('../../hooks/useStore', () => {
  const { useSyncExternalStore } = require('react')
  const useStore = () => {
    useSyncExternalStore(
      (onStoreChange: () => void) => {
        storeListeners.add(onStoreChange)
        return () => {
          storeListeners.delete(onStoreChange)
        }
      },
      getStoreVersion,
      getStoreVersion,
    )
    return store
  }
  return { default: useStore }
})
vi.mock('../../hooks/useDispatcher', () => ({
  default: () => ({
    setAreaInfo: vi.fn(),
    setActiveFile: vi.fn(),
    setRunnerTabsId: vi.fn(),
  }),
}))
vi.mock('@hello-pangea/dnd', () => ({
  Droppable: ({
    children,
  }: {
    children: (provided: { innerRef: () => void; droppableProps: object; placeholder: null }) => unknown
  }) => children({ innerRef: () => {}, droppableProps: {}, placeholder: null }),
  Draggable: ({
    children,
  }: {
    children: (
      provided: { innerRef: () => void; draggableProps: { style: object }; dragHandleProps: object },
      snapshot: { isDragging: boolean },
    ) => unknown
  }) => children({ innerRef: () => {}, draggableProps: { style: {} }, dragHandleProps: {} }, { isDragging: false }),
}))
vi.mock('@/components/yakitUI/YakitEditor/YakitEditor', () => {
  const { useEffect, createElement } = require('react')
  const editor = createEditor()
  const YakitEditor = ({ editorDidMount }: { editorDidMount?: (editor: ReturnType<typeof createEditor>) => void }) => {
    useEffect(() => {
      editorDidMount?.(editor)
    }, [editorDidMount])
    return createElement('div', { 'data-testid': 'yakit-editor' })
  }
  return { YakitEditor }
})

import { RunnerTabs } from '../RunnerTabs'

const makeFile = (path: string, isActive: boolean): FileDetailInfo => ({
  name: path.split('/').pop() || path,
  parent: '/proj',
  path,
  icon: '_file',
  code: `content of ${path}`,
  language: 'plaintext',
  openTimestamp: 1,
  isPlainText: true,
  isActive,
  highLightRange: [sameHit],
})

const openFiles = (activePath: '/proj/a.txt' | '/proj/b.txt') => {
  const fileA = makeFile('/proj/a.txt', activePath === '/proj/a.txt')
  const fileB = makeFile('/proj/b.txt', activePath === '/proj/b.txt')
  store.areaInfo = [{ elements: [{ id: tabsId, files: [fileA, fileB] }] }]
  store.activeFile = activePath === fileA.path ? fileA : fileB
}

const revealPayload = (path: string) =>
  JSON.stringify({ path, lineNumber: sameHit.startLineNumber, column: sameHit.startColumn })

beforeEach(() => {
  revealPositionInCenter.mockReset()
  on.mockClear()
  off.mockClear()
  emit.mockClear()
})

describe('RunnerTabs 搜索命中滚动', () => {
  it('跨文件相同命中坐标：路径尚未切过去时不滚，切过去后仍滚到该坐标', async () => {
    openFiles('/proj/a.txt')
    render(<RunnerTabs tabsId={tabsId} />)
    await screen.findByTestId('yakit-editor')
    await waitFor(() => {
      expect(revealPositionInCenter).toHaveBeenCalledWith({ lineNumber: 3, column: 1 })
    })
    revealPositionInCenter.mockClear()

    emit('onAiCodeAuditRevealSearchHit', revealPayload('/proj/b.txt'))
    expect(revealPositionInCenter).not.toHaveBeenCalled()

    openFiles('/proj/b.txt')
    act(() => {
      bumpStore()
    })

    await waitFor(() => {
      expect(revealPositionInCenter).toHaveBeenCalledWith({ lineNumber: 3, column: 1 })
    })
  })

  it('滚离后重复点击同一命中仍再次滚动', async () => {
    openFiles('/proj/b.txt')
    render(<RunnerTabs tabsId={tabsId} />)
    await screen.findByTestId('yakit-editor')
    await waitFor(() => {
      expect(revealPositionInCenter).toHaveBeenCalled()
    })
    revealPositionInCenter.mockClear()

    emit('onAiCodeAuditRevealSearchHit', revealPayload('/proj/b.txt'))
    emit('onAiCodeAuditRevealSearchHit', revealPayload('/proj/b.txt'))

    expect(revealPositionInCenter).toHaveBeenCalledTimes(2)
    expect(revealPositionInCenter).toHaveBeenNthCalledWith(1, { lineNumber: 3, column: 1 })
    expect(revealPositionInCenter).toHaveBeenNthCalledWith(2, { lineNumber: 3, column: 1 })
  })
})
