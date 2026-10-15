import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EnterpriseAIModelSelect } from '../EnterpriseAIModelSelect'
import { defaultAIGlobalConfig } from '../../../../defaultConstant'
import type { AIGlobalConfig } from '../../../utils'
import { useAIGlobalConfigStore } from '@/store/aiGlobalConfig'

const mocks = vi.hoisted(() => ({
  names: vi.fn<({ Config }: { Config: string }) => Promise<{ ModelName: string[] }>>(),
  refresh: vi.fn(),
}))
vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({ useCurrentStore: vi.fn() }))
vi.mock('../../../utils', () => ({
  isForcedSetAIModal: () => Promise.resolve(null),
  grpcListAiModel: mocks.names,
  getModelName: (name?: string) => name ?? '',
  isMemfitStart: () => false,
  isFreeEnd: () => false,
  sortMemfitNameFirst: (names: string[]) => names,
}))
vi.mock('../../../AIModelList', () => ({
  OutlineAtomIconByStatus: () => null,
  AIModelFreeTag: () => null,
  setAIModal: vi.fn(),
}))
vi.mock('@/pages/ai-re-act/hooks/useAIGlobalConfig', () => ({
  default: function useMockAIGlobalConfig() {
    return [
      { aiGlobalConfig: useAIGlobalConfigStore((state) => state.aiGlobalConfig) },
      {
        onRefresh: mocks.refresh,
        setAIGlobalConfig: (config: AIGlobalConfig) => {
          useAIGlobalConfigStore.getState().setAIGlobalConfig(config)
          return Promise.resolve()
        },
      },
    ]
  },
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('ahooks', async (importOriginal) => ({
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  ...(await importOriginal<typeof import('ahooks')>()),
  useInViewport: () => [true],
}))

beforeEach(() => {
  mocks.names.mockReset()
  mocks.refresh.mockReset().mockImplementation(() => {
    useAIGlobalConfigStore.getState().setAIGlobalConfig({
      ...defaultAIGlobalConfig,
      IntelligentModels: [
        {
          ModelName: 'configured-model',
          ProviderId: 'provider',
          ExtraParams: [],
          Provider: { Type: 'test-provider', ReasoningEffort: 'off' },
        },
      ],
    })
    return Promise.resolve()
  })
  useAIGlobalConfigStore.getState().setAIGlobalConfig({ ...defaultAIGlobalConfig })
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// Keep AIChatSelect → YakitSelect → antd Select intact: rc-trigger caches the closed popup subtree.
const openModels = async () => {
  const trigger = await screen.findByRole('combobox')
  fireEvent.click(trigger)
  await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'true'))
  return trigger
}
const hoverEdit = async () => {
  fireEvent.mouseEnter(await screen.findByRole('button', { name: 'YakitButton.edit' }))
}
const reopenModels = async (trigger: HTMLElement) => {
  fireEvent.click(trigger)
  await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'))
  fireEvent.click(trigger)
  await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'true'))
  await hoverEdit()
}

describe('EnterpriseAIModelSelect real dropdown lifecycle', () => {
  it('关闭并重新打开后重新请求名称，显示服务端最新结果', async () => {
    mocks.names
      .mockResolvedValueOnce({ ModelName: ['first-name'] })
      .mockResolvedValueOnce({ ModelName: ['latest-name'] })
    render(<EnterpriseAIModelSelect />)
    const trigger = await openModels()
    await hoverEdit()
    expect(await screen.findByText('first-name')).toBeVisible()

    await reopenModels(trigger)

    await waitFor(() => expect(mocks.names).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('latest-name')).toBeVisible()
    expect(screen.queryByText('first-name')).not.toBeInTheDocument()
  })

  it('名称请求失败后关闭并重新打开时自动重试', async () => {
    mocks.names
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({ ModelName: ['recovered-name'] })
    render(<EnterpriseAIModelSelect />)
    const trigger = await openModels()
    await hoverEdit()
    await waitFor(() => expect(mocks.names).toHaveBeenCalledTimes(1))
    await act(async () => {})
    expect(screen.getByText('AIModelSelect.emptyModels')).toBeVisible()

    await reopenModels(trigger)

    await waitFor(() => expect(mocks.names).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('recovered-name')).toBeVisible()
  })

  it('关闭前的请求晚于重新打开后的请求完成时不覆盖新列表', async () => {
    let resolveOld!: (value: { ModelName: string[] }) => void
    mocks.names
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOld = resolve
          }),
      )
      .mockResolvedValueOnce({ ModelName: ['current-name'] })
    render(<EnterpriseAIModelSelect />)
    const trigger = await openModels()
    await hoverEdit()
    await waitFor(() => expect(mocks.names).toHaveBeenCalledTimes(1))

    await reopenModels(trigger)

    await waitFor(() => expect(mocks.names).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('current-name')).toBeVisible()
    await act(async () => resolveOld({ ModelName: ['stale-name'] }))
    expect(screen.getByText('current-name')).toBeVisible()
    expect(screen.queryByText('stale-name')).not.toBeInTheDocument()
  })
})
