import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { YakitLoading, type YakitLoadingProp } from '../index'
import { engineFailureStatus } from '../../../engineFailure'

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'zh' }, i18nRefresh: 0 }),
}))
vi.mock('@/utils/kv', () => ({ getLocalValue: vi.fn(() => new Promise(() => {})), setLocalValue: vi.fn() }))
vi.mock('@/utils/electronBridge', () => ({ yakitApp: {}, yakitEngine: {} }))
vi.mock('../../AgreementContentModal', () => ({ AgreementContentModal: () => null }))
vi.mock('../../MoreYaklangVersion', () => ({
  MoreYaklangVersion: ({ onClosePop }: { onClosePop: (visible: boolean, version: string) => void }) => (
    <button onClick={() => onClosePop(false, 'v1.2.3')}>choose v1.2.3</button>
  ),
}))

function show(status: YakitLoadingProp['yakitStatus'], overrides: Partial<YakitLoadingProp> = {}) {
  const callback = vi.fn()
  const setYaklangSpecifyVersion = vi.fn()
  render(
    <YakitLoading
      yakitLoadingTip=""
      disableYakitLoading={false}
      isTop={0}
      setIsTop={vi.fn()}
      system="Windows_NT"
      buildInEngineVersion=""
      yakitStatus={status}
      engineMode="local"
      checkLog={['failed']}
      restartLoading={false}
      dbPath={[]}
      port={9011}
      moreYaklangVersionList={[]}
      setYaklangSpecifyVersion={setYaklangSpecifyVersion}
      btnClickCallback={callback}
      {...overrides}
    />,
  )
  return { callback, setYaklangSpecifyVersion }
}

describe('startup recovery buttons', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })
  afterEach(() => vi.unstubAllGlobals())
  it.each(['unknown', 'unknownReason', 'process_error', 'exception', 'protocol_error', 'call_error'])(
    'check %s retries the complete check before credentials exist',
    (failure) => {
      const status = engineFailureStatus(failure, 'check')!
      const { callback } = show(status)
      fireEvent.click(screen.getByRole('button', { name: 'YakitLoading.retry' }))
      expect(callback).toHaveBeenCalledExactlyOnceWith('check_timeout')
    },
  )

  it('a start bind failure retains the full check recovery action', () => {
    const { callback } = show(engineFailureStatus('endpoint_unreachable', 'start')!)
    fireEvent.click(screen.getByRole('button', { name: 'YakitLoading.retry' }))
    expect(callback).toHaveBeenCalledExactlyOnceWith('endpoint_unreachable')
  })

  it('a start timeout can retry with the existing credentials', () => {
    const { callback } = show('start_timeout')
    fireEvent.click(screen.getByRole('button', { name: 'YakitLoading.retry' }))
    expect(callback).toHaveBeenCalledExactlyOnceWith('start_timeout')
  })

  it.each(['engine_exited', 'engine_init_failed', 'engine_failed'] as const)(
    'a start %s failure retries with the original process status',
    (failure) => {
      const status = engineFailureStatus(failure, 'start')!
      const { callback } = show(status)
      fireEvent.click(screen.getByRole('button', { name: 'YakitLoading.retry' }))
      expect(callback).toHaveBeenCalledExactlyOnceWith(failure)
    },
  )

  it('an occupied port never offers to kill an unrelated engine implicitly', () => {
    const { callback } = show('port_occupied_prev')
    fireEvent.click(screen.getByRole('button', { name: 'YakitLoading.reconnect' }))
    expect(callback).toHaveBeenLastCalledWith('check_timeout')
    fireEvent.click(screen.getByRole('button', { name: 'YakitLoading.switch_port' }))
    expect(callback).toHaveBeenLastCalledWith('port_occupied_prev')
  })

  it('Windows denied ports allow a regular retry or a different port', () => {
    const { callback } = show('port_denied')
    fireEvent.click(screen.getByRole('button', { name: 'YakitLoading.retry' }))
    expect(callback).toHaveBeenLastCalledWith('port_denied')
    fireEvent.click(screen.getByRole('button', { name: 'YakitLoading.switch_port' }))
    expect(callback).toHaveBeenLastCalledWith('port_occupied_prev')
  })

  it('shows cleanup failure details instead of the disconnected message', () => {
    show('check_error')
    expect(screen.getByText('failed')).toBeTruthy()
  })

  it('does not open or select more engine versions while recovery is busy', () => {
    const { setYaklangSpecifyVersion } = show('check_error', {
      restartLoading: true,
      moreYaklangVersionList: ['v1.2.3'],
    })

    fireEvent.click(screen.getByTestId('engine-more-versions'))

    expect(screen.queryByRole('button', { name: 'choose v1.2.3' })).toBeNull()
    expect(setYaklangSpecifyVersion).not.toHaveBeenCalled()
  })
})
