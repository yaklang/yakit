import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AIModelSettings } from '../AIModelSettings'

const mocks = vi.hoisted(() => ({
  config: {} as Record<string, unknown>,
  setAIGlobalConfig: vi.fn(),
  notify: vi.fn(),
}))

const createConfig = () => ({
  Enabled: false,
  SingleModelMode: false,
  RoutingPolicy: 'auto',
  DisableFallback: false,
  DefaultModelId: '',
  GlobalWeight: 0,
  IntelligentModels: [
    { ProviderId: '1', ModelName: 'standard', Provider: { Type: 'aibalance' }, ExtraParams: [] },
    { ProviderId: '2', ModelName: 'thinking', Provider: { Type: 'aibalance' }, ExtraParams: [] },
  ],
  LightweightModels: [{ ProviderId: '3', ModelName: 'lite', Provider: { Type: 'openai' }, ExtraParams: [] }],
  VisionModels: [{ ProviderId: '4', ModelName: 'vision', Provider: { Type: 'openai' }, ExtraParams: [] }],
  AIPresetPrompt: '',
  AIPlanPrompt: '',
})

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))

vi.mock('@/pages/ai-re-act/hooks/useAIGlobalConfig', () => ({
  default: () => [
    {
      queryLoading: false,
      updateLoading: false,
      aiGlobalConfig: mocks.config,
    },
    { onRefresh: vi.fn(), setAIGlobalConfig: mocks.setAIGlobalConfig },
  ],
}))

vi.mock('@/utils/notification', () => ({
  yakitNotify: mocks.notify,
}))

vi.mock('@/pages/ai-agent/aiModelList/AIModelList', () => ({
  AIOnlineModel: (props: { list: { ModelName: string }[] }) => (
    <div data-testid="online-models">{props.list.map((item) => item.ModelName).join(',')}</div>
  ),
  AILocalModelList: () => <div>local-list</div>,
  AILocalModelListItemPromptHint: () => null,
  getTipByType: () => 'tip',
  onEditAIModel: vi.fn(),
  onRemoveAIModel: vi.fn(),
  onSelectAIModel: vi.fn(),
  setAIModal: vi.fn(),
}))

vi.mock('@/pages/ai-agent/aiModelList/utils', () => ({
  grpcClearAllModels: vi.fn(),
  canEnableSingleModelMode: (config: {
    IntelligentModels?: { Provider?: { Type?: string }; ModelName?: string }[]
  }) => {
    const model = config.IntelligentModels?.[0]
    return !!model?.Provider?.Type?.trim() && !!model?.ModelName?.trim()
  },
}))

vi.mock('@/pages/ai-agent/aiModelList/addAIModel/AddAIModel', () => ({
  AddAIModel: () => null,
}))

vi.mock('@/components/yakitUI/YakitModal/YakitModalConfirm', () => ({
  showYakitModal: vi.fn(),
}))

describe('AIModelSettings', () => {
  beforeEach(() => {
    mocks.config = createConfig()
    mocks.setAIGlobalConfig.mockReset().mockResolvedValue(undefined)
    mocks.notify.mockReset()
  })

  it('收起分组时右侧只保留选中模型（列表第一项）', async () => {
    const user = userEvent.setup()
    render(<AIModelSettings />)
    expect(screen.getAllByTestId('online-models')[0].textContent).toBe('standard,thinking')
    await user.click(screen.getByText('AiAgengt.intelligentModels'))
    expect(screen.getAllByTestId('online-models')[0].textContent).toBe('standard')
  })

  it('开启单模型模式时完整保留已有全局配置', async () => {
    const user = userEvent.setup()
    render(<AIModelSettings />)

    await user.click(screen.getAllByRole('switch')[0])

    await waitFor(() => expect(mocks.setAIGlobalConfig).toHaveBeenCalledTimes(1))
    expect(mocks.setAIGlobalConfig).toHaveBeenCalledWith({
      ...mocks.config,
      SingleModelMode: true,
    })
    expect(mocks.setAIGlobalConfig.mock.calls[0][0].LightweightModels).toEqual(mocks.config.LightweightModels)
    expect(mocks.setAIGlobalConfig.mock.calls[0][0].VisionModels).toEqual(mocks.config.VisionModels)
    expect(mocks.notify).toHaveBeenCalledWith('success', 'AIOnlineModeSetting.singleModelModeSaved')
  })

  it('首个高质模型不完整时拒绝开启单模型模式', async () => {
    mocks.config = { ...createConfig(), IntelligentModels: [] }
    const user = userEvent.setup()
    render(<AIModelSettings />)

    await user.click(screen.getAllByRole('switch')[0])

    expect(mocks.setAIGlobalConfig).not.toHaveBeenCalled()
    expect(mocks.notify).toHaveBeenCalledWith('error', 'AIOnlineModeSetting.singleModelModeInvalid')
  })

  it('单模型模式下只展示高质模型', () => {
    mocks.config = { ...createConfig(), SingleModelMode: true }
    render(<AIModelSettings />)

    expect(screen.getAllByTestId('online-models')).toHaveLength(1)
    expect(screen.getByTestId('online-models')).toHaveTextContent('standard,thinking')
    expect(screen.getByText('AiAgengt.intelligentModels')).toBeInTheDocument()
    expect(screen.queryByText('AiAgengt.callingMode')).not.toBeInTheDocument()
    expect(screen.queryByText('AIOnlineModeSetting.disableFallback')).not.toBeInTheDocument()
    expect(screen.queryByText('AiAgengt.lightweightModels')).not.toBeInTheDocument()
    expect(screen.queryByText('AiAgengt.visionModels')).not.toBeInTheDocument()
  })
})
