import type React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type * as SpaceEngineUtils from '@/pages/spaceEngine/utils'
// 先于被测模块注册 window.require('electron') stub（ConfigNetworkPage 依赖链顶层会解构 ipcRenderer）
import '../../../pages/ai-re-act/hooks/__test__/setupElectron'

const mocks = vi.hoisted(() => ({
  setAIGlobalConfig: vi.fn(),
  notify: vi.fn(),
  onRefresh: vi.fn(),
  config: {} as Record<string, unknown>,
}))

vi.mock('@/utils/notification', () => ({
  yakitNotify: mocks.notify,
  yakitInfo: vi.fn(),
  warn: vi.fn(),
  failed: vi.fn(),
  success: vi.fn(),
}))

vi.mock('@/pages/ai-re-act/hooks/useAIGlobalConfig', () => ({
  default: () => [
    { queryLoading: false, updateLoading: false, aiGlobalConfig: mocks.config },
    { onRefresh: mocks.onRefresh, setAIGlobalConfig: mocks.setAIGlobalConfig },
  ],
}))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))

vi.mock('./ProxyRulesConfig', () => ({ default: () => null }))
vi.mock('./NewThirdPartyApplicationConfig', () => ({ default: () => null }))
vi.mock('./CustomizeCode', () => ({ CodeCustomize: () => null }))
vi.mock('@/components/TableVirtualResize/TableVirtualResize', () => ({ TableVirtualResize: () => null }))
vi.mock('@/pages/ai-agent/aiModelList/AIModelList', () => ({ getTipByType: () => 'tip' }))
vi.mock('@/components/AutoSpin', () => ({
  AutoSpin: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}))
// lottie-web 在 jsdom 中加载即访问 canvas 上下文（依赖链经 AI 聊天组件引入），mock 掉以隔离
vi.mock('lottie-web', () => ({ default: { loadAnimation: vi.fn(), destroy: vi.fn() } }))

vi.mock('@/utils/duplex/duplex', () => ({ setOpenPerformanceTips: vi.fn() }))
vi.mock('@/utils/imControl', () => ({ startIMControl: vi.fn(), stopIMControl: vi.fn() }))
vi.mock('@/pages/settings/settingsContent/globalConfig/GlobalConfigEmbeddedForm', () => ({
  GlobalConfigEmbeddedForm: () => null,
}))
vi.mock('@/pages/spaceEngine/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof SpaceEngineUtils>()
  return { ...actual, handleAIConfig: vi.fn() }
})

const { AIModelGlobalConfig } = await import('../ConfigNetworkPage')

const createModel = (type: string, modelName: string) => ({
  ProviderId: 'provider-id',
  Provider: { Type: type },
  ModelName: modelName,
  ExtraParams: [],
})

const createConfig = () => ({
  Enabled: false,
  SingleModelMode: false,
  RoutingPolicy: 'auto',
  DisableFallback: false,
  DefaultModelId: '',
  GlobalWeight: 0,
  IntelligentModels: [createModel('aibalance', 'standard')],
  LightweightModels: [createModel('openai', 'lite')],
  VisionModels: [],
  AIPresetPrompt: '',
  AIPlanPrompt: '',
})

describe('AIModelGlobalConfig 单模型模式', () => {
  beforeEach(() => {
    mocks.config = createConfig()
    mocks.setAIGlobalConfig.mockReset().mockResolvedValue(undefined)
    mocks.notify.mockReset()
    mocks.onRefresh.mockReset()
  })

  it('首个高质模型不完整时拒绝开启并提示', async () => {
    mocks.config = { ...createConfig(), IntelligentModels: [createModel('', 'standard')] }
    const user = userEvent.setup()
    render(<AIModelGlobalConfig />)

    await user.click(screen.getAllByRole('switch')[0])

    expect(mocks.setAIGlobalConfig).not.toHaveBeenCalled()
    expect(mocks.notify).toHaveBeenCalledWith('error', 'AIOnlineModeSetting.singleModelModeInvalid')
  })

  it('开启时保留已有全局配置并提示对新会话生效', async () => {
    const user = userEvent.setup()
    render(<AIModelGlobalConfig />)

    await user.click(screen.getAllByRole('switch')[0])

    await vi.waitFor(() => expect(mocks.setAIGlobalConfig).toHaveBeenCalledTimes(1))
    expect(mocks.setAIGlobalConfig).toHaveBeenCalledWith({ ...createConfig(), SingleModelMode: true })
    expect(mocks.setAIGlobalConfig.mock.calls[0][0].LightweightModels).toEqual(createConfig().LightweightModels)
    expect(mocks.notify).toHaveBeenCalledWith('success', 'AIOnlineModeSetting.singleModelModeSaved')
  })

  it('单模型模式下隐藏调用模式与降级行', () => {
    mocks.config = { ...createConfig(), SingleModelMode: true }
    render(<AIModelGlobalConfig />)

    expect(screen.getByText('AIOnlineModeSetting.singleModelMode')).toBeInTheDocument()
    expect(screen.queryByText('AiAgengt.callingMode')).not.toBeInTheDocument()
    expect(screen.queryByText('AIModelGlobalConfig.disableFallback')).not.toBeInTheDocument()
  })

  it('未开启单模型模式时展示调用模式与降级行', () => {
    render(<AIModelGlobalConfig />)

    expect(screen.getByText('AiAgengt.callingMode')).toBeInTheDocument()
    expect(screen.getByText('AIModelGlobalConfig.disableFallback')).toBeInTheDocument()
  })
})
