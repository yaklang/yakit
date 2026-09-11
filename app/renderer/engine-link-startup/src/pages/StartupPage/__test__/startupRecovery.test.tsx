import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import enLink from '../../../locales/en/link.json'
import zhLink from '../../../locales/zh/link.json'
import zhTWLink from '../../../locales/zh-TW/link.json'

const mocks = vi.hoisted(() => ({
  cancelAllTasks: vi.fn(),
  localInit: vi.fn(),
  localLink: vi.fn(),
  installYakEngine: vi.fn(),
  emit: vi.fn(),
  mainWindowHandler: undefined as undefined | ((data: { yakitStatus: string }) => void),
}))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  normalizeLang: (lang: string) => lang,
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))
vi.mock('@/i18n/i18n', () => ({ default: { changeLanguage: vi.fn() } }))
vi.mock('@/utils/logCollection', () => ({ debugToPrintLog: vi.fn() }))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/utils/kv', () => ({
  getLocalValue: vi.fn(() => new Promise(() => {})),
  setLocalValue: vi.fn(),
}))
vi.mock('@/utils/eventBus/eventBus', () => ({ default: { emit: mocks.emit } }))
vi.mock('@/hooks/useTheme', () => ({ useTheme: () => ({ theme: 'light', setTheme: vi.fn() }) }))
vi.mock('@/utils/envfile', () => ({
  FetchSoftwareVersion: vi.fn(),
  GetConnectPort: () => 9011,
  getReleaseEditionName: () => 'Yakit',
  isCommunityEdition: () => true,
  isCommunityIRify: () => false,
  isCommunityMemfit: () => false,
  isEnpriTrace: () => false,
  isEnpriTraceAgent: () => false,
  isEnpriTraceIRify: () => false,
  isIRify: () => false,
  isMemfit: () => false,
}))
vi.mock('@/utils/electronBridge', () => ({
  yakitEngine: {
    cancelAllTasks: mocks.cancelAllTasks,
    clearLocalYaklangVersionCache: vi.fn(),
    fetchYaklangVersionList: vi.fn().mockResolvedValue(''),
    installYakEngine: mocks.installYakEngine,
    onStartYaklangEngineError: vi.fn(() => vi.fn()),
    verifyYakEngineVersion: vi.fn().mockResolvedValue(true),
  },
  yakitApp: {
    completeEngineLink: vi.fn(),
    getYakitHomeConfig: vi.fn().mockResolvedValue({ softLange: 'zh' }),
    onCredentialUpdate: vi.fn(() => vi.fn()),
    onFromMainWindow: vi.fn((handler) => {
      mocks.mainWindowHandler = handler
      return vi.fn()
    }),
  },
}))
vi.mock('../grpc', () => ({
  grpcFetchBuildInYakVersion: vi.fn(() => new Promise(() => {})),
  grpcFetchLocalYakitVersion: vi.fn(() => new Promise(() => {})),
  grpcFetchYakInstallResult: vi.fn(() => new Promise(() => {})),
  grpcFixupDatabase: vi.fn(),
  grpcInitCVEDatabase: vi.fn().mockResolvedValue(undefined),
  grpcReclaimDatabaseSpace: vi.fn(),
  grpcRelaunch: vi.fn(),
  grpcUnpackBuildInYak: vi.fn(),
  grpcWriteEngineKeyToYakitProjects: vi.fn(),
}))
vi.mock('../utils', () => ({
  DragHeaderHeight: 0,
  SystemInfo: {},
  handleFetchArchitecture: vi.fn(),
  handleFetchIsDev: vi.fn(),
  handleFetchSystem: vi.fn((callback) => callback('Darwin')),
  outputToWelcomeConsole: vi.fn(),
}))
vi.mock('../components/SoftwareBasics', () => ({
  SoftwareBasics: ({ onConfirm }: { onConfirm: () => void }) => <button onClick={onConfirm}>confirm workspace</button>,
}))
vi.mock('../components/LocalEngine', async () => {
  const React = await import('react')
  return {
    LocalEngine: React.forwardRef((_props, ref) => {
      React.useImperativeHandle(ref, () => ({
        init: mocks.localInit,
        link: mocks.localLink,
        checkEngine: vi.fn(),
        checkEngineSource: vi.fn(),
      }))
      return null
    }),
  }
})
vi.mock('../components/YakitLoading', () => ({
  YakitLoading: (props: any) => (
    <div>
      <div data-testid="status">{props.yakitStatus}</div>
      <div data-testid="check-log">{props.checkLog.join('|')}</div>
      <div data-testid="recovery-busy">{String(props.restartLoading)}</div>
      <button onClick={() => props.btnClickCallback('error')}>retry error</button>
      <button onClick={() => props.btnClickCallback('start_timeout')}>retry start timeout</button>
      <button onClick={() => props.btnClickCallback('port_occupied', { port: 9022 })}>switch port</button>
      <button onClick={() => props.setYaklangSpecifyVersion('v1.2.3')}>install version</button>
      <button onClick={() => props.btnClickCallback('remote')}>switch directly to remote</button>
      <button onClick={() => props.btnClickCallback('break', { isRemote: true })}>disconnect to remote</button>
    </div>
  ),
}))
vi.mock('../components/DownloadYaklang', () => ({ DownloadYaklang: () => null }))
vi.mock('../components/EngineLog', () => ({ EngineLog: () => null }))
vi.mock('../components/RemoteEngine/RemoteEngine', () => ({
  RemoteEngine: () => <div data-testid="remote-engine">remote engine</div>,
}))
vi.mock('../components/YaklangEngineWatchDog', () => ({ YaklangEngineWatchDog: () => null }))

