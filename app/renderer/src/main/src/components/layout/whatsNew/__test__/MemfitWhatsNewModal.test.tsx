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
      items: [{ title: '更新说明', description: '测试内容' }],
    },
  }
})

import { MemfitWhatsNewModal } from '../MemfitWhatsNewModal'

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
    expect(screen.getByText('更新说明')).toBeTruthy()
  })

  it('点知道了后写入当前版本', async () => {
    render(<MemfitWhatsNewModal />)
    await waitFor(() => {
      expect(screen.getByTestId('whats-new-modal')).toBeTruthy()
    })
    await act(async () => {
      screen.getByRole('button').click()
    })
    expect(setLocalValue).toHaveBeenCalledWith(LocalGVS.WhatsNewAckVersion, '1.4.9-1023')
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
    const calls = emiterOn.mock.calls.filter((call) => call[0] === 'openMemfitWhatsNew')
    const handler = calls[calls.length - 1]?.[1]
    expect(handler).toEqual(expect.any(Function))
    await act(async () => {
      handler()
    })
    await waitFor(() => {
      expect(screen.getByTestId('whats-new-modal')).toBeTruthy()
    })
  })
})
