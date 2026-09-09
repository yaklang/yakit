import type React from 'react'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
    // 组件在打开后延迟测量下拉区域，之后才能定位编辑浮层。
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 250))
    })
    fireEvent.click(within(dropdown).getByText('model-a'))
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
})
