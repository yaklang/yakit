import type { ReactNode } from 'react'
import type * as Ahooks from 'ahooks'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UIEngineList } from '../index'
import { yakitEngine } from '@/utils/electronBridge'
import { showYakitModal } from '@/components/yakitUI/YakitModal/YakitModalConfirm'

vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('ahooks', async (importOriginal) => ({
  ...(await importOriginal<typeof Ahooks>()),
  useInViewport: () => [true],
}))
vi.mock('@/utils/electronBridge', () => ({
  yakitEngine: {
    listYakGrpc: vi.fn(),
    fetchYaklangEngineAddr: vi.fn(),
    connectYaklangEngine: vi.fn(),
    killYakGrpc: vi.fn(),
  },
  yakitApp: {},
}))
vi.mock('@/components/yakitUI/YakitPopover/YakitPopover', () => ({
  YakitPopover: ({ content }: { content: ReactNode }) => <div>{content}</div>,
}))
vi.mock('@/components/yakitUI/YakitModal/YakitModalConfirm', () => ({ showYakitModal: vi.fn() }))

describe('authenticated engine process management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(yakitEngine.listYakGrpc).mockResolvedValue([
      {
        pid: 4242,
        ppid: 42,
        port: 19011,
        cmd: 'yak grpc --local-password private-password',
        origin: { password: 'private-password' },
      },
    ])
    vi.mocked(yakitEngine.fetchYaklangEngineAddr).mockResolvedValue({ addr: '127.0.0.1:9011' })
  })

  it('disables credentialless switching and never connects or kills the current engine', async () => {
    const onChange = vi.fn()
    render(<UIEngineList engineMode="local" engineLink typeCallback={onChange} />)
    const button = await screen.findByRole('button', { name: 'UIEngineList.switch_engine' })
    expect((button as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(button)
    expect(yakitEngine.connectYaklangEngine).not.toHaveBeenCalled()
    expect(yakitEngine.killYakGrpc).not.toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('shows diagnostic PID and port but never displays command-line passwords', async () => {
    render(<UIEngineList engineMode="local" engineLink typeCallback={vi.fn()} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Details' }))
    const content = vi.mocked(showYakitModal).mock.calls[0][0].content
    render(<div>{content}</div>)
    expect(screen.getByText(/"pid":4242/).textContent).toContain('"port":19011')
    expect(screen.queryByText(/private-password/)).toBeNull()
  })
})
