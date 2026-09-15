import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BrowserPairingRequest } from '@/pages/browserExtension/browserExtensionClient'
import type { AIBrowserInstance } from '../browserInstanceStore'
import type * as BrowserInstanceStoreModule from '../browserInstanceStore'

const mocks = vi.hoisted(() => ({
  requestBrowserExtensionSnapshot: vi.fn(),
  refreshBrowserInstances: vi.fn(),
  useBrowserInstances: vi.fn(),
  success: vi.fn(),
  failed: vi.fn(),
  modalConfirm: vi.fn(),
}))

vi.mock('@/i18n/i18n', () => {
  const t = (key: string, options?: Record<string, unknown>) => {
    if (!options) return key
    const interpolated = Object.entries(options).reduce(
      (text, [name, value]) => text.replace(`{{${name}}}`, String(value)),
      key,
    )
    if (interpolated !== key) return interpolated
    return `${key} ${Object.values(options).join(' ')}`.trim()
  }
  return {
    default: {
      t,
      getFixedT: () => t,
    },
  }
})
vi.mock('@/components/yakitUI/YakitTag/YakitTag', () => ({
  YakitTag: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))
vi.mock('@/components/yakitUI/YakitSpin/YakitSpin', () => ({
  YakitSpin: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock('@/components/yakitUI/YakitInput/YakitInput', () => ({
  YakitInput: ({
    value,
    onChange,
    onPressEnter,
  }: {
    value?: string
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
    onPressEnter?: () => void
  }) => (
    <input
      value={value}
      onChange={onChange}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onPressEnter?.()
      }}
    />
  ),
}))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({
    children,
    onClick,
    'aria-label': ariaLabel,
    disabled,
  }: React.PropsWithChildren<{
    onClick?: () => void
    'aria-label'?: string
    disabled?: boolean
    loading?: boolean
    icon?: React.ReactNode
    type?: string
    size?: string
    danger?: boolean
  }>) => (
    <button type="button" aria-label={ariaLabel} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}))
