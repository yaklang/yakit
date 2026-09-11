import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UIEngineList } from '../index'
import { yakitEngine } from '@/utils/electronBridge'
import { showYakitModal } from '@/components/yakitUI/YakitModal/YakitModalConfirm'

vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('@/utils/electronBridge', () => ({
  yakitEngine: {
    listYakGrpc: vi.fn(),
    getBuildInEngineVersion: vi.fn(),
    currentLocalEngine: vi.fn(),
    connectYaklangEngine: vi.fn(),
    killYakGrpc: vi.fn(),
    stopLocalEngine: vi.fn(),
    stopAllLocalEngines: vi.fn(),
    disconnectLocalEngine: vi.fn(),
    restoreEngineAndPlugin: vi.fn(),
    writeEngineKeyToYakitProjects: vi.fn(),
  },
}))
vi.mock('@/components/yakitUI/YakitPopover/YakitPopover', () => ({
  YakitPopover: ({ content, onOpenChange }: { content: ReactNode; onOpenChange: (open: boolean) => void }) => (
    <div>
      <button onClick={() => onOpenChange(true)}>open</button>
      {content}
    </div>
  ),
}))
vi.mock('@/components/yakitUI/YakitPopconfirm/YakitPopconfirm', () => ({
  YakitPopconfirm: ({ children, onConfirm }: { children: ReactNode; onConfirm: () => void }) => (
    <div onClick={onConfirm}>{children}</div>
  ),
}))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children, disabled, onClick }: { children: ReactNode; disabled?: boolean; onClick?: () => void }) => (
    <button disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}))
vi.mock('@/components/yakitUI/YakitModal/YakitModalConfirm', () => ({ showYakitModal: vi.fn() }))

const external: LocalEngineInstance = {
  id: 'observed-4242',
  pid: 4242,
  transport: 'unknown',
  displayEndpoint: '',
  state: 'observed',
  ownership: 'external',
  current: false,
  actions: { stop: false, connect: false },
  actionReason: 'external_read_only',
}
const managed: LocalEngineInstance = {
  id: 'owned-1',
  pid: 42,
  transport: 'npipe',
  displayEndpoint: '\\\\.\\pipe\\中文 & long-session-name',
  state: 'ready',
  endpoint: { transport: 'npipe', path: '\\\\.\\pipe\\中文 & long-session-name' },
  ownership: 'managed',
  current: true,
  actions: { stop: true, connect: false },
  actionReason: '',
}
const mount = (change = vi.fn()) => {
  render(<UIEngineList engineMode="local" engineLink typeCallback={change} />)
  fireEvent.click(screen.getByText('open'))
  return change
}

describe('managed engine UI safety', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(yakitEngine.listYakGrpc).mockResolvedValue([external])
    vi.mocked(yakitEngine.getBuildInEngineVersion).mockResolvedValue('test-bundled')
  })
  it('keeps external discovery read-only and offers credential settings without anonymous switching', async () => {
    const change = mount()
    const stop = await screen.findByRole('button', { name: 'EngineManagement.stop' })
    expect((stop as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(await screen.findByRole('button', { name: 'EngineManagement.settings' }))
    expect(showYakitModal).toHaveBeenCalled()
    expect(yakitEngine.connectYaklangEngine).not.toHaveBeenCalled()
    expect(yakitEngine.killYakGrpc).not.toHaveBeenCalled()
    expect(change).not.toHaveBeenCalled()
  })
  it('renders whitelist details and does not leak unexpected fields', async () => {
    vi.mocked(yakitEngine.listYakGrpc).mockResolvedValue([
      { ...external, ...{ cmd: 'private-password', origin: { secret: 'private-password' } } },
    ])
    mount()
    fireEvent.click(await screen.findByRole('button', { name: 'EngineManagement.details' }))
    render(<div>{vi.mocked(showYakitModal).mock.calls[0][0].content as ReactNode}</div>)
    expect(screen.queryByText(/private-password/)).toBeNull()
    expect(screen.queryByText(/yak grpc --port/)).toBeNull()
    expect(screen.getByText('4242')).toBeTruthy()
  })
  it('shows current IPC by instance identity without a fake port', async () => {
    vi.mocked(yakitEngine.listYakGrpc).mockResolvedValue([managed, external])
    mount()
    expect(await screen.findByText(/EngineManagement.current/)).toBeTruthy()
    expect(screen.getByTitle(managed.displayEndpoint)).toBeTruthy()
    expect(screen.queryByText(/8087|9011|获取中/)).toBeNull()
  })
  it('retains a failed stop and never announces a disconnection', async () => {
    vi.mocked(yakitEngine.listYakGrpc).mockResolvedValue([managed])
    vi.mocked(yakitEngine.stopLocalEngine).mockResolvedValue({ ok: false, stopped: false })
    const change = mount()
    fireEvent.click(await screen.findByRole('button', { name: 'EngineManagement.stop' }))
    await screen.findByText('EngineManagement.stopFailed')
    expect(yakitEngine.stopLocalEngine).toHaveBeenCalledWith('owned-1')
    expect(change).not.toHaveBeenCalled()
  })
  it('disconnects without stopping a process', async () => {
    vi.mocked(yakitEngine.listYakGrpc).mockResolvedValue([managed])
    vi.mocked(yakitEngine.disconnectLocalEngine).mockResolvedValue({ ok: true })
    const change = mount()
    fireEvent.click(await screen.findByRole('button', { name: 'EngineManagement.disconnect' }))
    await waitFor(() => expect(change).toHaveBeenCalledWith('break'))
    expect(yakitEngine.stopLocalEngine).not.toHaveBeenCalled()
  })
  it('does not overwrite the engine after partial stop failure', async () => {
    vi.mocked(yakitEngine.stopAllLocalEngines).mockResolvedValue({ ok: false, stopped: false })
    mount()
    await waitFor(() =>
      expect(
        (screen.getByRole('button', { name: 'EngineManagement.restore', hidden: true }) as HTMLButtonElement).disabled,
      ).toBe(false),
    )
    fireEvent.click(screen.getByRole('button', { name: 'EngineManagement.restore', hidden: true }))
    await screen.findByText('EngineManagement.stopFailed')
    expect(yakitEngine.restoreEngineAndPlugin).not.toHaveBeenCalled()
  })
  it('does not report restoration success after extraction failure', async () => {
    vi.mocked(yakitEngine.stopAllLocalEngines).mockResolvedValue({ ok: true, stopped: true })
    vi.mocked(yakitEngine.restoreEngineAndPlugin).mockRejectedValue(new Error('extract failed'))
    mount()
    await waitFor(() =>
      expect(
        (screen.getByRole('button', { name: 'EngineManagement.restore', hidden: true }) as HTMLButtonElement).disabled,
      ).toBe(false),
    )
    fireEvent.click(screen.getByRole('button', { name: 'EngineManagement.restore', hidden: true }))
    await screen.findByText('EngineManagement.operationFailed')
    expect(yakitEngine.writeEngineKeyToYakitProjects).not.toHaveBeenCalled()
    expect(screen.queryByText('EngineManagement.restored')).toBeNull()
  })
})
