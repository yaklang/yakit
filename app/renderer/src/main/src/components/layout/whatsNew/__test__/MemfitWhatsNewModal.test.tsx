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
})

import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LocalGVS } from '@/enums/localGlobal'

const { getLocalValue, setLocalValue, grpcFetchLocalYakitVersion, isMemfitMock, emiterOn, emiterOff } = vi.hoisted(
  () => ({
    getLocalValue: vi.fn(),
    setLocalValue: vi.fn(),
    grpcFetchLocalYakitVersion: vi.fn(),
    isMemfitMock: vi.fn(() => true),
    emiterOn: vi.fn(),
    emiterOff: vi.fn(),
  }),
)

vi.mock('@/utils/kv', () => ({ getLocalValue, setLocalValue }))
vi.mock('@/apiUtils/grpc', () => ({ grpcFetchLocalYakitVersion }))
vi.mock('@/utils/envfile', () => ({ isMemfit: () => isMemfitMock() }))
vi.mock('@/utils/eventBus/eventBus', () => ({
  default: { on: emiterOn, off: emiterOff, emit: vi.fn() },
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'zh' } }),
}))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}))
vi.mock('@/components/yakitUI/YakitModal/YakitModal', () => ({
  YakitModal: ({ open, children }: { open?: boolean; children?: React.ReactNode }) =>
    open ? <div data-testid="whats-new-modal">{children}</div> : null,
}))
vi.mock('../memfitWhatsNewConfig', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    MEMFIT_WHATS_NEW: {
      enabled: true,
      targetVersion: '1.4.9-1023',
      items: [
        { title: '模型限免', description: '第一页' },
        { title: '任务详情页面增加进度看板', description: '第二页' },
        { title: 'Goal模式增加持续时间设置', description: '第三页' },
      ],
    },
  }
})

import { MemfitWhatsNewModal } from '../MemfitWhatsNewModal'

const clickByName = (name: string) => screen.getByRole('button', { name }).click()

const latestOpenHandler = () => {
  const calls = emiterOn.mock.calls.filter((call) => call[0] === 'openMemfitWhatsNew')
  return calls[calls.length - 1]?.[1]
}

describe('MemfitWhatsNewModal', () => {
  beforeEach(() => {
    isMemfitMock.mockReturnValue(true)
    getLocalValue.mockResolvedValue('')
    grpcFetchLocalYakitVersion.mockResolvedValue('1.4.9-1023')
    setLocalValue.mockClear()
  })

  it('非 memfit 不请求版本', async () => {
    isMemfitMock.mockReturnValue(false)
    render(<MemfitWhatsNewModal />)
    await act(async () => {
      await Promise.resolve()
    })
    expect(grpcFetchLocalYakitVersion).not.toHaveBeenCalled()
    expect(screen.queryByTestId('whats-new-modal')).toBeNull()
  })

  it('版本匹配且未确认时弹出', async () => {
    render(<MemfitWhatsNewModal />)
    await waitFor(() => {
      expect(screen.getByTestId('whats-new-modal')).toBeTruthy()
    })
    expect(screen.getByText('模型限免')).toBeTruthy()
    expect(screen.queryByText('任务详情页面增加进度看板')).toBeNull()
  })

  it('三页可翻页，末页知道了关闭并写入，重开回到第一页', async () => {
    render(<MemfitWhatsNewModal />)
    await waitFor(() => {
      expect(screen.getByTestId('whats-new-modal')).toBeTruthy()
    })
    expect(screen.getByText('模型限免')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'YakitButton.next' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'YakitButton.iKnow' })).toBeNull()

    await act(async () => {
      clickByName('YakitButton.next')
    })
    expect(screen.getByText('任务详情页面增加进度看板')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'YakitButton.prev' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'YakitButton.next' })).toBeTruthy()

    await act(async () => {
      clickByName('YakitButton.prev')
    })
    expect(screen.getByText('模型限免')).toBeTruthy()

    await act(async () => {
      clickByName('YakitButton.next')
    })
    await act(async () => {
      clickByName('YakitButton.next')
    })
    expect(screen.getByText('Goal模式增加持续时间设置')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'YakitButton.iKnow' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'YakitButton.next' })).toBeNull()

    await act(async () => {
      clickByName('YakitButton.iKnow')
    })
    expect(screen.queryByTestId('whats-new-modal')).toBeNull()
    expect(setLocalValue).toHaveBeenCalledWith(LocalGVS.WhatsNewAckVersion, '1.4.9-1023')

    const handler = latestOpenHandler()
    expect(handler).toEqual(expect.any(Function))
    await act(async () => {
      handler()
    })
    await waitFor(() => {
      expect(screen.getByTestId('whats-new-modal')).toBeTruthy()
    })
    expect(screen.getByText('模型限免')).toBeTruthy()
    expect(screen.queryByText('Goal模式增加持续时间设置')).toBeNull()
  })

  it('已确认当前版本不弹', async () => {
    getLocalValue.mockResolvedValue('1.4.9-1023')
    render(<MemfitWhatsNewModal />)
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(screen.queryByTestId('whats-new-modal')).toBeNull()
  })

  it('手动打开事件在已确认后仍可弹出', async () => {
    getLocalValue.mockResolvedValue('1.4.9-1023')
    render(<MemfitWhatsNewModal />)
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(screen.queryByTestId('whats-new-modal')).toBeNull()
    const handler = latestOpenHandler()
    expect(handler).toEqual(expect.any(Function))
    await act(async () => {
      handler()
    })
    await waitFor(() => {
      expect(screen.getByTestId('whats-new-modal')).toBeTruthy()
    })
  })
})
