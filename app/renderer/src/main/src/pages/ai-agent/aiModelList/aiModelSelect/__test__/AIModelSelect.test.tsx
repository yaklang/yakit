import type React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AIModelSelect } from '../AIModelSelect'
import { defaultAIGlobalConfig } from '../../../defaultConstant'

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  save: vi.fn(() => Promise.resolve()),
  names: vi.fn(() => Promise.resolve({ ModelName: ['model-edited'] })),
  configure: vi.fn(),
}))
vi.mock('../../utils', () => ({
  isForcedSetAIModal: mocks.load,
  grpcListAiModel: mocks.names,
  getModelName: (name?: string) => name ?? '',
  isMemfitStart: () => false,
  isFreeEnd: () => false,
  sortMemfitNameFirst: (names: string[]) => names,
}))
vi.mock('../../AIModelList', () => ({
  getTipByType: () => 'policy',
  OutlineAtomIconByStatus: () => null,
  AIModelFreeTag: () => null,
  setAIModal: mocks.configure,
}))
vi.mock('@/pages/ai-re-act/hooks/useAIGlobalConfig', () => ({
  default: () => [null, { setAIGlobalConfig: mocks.save }],
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('ahooks', async (importOriginal) => ({
  // ahooks 导出庞大且此处整体 spread，模块类型无法用 import type 描述，显式豁免。
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  ...(await importOriginal<typeof import('ahooks')>()),
  useInViewport: () => [true],
}))
vi.mock('@/pages/ai-re-act/aiReviewRuleSelect/AIReviewRuleSelect', () => ({
  AIChatSelect: ({
    open,
    setOpen,
    dropdownRender,
  }: {
    open: boolean
    setOpen: (open: boolean) => void
    dropdownRender: (menu: React.ReactNode) => React.ReactNode
  }) => (
    <>
      <button onClick={() => setOpen(!open)}>{open ? '关闭选择' : '打开选择'}</button>
      {open && (
        <div role="region" aria-label="模型列表">
          {dropdownRender(null)}
        </div>
      )}
    </>
  ),
}))
vi.mock('@/components/yakitUI/YakitSelect/YakitSelect', () => ({ YakitSelect: { Option: () => null } }))

beforeEach(() => {
  vi.clearAllMocks()
  // jsdom 没有原生 ResizeObserver；尺寸变化在对应交互用例中主动触发。
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  )
  mocks.load.mockImplementation(({ haveDataCall }) => {
    haveDataCall({
      onlineModelsTotal: 2,
      localModelsTotal: 0,
      localModels: [],
      onlineModels: {
        ...defaultAIGlobalConfig,
        IntelligentModels: ['model-a', 'model-b'].map((ModelName) => ({
          ModelName,
          ProviderId: ModelName,
          ExtraParams: [],
          Provider: { Type: 'test-provider', ReasoningEffort: 'off' },
        })),
      },
    })
    return Promise.resolve()
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const openModels = async () => {
  render(<AIModelSelect />)
  fireEvent.click(await screen.findByRole('button', { name: '打开选择' }))
  return screen.getByRole('region', { name: '模型列表' })
}

describe('AIModelSelect', () => {
  it('移除配置入口后仍可刷新模型列表', async () => {
    const dropdown = await openModels()
    expect(within(dropdown).getByText('model-a')).toBeInTheDocument()
    // 刷新、两条模型的编辑和新增模型按钮；不再包含旧配置入口。
    const buttons = within(dropdown).getAllByRole('button')
    expect(buttons).toHaveLength(4)
    await waitFor(() => expect(buttons[0]).not.toHaveClass('ant-btn-loading'))
    fireEvent.click(buttons[0])
    await waitFor(() => expect(mocks.load).toHaveBeenCalledTimes(2))
    expect(mocks.configure).not.toHaveBeenCalled()
  })

  it('选择模型后关闭下拉，将选择结果保存为首选模型', async () => {
    const dropdown = await openModels()
    fireEvent.click(within(dropdown).getByText('model-b'))
    fireEvent.click(screen.getByRole('button', { name: '关闭选择' }))
    await waitFor(() =>
      expect(mocks.save).toHaveBeenCalledWith(
        expect.objectContaining({
          IntelligentModels: [
            expect.objectContaining({ ModelName: 'model-b' }),
            expect.objectContaining({ ModelName: 'model-a' }),
          ],
        }),
      ),
    )
  })

  it('悬停编辑按钮后仍可加载模型名称、编辑并保存', async () => {
    const dropdown = await openModels()
    fireEvent.mouseEnter(within(dropdown).getAllByRole('button')[1])
    fireEvent.click(await screen.findByText('model-edited'))
    expect(mocks.names).toHaveBeenCalledWith({ Config: JSON.stringify({ Type: 'test-provider' }) })
    fireEvent.click(screen.getByRole('button', { name: '关闭选择' }))
    await waitFor(() =>
      expect(mocks.save).toHaveBeenCalledWith(
        expect.objectContaining({
          IntelligentModels: [
            expect.objectContaining({ ModelName: 'model-edited' }),
            expect.objectContaining({ ModelName: 'model-b' }),
          ],
        }),
      ),
    )
  })

  it('选择器外层宽度变化时关闭二级弹窗，高度变化不关闭，关闭后可重新悬停打开', async () => {
    let resizeInput: (width: number, height: number) => void = () => {}
    let observedTarget: Element | undefined
    const disconnect = vi.fn()
    // 组件观察的是自身触发器元素（triggerRef），记录 observe 到的目标供用例主动触发尺寸变化。
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private callback: ResizeObserverCallback) {}
        observe(target: Element) {
          observedTarget = target
          resizeInput = (width, height) =>
            this.callback(
              [{ target, contentRect: { width, height } } as ResizeObserverEntry],
              this as unknown as ResizeObserver,
            )
        }
        disconnect = disconnect
        unobserve() {}
      },
    )
    try {
      render(<AIModelSelect className="model-trigger" />)
      fireEvent.click(await screen.findByRole('button', { name: '打开选择' }))
      await waitFor(() => expect(observedTarget).toBe(document.querySelector('.model-trigger')))
      act(() => resizeInput(600, 120))
      const dropdown = screen.getByRole('region', { name: '模型列表' })
      const measureDropdown = vi.spyOn(dropdown.firstElementChild!, 'getBoundingClientRect')
      measureDropdown.mockReturnValue(new DOMRect(100, 0, 200, 300))
      const editButton = within(dropdown).getAllByRole('button')[1]
      fireEvent.mouseEnter(editButton)
      expect(await screen.findByText('model-edited')).toBeVisible()
      expect(screen.getByText('model-edited').closest('[style*="translate("]')).toHaveStyle({
        transform: 'translate(306px, 0px)',
      })

      act(() => resizeInput(600, 240))
      expect(screen.getByText('model-edited')).toBeVisible()
      act(() => resizeInput(500, 240))
      expect(screen.queryByText('model-edited')).not.toBeInTheDocument()
      expect(dropdown).toBeVisible()
      expect(mocks.save).not.toHaveBeenCalled()

      measureDropdown.mockReturnValue(new DOMRect(200, 0, 200, 300))
      fireEvent.mouseEnter(editButton)
      expect(await screen.findByText('model-edited')).toBeVisible()
      expect(screen.getByText('model-edited').closest('[style*="translate("]')).toHaveStyle({
        transform: 'translate(406px, 0px)',
      })
      cleanup()
      expect(disconnect).toHaveBeenCalled()
    } finally {
      cleanup()
      vi.unstubAllGlobals()
    }
  })
})
