import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TFunction } from '@/i18n/useI18nNamespaces'
import emiter from '@/utils/eventBus/eventBus'
import { onOpenConfigModal } from '../AIModelSelect'

const mocks = vi.hoisted(() => ({
  confirm: vi.fn<(options: { onOk: () => void }) => { destroy: () => void }>(),
  configure: vi.fn<(options: { onSuccess: () => void }) => void>(),
  destroy: vi.fn(),
}))

vi.mock('@/components/yakitUI/YakitModal/YakitModalConfirm', () => ({ YakitModalConfirm: mocks.confirm }))
vi.mock('../../AIModelList', () => ({
  setAIModal: mocks.configure,
  AIModelFreeTag: () => null,
  OutlineAtomIconByStatus: () => null,
}))
vi.mock('../../utils', () => ({}))
vi.mock('../../../defaultConstant', () => ({ AIOnlineModelIconMap: {}, defaultAIGlobalConfig: {} }))
vi.mock('../../aiModelForm/providerConfig', () => ({ providerToListAiModelConfig: vi.fn() }))
vi.mock('../enterpriseAIModelSelect/EnterpriseAIModelSelect', () => ({ EnterpriseAIModelSelect: () => null }))
vi.mock('@/pages/ai-re-act/hooks/useAIGlobalConfig', () => ({ default: vi.fn() }))
vi.mock('@/pages/ai-re-act/aiReviewRuleSelect/AIReviewRuleSelect', () => ({ AIChatSelect: () => null }))
vi.mock('@/components/yakitUI/YakitSelect/YakitSelect', () => ({ YakitSelect: () => null }))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({ YakitButton: () => null }))
vi.mock('@/components/yakitUI/YakitSpin/YakitSpin', () => ({ YakitSpin: () => null }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: vi.fn() }))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/utils/getMainOperatorPageBodyContainer', () => ({ getMainOperatorPageBodyContainer: vi.fn() }))

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('首次模型配置', () => {
  it('配置成功后同时通知模型管理列表和企业可用模型列表刷新', () => {
    vi.useFakeTimers()
    mocks.confirm.mockReturnValue({ destroy: mocks.destroy })
    const emit = vi.spyOn(emiter, 'emit')
    const mountContainer = document.createElement('div')
    const t = ((key: string) => key) as TFunction

    onOpenConfigModal(mountContainer, t)
    mocks.confirm.mock.calls[0][0].onOk()

    expect(mocks.configure).toHaveBeenCalledWith(expect.objectContaining({ mountContainer, t }))
    expect(mocks.destroy).toHaveBeenCalledTimes(1)
    expect(emit).not.toHaveBeenCalled()

    mocks.configure.mock.calls[0][0].onSuccess()
    vi.advanceTimersByTime(200)

    expect(emit).toHaveBeenCalledWith('onRefreshAIModelList')
    expect(emit).toHaveBeenCalledWith('onRefreshAvailableAIModelList')
    expect(emit).toHaveBeenCalledTimes(2)
  })
})
