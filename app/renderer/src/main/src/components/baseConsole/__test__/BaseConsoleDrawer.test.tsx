vi.hoisted(() => {
  ;(window as any).require = (id: string) => {
    if (id === 'electron') {
      return {
        ipcRenderer: {
          invoke: async () => ({}),
          on: () => {},
          off: () => {},
          send: () => {},
          removeAllListeners: () => {},
        },
      }
    }
    return {}
  }
  ;(window as any).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })
})

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'zh' }, i18nRefresh: 0 }),
}))

vi.mock('re-resizable', () => ({
  Resizable: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}))

// EngineConsole 记录挂载/卸载次数，用于回归「切换方向不应卸载重建终端」
const engineConsoleMounts = vi.hoisted(() => ({ mounted: 0, unmounted: 0 }))
vi.mock('../BaseConsole', () => ({
  EngineConsole: () => {
    React.useEffect(() => {
      engineConsoleMounts.mounted += 1
      return () => {
        engineConsoleMounts.unmounted += 1
      }
    }, [])
    return <div data-testid="engine-console-stub" />
  },
}))

vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}))

// WindowPositionOP 依赖 antd Tooltip / 图标 / i18n，这里 mock 为可控按钮，聚焦测试 BaseConsoleDrawer 的回调逻辑
vi.mock('@/components/yakitUI/YakitWindow/YakitWindow', () => ({
  WindowPositionOP: ({ activeDockSide, onDockSide }: { activeDockSide: string; onDockSide?: (v: string) => void }) => (
    <div data-testid="window-position-op">
      {(['shrink', 'bottom', 'left', 'right'] as const).map((side) => (
        <button
          key={side}
          data-testid={`dock-${side}`}
          data-active={activeDockSide === side}
          onClick={() => onDockSide?.(side)}
        />
      ))}
    </div>
  ),
}))

import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEngineConsoleStore } from '../../../store/baseConsole'
import BaseConsoleDrawer from '../BaseConsoleDrawer'

const defaultProps = () => ({
  direction: 'left' as const,
  onClose: vi.fn(),
  onDirectionChange: vi.fn(),
  onShrinkToFloat: vi.fn(),
})

describe('BaseConsoleDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    engineConsoleMounts.mounted = 0
    engineConsoleMounts.unmounted = 0
    useEngineConsoleStore.setState({ consoleLog: 'some-log' })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('渲染标题「引擎 Console」与引擎内容', () => {
    render(<BaseConsoleDrawer {...defaultProps()} />)
    expect(screen.getByText('FuncDomain.engineConsole')).toBeInTheDocument()
    expect(screen.getByTestId('engine-console-stub')).toBeInTheDocument()
  })

  it('点击关闭按钮时清空 consoleLog 并调用 onClose', () => {
    const props = defaultProps()
    render(<BaseConsoleDrawer {...props} />)
    // operation 区域有两个 button：WindowPositionOP 整体 + 关闭按钮；关闭按钮是最后一个
    const consoleTitle = screen.getByText('FuncDomain.engineConsole')
    const operation = consoleTitle.parentElement!
    const buttons = operation.querySelectorAll('button')
    // WindowPositionOP 内部 4 个按钮 + 1 个关闭按钮，关闭按钮在 operation 直接子级最后
    const closeBtn = buttons[buttons.length - 1]
    fireEvent.click(closeBtn)
    expect(props.onClose).toHaveBeenCalledTimes(1)
    expect(useEngineConsoleStore.getState().consoleLog).toBe('')
  })

  it('点击浮窗按钮时调用 onShrinkToFloat', () => {
    const props = defaultProps()
    render(<BaseConsoleDrawer {...props} />)
    fireEvent.click(screen.getByTestId('dock-shrink'))
    expect(props.onShrinkToFloat).toHaveBeenCalledTimes(1)
    expect(props.onDirectionChange).not.toHaveBeenCalled()
  })

  it('点击底部停靠按钮时调用 onDirectionChange("bottom")', () => {
    const props = defaultProps()
    render(<BaseConsoleDrawer {...props} />)
    fireEvent.click(screen.getByTestId('dock-bottom'))
    expect(props.onDirectionChange).toHaveBeenCalledWith('bottom')
    expect(props.onShrinkToFloat).not.toHaveBeenCalled()
  })

  it('点击右侧停靠按钮时调用 onDirectionChange("right")', () => {
    const props = defaultProps()
    render(<BaseConsoleDrawer {...props} />)
    fireEvent.click(screen.getByTestId('dock-right'))
    expect(props.onDirectionChange).toHaveBeenCalledWith('right')
  })

  // 回归（P0）：切换停靠方向不应卸载重建终端实例，否则已显示历史丢失
  it('切换停靠方向（left→right→bottom）时 EngineConsole 实例不重建', () => {
    const props = defaultProps()
    const { rerender } = render(<BaseConsoleDrawer {...props} />)
    expect(engineConsoleMounts.mounted).toBe(1)
    expect(engineConsoleMounts.unmounted).toBe(0)

    // 用户在抽屉内把停靠侧从 left 切到 right：父组件用新 direction 重渲染抽屉
    rerender(<BaseConsoleDrawer {...props} direction="right" />)
    expect(engineConsoleMounts.mounted).toBe(1)
    expect(engineConsoleMounts.unmounted).toBe(0)

    // 再切到底部停靠，终端实例仍不应重建
    rerender(<BaseConsoleDrawer {...props} direction="bottom" />)
    expect(engineConsoleMounts.mounted).toBe(1)
    expect(engineConsoleMounts.unmounted).toBe(0)
  })

  // 回归：方向切换不应清空日志——只有显式关闭才清空
  it('切换停靠方向时保留 consoleLog（仅关闭按钮清空）', () => {
    const props = defaultProps()
    const { rerender } = render(<BaseConsoleDrawer {...props} />)
    expect(useEngineConsoleStore.getState().consoleLog).toBe('some-log')

    // 用户在抽屉内把停靠侧从 left 切到 right：父组件用新 direction 重渲染抽屉
    rerender(<BaseConsoleDrawer {...props} direction="right" />)
    expect(useEngineConsoleStore.getState().consoleLog).toBe('some-log')

    // 再切到底部停靠，日志仍应保留
    rerender(<BaseConsoleDrawer {...props} direction="bottom" />)
    expect(useEngineConsoleStore.getState().consoleLog).toBe('some-log')

    // 切回浮窗（父组件关闭抽屉）也不由抽屉清空——抽屉仅在被卸载/关闭按钮触发时清空
    expect(props.onClose).not.toHaveBeenCalled()
  })

  it('方向切换为浮窗触发 onShrinkToFloat，但不直接清空 consoleLog', () => {
    const props = defaultProps()
    render(<BaseConsoleDrawer {...props} />)
    fireEvent.click(screen.getByTestId('dock-shrink'))
    expect(props.onShrinkToFloat).toHaveBeenCalledTimes(1)
    // 收起为浮窗由父组件负责关闭抽屉；抽屉自身不清空日志
    expect(useEngineConsoleStore.getState().consoleLog).toBe('some-log')
  })
})
