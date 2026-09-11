import type React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import emiter from '@/utils/eventBus/eventBus'
import { YakitRoute } from '@/enums/yakitRoute'
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

/** 下拉按钮顺序：配置、刷新、两条模型编辑、新增模型。CI 根目录 vitest 会 stub CSS modules，不能靠 className。 */
const getDropdownButtons = (dropdown: HTMLElement) => within(dropdown).getAllByRole('button')
const getEditButtons = (dropdown: HTMLElement) => within(dropdown).getAllByRole('button', { name: 'YakitButton.edit' })

describe('AIModelSelect', () => {
  it('管理模型按钮显示国际化文案并打开模型配置，刷新仍会重新拉取模型列表', async () => {
    const emit = vi.spyOn(emiter, 'emit')
    const dropdown = await openModels()
    expect(within(dropdown).getByText('model-a')).toBeInTheDocument()
    const buttons = getDropdownButtons(dropdown)
    expect(buttons).toHaveLength(5)
    const configButton = within(dropdown).getByRole('button', { name: 'AIModelSelect.manageModels' })
    expect(configButton).toBeVisible()
    const refreshButton = buttons[1]
    fireEvent.click(configButton)
    expect(emit).toHaveBeenCalledWith(
      'openPage',
      JSON.stringify({ route: YakitRoute.Settings, params: { anchor: 'ai-model' } }),
    )
    expect(mocks.configure).not.toHaveBeenCalled()
    await waitFor(() => expect(refreshButton).not.toHaveClass('ant-btn-loading'))
    fireEvent.click(refreshButton)
    await waitFor(() => expect(mocks.load).toHaveBeenCalledTimes(2))
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
    fireEvent.mouseEnter(getEditButtons(dropdown)[0])
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

  it.each([500, 700])('宽度变为 %s 时，即使未打开编辑浮层也关闭列表并保存模型选择', async (width) => {
    let resizeInput: (width: number) => void = () => {}
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private callback: ResizeObserverCallback) {}
        observe(target: Element) {
          resizeInput = (width) =>
            this.callback(
              [{ target, contentRect: { width, height: 120 } } as ResizeObserverEntry],
              this as unknown as ResizeObserver,
            )
        }
        disconnect() {}
        unobserve() {}
      },
    )
    const dropdown = await openModels()
    act(() => resizeInput(600))
    fireEvent.click(within(dropdown).getByText('model-b'))
    act(() => resizeInput(width))
    expect(screen.queryByRole('region', { name: '模型列表' })).not.toBeInTheDocument()
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1))
    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({
        IntelligentModels: [
          expect.objectContaining({ ModelName: 'model-b' }),
          expect.objectContaining({ ModelName: 'model-a' }),
        ],
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: '打开选择' }))
    act(() => resizeInput(width))
    expect(screen.getByRole('region', { name: '模型列表' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '关闭选择' }))
    expect(mocks.save).toHaveBeenCalledTimes(1)
  })

  it('选择器外层宽度变化时关闭一级和二级弹窗，高度变化不关闭，关闭后可重新打开', async () => {
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
      expect(dropdown).toBeVisible()
      const measureDropdown = vi.spyOn(dropdown.firstElementChild!, 'getBoundingClientRect')
      measureDropdown.mockReturnValue(new DOMRect(100, 0, 200, 300))
      fireEvent.mouseEnter(getEditButtons(dropdown)[0])
      expect(await screen.findByText('model-edited')).toBeVisible()
      expect(screen.getByText('model-edited').closest('[style*="translate("]')).toHaveStyle({
        transform: 'translate(306px, 0px)',
      })

      act(() => resizeInput(600, 240))
      expect(screen.getByText('model-edited')).toBeVisible()
      expect(dropdown).toBeVisible()
      act(() => resizeInput(500, 240))
      expect(screen.queryByText('model-edited')).not.toBeInTheDocument()
      expect(screen.queryByRole('region', { name: '模型列表' })).not.toBeInTheDocument()
      expect(disconnect).toHaveBeenCalled()
      expect(mocks.save).not.toHaveBeenCalled()

      fireEvent.click(screen.getByRole('button', { name: '打开选择' }))
      act(() => resizeInput(500, 240))
      const reopenedDropdown = screen.getByRole('region', { name: '模型列表' })
      const reopenedMeasureDropdown = vi.spyOn(reopenedDropdown.firstElementChild!, 'getBoundingClientRect')
      reopenedMeasureDropdown.mockReturnValue(new DOMRect(200, 0, 200, 300))
      fireEvent.mouseEnter(getEditButtons(reopenedDropdown)[0])
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