import { StartupPage } from '../index'

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

function renderErrorPage() {
  render(<StartupPage />)
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: 'confirm workspace' }))
    mocks.mainWindowHandler?.({ yakitStatus: 'error' })
  })
  expect(screen.getByTestId('status').textContent).toBe('error')
}

describe('StartupPage owned-engine recovery', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mocks.mainWindowHandler = undefined
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('waits for owned-engine cleanup before retrying a failed check', async () => {
    const cleanup = deferred<{ ok: true; canceled: number; status: 'cancelled' }>()
    mocks.cancelAllTasks.mockReturnValue(cleanup.promise)
    renderErrorPage()

    fireEvent.click(screen.getByRole('button', { name: 'retry error' }))

    expect(mocks.localLink).not.toHaveBeenCalled()
    cleanup.resolve({ ok: true, canceled: 1, status: 'cancelled' })
    await act(async () => {
      await cleanup.promise
    })
    expect(mocks.localLink).toHaveBeenCalledOnce()
  })

  it('blocks other recovery actions while owned-engine cleanup is pending', async () => {
    mocks.cancelAllTasks.mockReturnValue(new Promise(() => {}))
    renderErrorPage()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'retry error' }))
      fireEvent.click(screen.getByRole('button', { name: 'switch port' }))
      fireEvent.click(screen.getByRole('button', { name: 'install version' }))
    })

    expect(mocks.cancelAllTasks).toHaveBeenCalledOnce()
    expect(mocks.localInit).not.toHaveBeenCalled()
    expect(mocks.localLink).not.toHaveBeenCalled()
    expect(mocks.installYakEngine).not.toHaveBeenCalled()
  })

  it('does not retry when owned-engine cleanup resolves with a process error', async () => {
    mocks.cancelAllTasks.mockResolvedValue({
      ok: false,
      canceled: 0,
      status: 'process_error',
      message: 'private process detail',
    })
    renderErrorPage()

    fireEvent.click(screen.getByRole('button', { name: 'retry error' }))
    await act(async () => {})

    expect(mocks.localLink).not.toHaveBeenCalled()
    expect(screen.getByTestId('check-log').textContent).toContain('StartupPage.stop_owned_engine_failed')
    expect(screen.getByTestId('check-log').textContent).not.toContain('private process detail')
  })

  it('allows a retry after an owned-engine cleanup failure settles', async () => {
    mocks.cancelAllTasks
      .mockResolvedValueOnce({
        ok: false,
        canceled: 0,
        status: 'process_error',
        message: 'still alive',
      })
      .mockResolvedValueOnce({ ok: true, canceled: 1, status: 'cancelled' })
    renderErrorPage()

    fireEvent.click(screen.getByRole('button', { name: 'retry error' }))
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: 'retry error' }))
    await act(async () => {})

    expect(mocks.cancelAllTasks).toHaveBeenCalledTimes(2)
    expect(mocks.localLink).toHaveBeenCalledOnce()
  })

  it('does not switch ports when owned-engine cleanup rejects', async () => {
    mocks.cancelAllTasks.mockRejectedValue(new Error('raw ipc failure'))
    renderErrorPage()

    fireEvent.click(screen.getByRole('button', { name: 'switch port' }))
    await act(async () => {})

    expect(mocks.localInit).not.toHaveBeenCalled()
    expect(mocks.localLink).not.toHaveBeenCalled()
    expect(screen.getByTestId('check-log').textContent).toContain('StartupPage.stop_owned_engine_failed')
    expect(screen.getByTestId('check-log').textContent).not.toContain('raw ipc failure')
  })

  it('checks the selected port after owned-engine cleanup succeeds', async () => {
    mocks.cancelAllTasks.mockResolvedValue({ ok: true, canceled: 1, status: 'cancelled' })
    renderErrorPage()

    fireEvent.click(screen.getByRole('button', { name: 'switch port' }))
    await act(async () => {})

    expect(mocks.localInit).toHaveBeenCalledExactlyOnceWith(9022)
  })

  it('does not install a selected version when owned-engine cleanup fails', async () => {
    mocks.cancelAllTasks.mockResolvedValue({
      ok: false,
      canceled: 0,
      status: 'process_error',
      message: 'still alive',
    })
    renderErrorPage()

    fireEvent.click(screen.getByRole('button', { name: 'install version' }))
    await act(async () => {})

    expect(mocks.installYakEngine).not.toHaveBeenCalled()
  })

  it('keeps the local recovery view when disconnect cleanup fails', async () => {
    mocks.cancelAllTasks.mockResolvedValue({
      ok: false,
      canceled: 0,
      status: 'process_error',
      message: 'still alive',
    })
    renderErrorPage()

    fireEvent.click(screen.getByRole('button', { name: 'disconnect to remote' }))
    await act(async () => {})

    expect(screen.queryByTestId('remote-engine')).toBeNull()
    expect(screen.getByTestId('status').textContent).toBe('check_error')
    expect(screen.getByTestId('check-log').textContent).toContain('StartupPage.stop_owned_engine_failed')
    expect(mocks.emit).not.toHaveBeenCalled()
  })

  it('keeps the local recovery view when disconnect cleanup rejects', async () => {
    mocks.cancelAllTasks.mockRejectedValue(new Error('raw ipc failure'))
    renderErrorPage()

    fireEvent.click(screen.getByRole('button', { name: 'disconnect to remote' }))
    await act(async () => {})

    expect(screen.queryByTestId('remote-engine')).toBeNull()
    expect(screen.getByTestId('status').textContent).toBe('check_error')
    expect(screen.getByTestId('check-log').textContent).toContain('StartupPage.stop_owned_engine_failed')
    expect(mocks.emit).not.toHaveBeenCalled()
  })

  it('waits for cleanup before retrying a failed startup', async () => {
    const cleanup = deferred<{ ok: true; canceled: number; status: 'cancelled' }>()
    mocks.cancelAllTasks.mockReturnValue(cleanup.promise)
    renderErrorPage()

    fireEvent.click(screen.getByRole('button', { name: 'retry start timeout' }))

    expect(mocks.cancelAllTasks).toHaveBeenCalledOnce()
    cleanup.resolve({ ok: true, canceled: 1, status: 'cancelled' })
    await act(async () => {
      await cleanup.promise
      vi.advanceTimersByTime(100)
    })
    expect(mocks.emit).toHaveBeenCalledExactlyOnceWith('startAndCreateEngineProcess')
  })

  it('does not retry a failed startup when cleanup fails', async () => {
    mocks.cancelAllTasks.mockResolvedValue({
      ok: false,
      canceled: 0,
      status: 'process_error',
      message: 'still alive',
    })
    renderErrorPage()

    fireEvent.click(screen.getByRole('button', { name: 'retry start timeout' }))
    await act(async () => {
      vi.advanceTimersByTime(100)
    })

    expect(mocks.cancelAllTasks).toHaveBeenCalledOnce()
    expect(mocks.emit).not.toHaveBeenCalled()
    expect(screen.getByTestId('status').textContent).toBe('check_error')
  })

  it('allows selecting the same version after cleanup failure', async () => {
    mocks.cancelAllTasks
      .mockResolvedValueOnce({
        ok: false,
        canceled: 0,
        status: 'process_error',
        message: 'still alive',
      })
      .mockResolvedValueOnce({ ok: true, canceled: 1, status: 'cancelled' })
    renderErrorPage()

    fireEvent.click(screen.getByRole('button', { name: 'install version' }))
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: 'install version' }))
    await act(async () => {})

    expect(mocks.cancelAllTasks).toHaveBeenCalledTimes(2)
  })

  it('switches to remote mode after disconnect cleanup succeeds', async () => {
    mocks.cancelAllTasks.mockResolvedValue({ ok: true, canceled: 1, status: 'cancelled' })
    renderErrorPage()

    fireEvent.click(screen.getByRole('button', { name: 'disconnect to remote' }))
    await act(async () => {})

    expect(screen.getByTestId('remote-engine').textContent).toBe('remote engine')
  })

  it('waits for owned-engine cleanup before switching directly to remote mode', async () => {
    const cleanup = deferred<{ ok: true; canceled: number; status: 'cancelled' }>()
    mocks.cancelAllTasks.mockReturnValue(cleanup.promise)
    renderErrorPage()

    fireEvent.click(screen.getByRole('button', { name: 'switch directly to remote' }))
    expect(screen.queryByTestId('remote-engine')).toBeNull()
    expect(screen.getByTestId('recovery-busy').textContent).toBe('true')

    cleanup.resolve({ ok: true, canceled: 1, status: 'cancelled' })
    await act(async () => {
      await cleanup.promise
    })

    expect(screen.getByTestId('remote-engine').textContent).toBe('remote engine')
  })

  it('keeps the local recovery view when direct remote cleanup reports a process error', async () => {
    mocks.cancelAllTasks.mockResolvedValue({
      ok: false,
      canceled: 0,
      status: 'process_error',
      message: 'private process detail',
    })
    renderErrorPage()

    fireEvent.click(screen.getByRole('button', { name: 'switch directly to remote' }))
    await act(async () => {})

    expect(screen.queryByTestId('remote-engine')).toBeNull()
    expect(screen.getByTestId('check-log').textContent).toContain('StartupPage.stop_owned_engine_failed')
    expect(screen.getByTestId('check-log').textContent).not.toContain('private process detail')
  })

  it('keeps the local recovery view when direct remote cleanup rejects', async () => {
    mocks.cancelAllTasks.mockRejectedValue(new Error('raw ipc failure'))
    renderErrorPage()

    fireEvent.click(screen.getByRole('button', { name: 'switch directly to remote' }))
    await act(async () => {})

    expect(screen.queryByTestId('remote-engine')).toBeNull()
    expect(screen.getByTestId('check-log').textContent).toContain('StartupPage.stop_owned_engine_failed')
    expect(screen.getByTestId('check-log').textContent).not.toContain('raw ipc failure')
  })

  it.each([
    ['en', enLink.StartupPage.stop_owned_engine_failed],
    ['zh', zhLink.StartupPage.stop_owned_engine_failed],
    ['zh-TW', zhTWLink.StartupPage.stop_owned_engine_failed],
  ])('provides a localized owned-engine cleanup failure message for %s', (_language, message) => {
    expect(message.trim()).not.toBe('')
    expect(message).not.toContain('raw ipc failure')
  })
})
