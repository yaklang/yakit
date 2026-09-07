import type React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// 资源表必须定义在工厂内部：i18n.init 的预加载在 import 阶段就会触发 read
vi.mock('i18next-resources-to-backend', () => {
  const resources: Record<string, Record<string, unknown>> = {
    zh: {
      aiAgent: {
        AIRightPanel: {
          taskBoard: '任务详情看板',
          fileSystem: '文件系统',
          traffic: '流量',
          risk: '漏洞',
          sessionHistory: '会话历史',
          taskList: '任务列表',
          timeline: '时间线',
          exportLog: '导出日志',
          viewLog: '查看日志',
          collapse: '折叠',
          more: '更多',
          duration: '执行时长',
          toolCallStats: '工具调用统计',
          success: '成功',
          failed: '失败',
          totalAttempts: '总尝试次数',
        },
      },
    },
  }
  return {
    default: () => ({
      type: 'backend' as const,
      init() {},
      read(language: string, namespace: string, callback: (err: unknown, data: unknown) => void) {
        const data = resources[language]?.[namespace]
        callback(null, data !== undefined ? data : {})
      },
    }),
  }
})

import { AIRightPanel } from '../AIRightPanel'

const renderPanel = async (ui: React.ReactElement) => {
  render(ui)
  await waitFor(() => expect(screen.getByText('任务详情看板')).toBeInTheDocument())
}

describe('AIRightPanel', () => {
  it('正常态渲染数据卡片、六个主菜单与「更多」按钮', async () => {
    await renderPanel(<AIRightPanel executionDuration="7s" toolCallStats={{ success: 1, failed: 2, total: 3 }} />)
    expect(screen.getByText('执行时长')).toBeInTheDocument()
    expect(screen.getByText('7s')).toBeInTheDocument()
    expect(screen.getByText('工具调用统计')).toBeInTheDocument()
    expect(screen.getByText('文件系统')).toBeInTheDocument()
    expect(screen.getByText('会话历史')).toBeInTheDocument()
    // 底部「更多」分组默认收起
    expect(screen.getByText('更多')).toBeInTheDocument()
    expect(screen.queryByText('时间线')).not.toBeInTheDocument()
  })

  it('点击「更多」展开底部分组，点击「折叠」收起', async () => {
    await renderPanel(<AIRightPanel />)
    fireEvent.click(screen.getByText('更多'))
    expect(screen.getByText('时间线')).toBeInTheDocument()
    expect(screen.getByText('导出日志')).toBeInTheDocument()
    expect(screen.getByText('查看日志')).toBeInTheDocument()
    expect(screen.getByText('折叠')).toBeInTheDocument()

    fireEvent.click(screen.getByText('折叠'))
    expect(screen.queryByText('时间线')).not.toBeInTheDocument()
    expect(screen.getByText('更多')).toBeInTheDocument()
  })

  it('主菜单点击回调与选中态、计数角标', async () => {
    const onMenuClick = vi.fn()
    await renderPanel(
      <AIRightPanel
        activeKey="traffic"
        trafficCount={12}
        riskCounts={{ serious: 4, high: 6, medium: 1, low: 3, unknown: 8 }}
        onMenuClick={onMenuClick}
      />,
    )
    fireEvent.click(screen.getByText('流量'))
    expect(onMenuClick).toHaveBeenCalledWith('traffic')
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    const activeItem = screen.getByText('流量').closest('[role="button"]')
    expect(activeItem).toHaveAttribute('aria-label', '流量')
  })

  it('small 强制小屏态：仅图标，不渲染数据卡片与文案', () => {
    render(<AIRightPanel small executionDuration="7s" />)
    expect(screen.queryByText('执行时长')).not.toBeInTheDocument()
    expect(screen.queryByText('任务详情看板')).not.toBeInTheDocument()
    expect(screen.queryByText('更多')).not.toBeInTheDocument()
  })

  it('small 小屏态点击「更多」展开额外功能入口，再次点击收起', async () => {
    render(<AIRightPanel small />)
    const moreButton = screen.getByRole('button', { name: '更多' })

    expect(screen.queryByLabelText('时间线')).not.toBeInTheDocument()
    fireEvent.click(moreButton)
    expect(screen.getByLabelText('时间线')).toBeInTheDocument()
    expect(screen.getByLabelText('导出日志')).toBeInTheDocument()
    expect(screen.getByLabelText('查看日志')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '折叠' }))
    expect(screen.queryByLabelText('时间线')).not.toBeInTheDocument()
  })

  it('当正常态面板会遮挡列表时切换为小屏态', async () => {
    const listElement = document.createElement('div')
    let listWidth = 1108
    Object.defineProperty(listElement, 'clientWidth', {
      configurable: true,
      get: () => listWidth,
    })
    Object.defineProperty(listElement, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ width: listWidth }),
    })
    const layoutRef = { current: listElement } as React.RefObject<HTMLElement | null>
    let resizeCallback: (() => void) | undefined
    class ResizeObserverMock {
      constructor(callback: () => void) {
        resizeCallback = callback
      }

      observe() {}

      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)

    try {
      render(<AIRightPanel layoutRef={layoutRef} />)
      await waitFor(() => expect(screen.getByRole('button', { name: '任务详情看板' })).toBeInTheDocument())
      expect(screen.queryByText('任务详情看板')).not.toBeInTheDocument()

      // 1108 - 325 = 783，小于列表最大宽度，进入小屏；达到 784px 后恢复正常态。
      listWidth = 1109
      act(() => resizeCallback?.())
      await waitFor(() => expect(screen.getByText('任务详情看板')).toBeInTheDocument())
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('小屏判断跟随聊天容器宽度并在最大宽度边界切换', async () => {
    const listElement = document.createElement('div')

    let listWidth = 783
    Object.defineProperty(listElement, 'clientWidth', {
      configurable: true,
      get: () => listWidth,
    })
    Object.defineProperty(listElement, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ width: listWidth }),
    })
    const layoutRef = { current: listElement } as React.RefObject<HTMLElement | null>
    let resizeCallback: (() => void) | undefined
    class ResizeObserverMock {
      constructor(callback: () => void) {
        resizeCallback = callback
      }

      observe() {}

      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)

    try {
      render(<AIRightPanel layoutRef={layoutRef} />)
      await waitFor(() => expect(screen.queryByText('任务详情看板')).not.toBeInTheDocument())

      // 聊天容器宽度达到 1109px 后，扣除 325px 面板槽位正好剩余 784px，恢复正常态。
      listWidth = 1109
      act(() => resizeCallback?.())
      await waitFor(() => expect(screen.getByText('任务详情看板')).toBeInTheDocument())
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
