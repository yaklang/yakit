import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AIModelSettings } from '../AIModelSettings'

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))

vi.mock('@/pages/ai-re-act/hooks/useAIGlobalConfig', () => ({
  default: () => [
    {
      queryLoading: false,
      aiGlobalConfig: {
        RoutingPolicy: 'auto',
        DisableFallback: false,
        IntelligentModels: [
          { ProviderId: '1', ModelName: 'standard', Provider: { Type: 'aibalance' }, ExtraParams: [] },
          { ProviderId: '2', ModelName: 'thinking', Provider: { Type: 'aibalance' }, ExtraParams: [] },
        ],
        LightweightModels: [],
        VisionModels: [],
      },
    },
    { onRefresh: vi.fn(), setAIGlobalConfig: vi.fn() },
  ],
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
}))

vi.mock('@/pages/ai-agent/aiModelList/addAIModel/AddAIModel', () => ({
  AddAIModel: () => null,
}))

vi.mock('@/components/yakitUI/YakitModal/YakitModalConfirm', () => ({
  showYakitModal: vi.fn(),
}))

describe('AIModelSettings', () => {
  it('收起分组时右侧只保留选中模型（列表第一项）', async () => {
    const user = userEvent.setup()
    render(<AIModelSettings />)
    expect(screen.getByTestId('online-models').textContent).toBe('standard,thinking')
    await user.click(screen.getByText('AiAgengt.intelligentModels'))
    expect(screen.getByTestId('online-models').textContent).toBe('standard')
  })
})