vi.mock('@/utils/notification', () => ({
  success: mocks.success,
  failed: mocks.failed,
}))
vi.mock('@/pages/browserExtension/browserExtensionClient', () => ({
  requestBrowserExtensionSnapshot: mocks.requestBrowserExtensionSnapshot,
  approveBrowserExtensionPairing: vi.fn(),
  rejectBrowserExtensionPairing: vi.fn(),
  callBrowserExtensionCapability: vi.fn(),
}))
vi.mock('../browserInstanceStore', async () => {
  const actual = await vi.importActual<typeof BrowserInstanceStoreModule>('../browserInstanceStore')
  return {
    ...actual,
    useBrowserInstances: mocks.useBrowserInstances,
    refreshBrowserInstances: mocks.refreshBrowserInstances,
    readBrowserThumbnail: vi.fn(async () => undefined),
    selectBrowserInstance: vi.fn(),
  }
})
vi.mock('@/components/yakitUI/YakitModal/YakitModalConfirm', () => ({
  YakitModalConfirm: mocks.modalConfirm,
}))
vi.mock('@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu', () => ({
  YakitDropdownMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock('@/components/yakitUI/YakitPopover/YakitPopover', () => ({
  YakitPopover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import {
  BrowserInstancesPanel,
  browserProductLabel,
  formatLastSeen,
  openPairingWindow,
  pairingSubtitle,
  renameBrowserDevice,
} from '../BrowserInstancesPanel'

const baseInstance = (
  partial: Partial<AIBrowserInstance> & Pick<AIBrowserInstance, 'id' | 'online'>,
): AIBrowserInstance => ({
  installationId: `install-${partial.id}`,
  name: partial.name || `Browser ${partial.id}`,
  client: 'Chrome',
  clientVersion: '131.0.0',
  origin: `chrome-extension://${partial.id}`,
  createdAt: 1,
  lastSeenAt: 1_700_000_000_000,
  running: false,
  ...partial,
})

const pairingRequest = (partial: Partial<BrowserPairingRequest> = {}): BrowserPairingRequest => ({
  id: 'pairing-1',
  installationId: 'install-1',
  extensionId: 'ext-1',
  client: 'Chrome',
  clientVersion: '131.0.0',
  origin: 'chrome-extension://ext-1',
  code: '123456',
  createdAt: Date.now() - 1_000,
  expiresAt: Date.now() + 60_000,
  ...partial,
})

describe('BrowserInstancesPanel helpers', () => {
  it('formatLastSeen returns dash for invalid timestamps and formats valid ones', () => {
    expect(formatLastSeen(0)).toBe('-')
    expect(formatLastSeen(Number.NaN)).toBe('-')
    expect(formatLastSeen(1_700_000_000_000)).toMatch(/^\d{4}\/\d{1,2}\/\d{1,2} \d{2}:\d{2}:\d{2}$/)
  })

  it('browserProductLabel prefers readable product text and drops extension/protocol clients', () => {
    expect(browserProductLabel({ client: 'extension', clientVersion: '0.2.4' })).toBe('0.2.4')
    expect(browserProductLabel({ client: 'Chrome', clientVersion: '131.0.0' })).toBe('Chrome 131.0.0')
    expect(browserProductLabel({ client: 'Chrome for Testing', clientVersion: 'Chrome for Testing 152' })).toBe(
      'Chrome for Testing 152',
    )
    expect(browserProductLabel({ client: '', clientVersion: '1.0.0' })).toBe('1.0.0')
  })

  it('pairingSubtitle uses origin and appends managed manager', () => {
    expect(pairingSubtitle(pairingRequest({ origin: 'chrome-extension://a' }))).toBe('chrome-extension://a')
    expect(
      pairingSubtitle(
        pairingRequest({
          origin: 'chrome-extension://a',
          managedInstance: { manager: 'ytray', instanceId: 'ytray-a', badge: 'A' },
        }),
      ),
    ).toBe('chrome-extension://a · YTray')
    expect(
      pairingSubtitle(
        pairingRequest({
          origin: 'chrome-extension://a',
          managedInstance: { manager: 'yakit', instanceId: 'yakit-a', badge: 'A' },
        }),
      ),
    ).toBe('chrome-extension://a · yakit')
  })
})

describe('renameBrowserDevice / openPairingWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requestBrowserExtensionSnapshot.mockResolvedValue({ pending: [], devices: [] })
    mocks.refreshBrowserInstances.mockResolvedValue(undefined)
  })

  it('renameBrowserDevice skips empty names and posts renamed devices', async () => {
    expect(await renameBrowserDevice('device-1', '  ')).toBe(false)
    expect(mocks.requestBrowserExtensionSnapshot).not.toHaveBeenCalled()

    expect(await renameBrowserDevice('device-1', ' New Name ')).toBe(true)
    expect(mocks.requestBrowserExtensionSnapshot).toHaveBeenCalledWith('POST', '/devices/device-1', {
      name: 'New Name',
    })
    expect(mocks.refreshBrowserInstances).toHaveBeenCalledWith(true)
    expect(mocks.success).toHaveBeenCalled()
  })

  it('openPairingWindow reports success and failure', async () => {
    await openPairingWindow()
    expect(mocks.requestBrowserExtensionSnapshot).toHaveBeenCalledWith('POST', '/pairing-window', { ttlSeconds: 120 })
    expect(mocks.success).toHaveBeenCalled()

    mocks.requestBrowserExtensionSnapshot.mockRejectedValueOnce(new Error('offline'))
    await openPairingWindow()
    expect(mocks.failed).toHaveBeenCalledWith(expect.stringContaining('pairingWindowFailed'))
    expect(mocks.failed).toHaveBeenCalledWith(expect.stringContaining('offline'))
  })
})

describe('BrowserInstancesPanel interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requestBrowserExtensionSnapshot.mockResolvedValue({ pending: [], devices: [] })
    mocks.refreshBrowserInstances.mockResolvedValue(undefined)
    mocks.modalConfirm.mockImplementation((props: { onOk?: () => Promise<void> | void }) => {
      const modal = { destroy: vi.fn() }
      void props.onOk?.()
      return modal
    })
  })

  it('opens pairing window from empty state', async () => {
    mocks.useBrowserInstances.mockReturnValue({
      instances: [],
      pending: [],
      loading: false,
      error: '',
    })
    render(<BrowserInstancesPanel />)
    fireEvent.click(screen.getByText('aiAgent:BrowserInstances.connect'))
    await waitFor(() => {
      expect(mocks.requestBrowserExtensionSnapshot).toHaveBeenCalledWith('POST', '/pairing-window', { ttlSeconds: 120 })
    })
  })

  it('toggles pending / online / offline sections', () => {
    mocks.useBrowserInstances.mockReturnValue({
      instances: [
        baseInstance({ id: 'online-1', online: true, name: 'Online Browser' }),
        baseInstance({ id: 'offline-1', online: false, name: 'Offline Browser' }),
      ],
      pending: [pairingRequest({ id: 'pending-1', code: '654321' })],
      loading: false,
      error: '',
    })
    render(<BrowserInstancesPanel />)

    expect(screen.getByText('Online Browser')).toBeInTheDocument()
    expect(screen.getByText(/确认码|verificationCode/)).toBeInTheDocument()
    expect(screen.queryByText('Offline Browser')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /aiAgent:BrowserInstances.others/ }))
    expect(screen.getByText('Offline Browser')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /aiAgent:BrowserInstances.current/ }))
    expect(screen.queryByText('Online Browser')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /aiAgent:BrowserInstances.pendingApproval/ }))
    expect(screen.queryByText(/确认码|verificationCode/)).not.toBeInTheDocument()
  })

  it('supports offline rename cancel and save failure rollback', async () => {
    mocks.useBrowserInstances.mockReturnValue({
      instances: [baseInstance({ id: 'offline-1', online: false, name: 'Offline Browser' })],
      pending: [],
      loading: false,
      error: '',
    })
    mocks.requestBrowserExtensionSnapshot.mockRejectedValueOnce(new Error('rename boom'))
    render(<BrowserInstancesPanel />)

    fireEvent.click(screen.getByRole('button', { name: /aiAgent:BrowserInstances.others/ }))
    const row = screen.getByText('Offline Browser').closest('div')?.parentElement
    expect(row).toBeTruthy()

    fireEvent.click(screen.getByLabelText('aiAgent:BrowserInstances.rename'))
    const input = screen.getByDisplayValue('Offline Browser')
    fireEvent.change(input, { target: { value: 'Temp Name' } })
    fireEvent.click(within(row as HTMLElement).getAllByRole('button')[0])
    expect(screen.getByText('Offline Browser')).toBeInTheDocument()
    expect(mocks.requestBrowserExtensionSnapshot).not.toHaveBeenCalled()

    fireEvent.click(screen.getByLabelText('aiAgent:BrowserInstances.rename'))
    fireEvent.change(screen.getByDisplayValue('Offline Browser'), { target: { value: 'New Offline' } })
    const editActions = screen.getByDisplayValue('New Offline').parentElement!.querySelectorAll('button')
    fireEvent.click(editActions[1])
    await waitFor(() => {
      expect(mocks.requestBrowserExtensionSnapshot).toHaveBeenCalledWith('POST', '/devices/offline-1', {
        name: 'New Offline',
      })
      expect(mocks.failed).toHaveBeenCalledWith(expect.stringContaining('renameFailed'))
      expect(mocks.failed).toHaveBeenCalledWith(expect.stringContaining('rename boom'))
    })
  })

  it('confirms offline device removal', async () => {
    mocks.useBrowserInstances.mockReturnValue({
      instances: [baseInstance({ id: 'offline-1', online: false, name: 'Offline Browser' })],
      pending: [],
      loading: false,
      error: '',
    })
    render(<BrowserInstancesPanel />)
    fireEvent.click(screen.getByRole('button', { name: /aiAgent:BrowserInstances.others/ }))
    fireEvent.click(screen.getByLabelText('aiAgent:BrowserInstances.remove'))

    expect(mocks.modalConfirm).toHaveBeenCalled()
    await waitFor(() => {
      expect(mocks.requestBrowserExtensionSnapshot).toHaveBeenCalledWith('DELETE', '/devices/offline-1')
      expect(mocks.refreshBrowserInstances).toHaveBeenCalledWith(true)
      expect(mocks.success).toHaveBeenCalled()
    })
  })
})
