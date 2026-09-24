import type React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BrowserPairingRequest } from '@/pages/browserExtension/browserExtensionClient'
import type { AIBrowserInstance } from '../browserInstanceStore'
import type * as BrowserInstanceStoreModule from '../browserInstanceStore'

const { mocks, t } = vi.hoisted(() => {
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
    t,
    mocks: {
      requestBrowserExtensionSnapshot: vi.fn(),
      approveBrowserExtensionPairing: vi.fn(),
      refreshBrowserInstances: vi.fn(),
      restoreBrowserHistory: vi.fn(),
      useBrowserInstances: vi.fn(),
      success: vi.fn(),
      failed: vi.fn(),
      modalConfirm: vi.fn(),
    },
  }
})

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t,
    i18n: { language: 'zh' },
    i18nRefresh: 0,
  }),
}))
vi.mock('../../aiChatWelcome/AIChatWelcomeSideSetting', () => ({
  SideSettingButton: () => null,
}))
vi.mock('@/components/yakitUI/YakitTag/YakitTag', () => ({
  YakitTag: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))
vi.mock('@/components/yakitUI/YakitSpin/YakitSpin', () => ({
  YakitSpin: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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
  approveBrowserExtensionPairing: mocks.approveBrowserExtensionPairing,
  rejectBrowserExtensionPairing: vi.fn(),
  callBrowserExtensionCapability: vi.fn(),
}))
vi.mock('@/services/electronBridge', () => ({
  yakitManagedBrowser: {
    list: vi.fn(async () => []),
    listYTrayHistory: vi.fn(async () => []),
    claimYTrayApproval: vi.fn(),
    restoreYTray: vi.fn(),
  },
}))
vi.mock('../browserInstanceStore', async () => {
  const actual = await vi.importActual<typeof BrowserInstanceStoreModule>('../browserInstanceStore')
  return {
    ...actual,
    useBrowserInstances: mocks.useBrowserInstances,
    refreshBrowserInstances: mocks.refreshBrowserInstances,
    restoreBrowserHistory: mocks.restoreBrowserHistory,
    readBrowserThumbnail: vi.fn(async () => undefined),
    selectBrowserInstance: vi.fn(),
  }
})
vi.mock('@/utils/openWebsite', () => ({
  openExternalWebsite: vi.fn(),
}))
vi.mock('../BrowserInstancesGuideEmpty/BrowserInstancesGuideEmpty', () => ({
  BrowserInstancesGuideEmpty: ({ onOpenManual }: { onOpenManual?: () => void }) => (
    <button type="button" onClick={onOpenManual}>
      浏览器引导空态
    </button>
  ),
  BrowserInstancesGuideManual: ({ open }: { open?: boolean; onClose?: () => void }) =>
    open ? <div role="dialog">新手引导手册</div> : null,
}))
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
  openPairingWindow,
  pairingSubtitle,
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

const historyInstance = (partial: Partial<YTrayBrowserHistoryInstance> = {}): YTrayBrowserHistoryInstance => ({
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Browser A',
  runtime: 'Chrome for Testing',
  status: 'stopped',
  startUrl: 'https://start.example/',
  pageTitle: 'Previous Page',
  pageUrl: 'https://previous.example/',
  badge: 'A',
  startedAt: 1_700_000_000_000,
  ...partial,
})

describe('BrowserInstancesPanel helpers', () => {
  it('browserProductLabel prefers readable product text and drops extension/protocol clients', () => {
    expect(browserProductLabel({ client: 'extension', clientVersion: '0.2.4' })).toBe('0.2.4')
    expect(browserProductLabel({ client: 'Chrome', clientVersion: '131.0.0' })).toBe('Chrome 131.0.0')
    expect(browserProductLabel({ client: 'Chrome for Testing', clientVersion: 'Chrome for Testing 152' })).toBe(
      'Chrome for Testing 152',
    )
    expect(browserProductLabel({ client: '', clientVersion: '1.0.0' })).toBe('1.0.0')
  })

  it('pairingSubtitle uses browser version and appends managed manager', () => {
    expect(pairingSubtitle(pairingRequest({ origin: 'chrome-extension://a' }))).toBe('Chrome 131.0.0')
    expect(
      pairingSubtitle(
        pairingRequest({
          origin: 'chrome-extension://a',
          managedInstance: { manager: 'ytray', instanceId: 'ytray-a', badge: 'A' },
        }),
      ),
    ).toBe('Chrome 131.0.0 · YTray')
    expect(
      pairingSubtitle(
        pairingRequest({
          origin: 'chrome-extension://a',
          managedInstance: { manager: 'yakit', instanceId: 'yakit-a', badge: 'A' },
        }),
      ),
    ).toBe('Chrome 131.0.0 · Yakit')
  })
})

describe('openPairingWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requestBrowserExtensionSnapshot.mockResolvedValue({ pending: [], devices: [] })
    mocks.approveBrowserExtensionPairing.mockResolvedValue({ pending: [], devices: [] })
    mocks.refreshBrowserInstances.mockResolvedValue(undefined)
  })

  it('openPairingWindow reports success and failure', async () => {
    await openPairingWindow(t)
    expect(mocks.requestBrowserExtensionSnapshot).toHaveBeenCalledWith('POST', '/pairing-window', { ttlSeconds: 120 })
    expect(mocks.success).toHaveBeenCalled()

    mocks.requestBrowserExtensionSnapshot.mockRejectedValueOnce(new Error('offline'))
    await openPairingWindow(t)
    expect(mocks.failed).toHaveBeenCalledWith(expect.stringContaining('pairingWindowFailed'))
    expect(mocks.failed).toHaveBeenCalledWith(expect.stringContaining('offline'))
  })
})

describe('BrowserInstancesPanel interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requestBrowserExtensionSnapshot.mockResolvedValue({ pending: [], devices: [] })
    mocks.refreshBrowserInstances.mockResolvedValue(undefined)
    mocks.restoreBrowserHistory.mockResolvedValue(undefined)
    mocks.modalConfirm.mockImplementation((props: { onOk?: () => Promise<void> | void }) => {
      const modal = { destroy: vi.fn() }
      void props.onOk?.()
      return modal
    })
  })

  it('shows the Browser Bridge error and retries', async () => {
    mocks.useBrowserInstances.mockReturnValue({
      instances: [],
      history: [],
      pending: [],
      loading: false,
      error: 'unavailable',
      historyError: '',
      autoApprovalErrors: {},
    })
    render(<BrowserInstancesPanel />)
    expect(screen.getByText('BrowserInstances.bridgeUnavailable')).toBeInTheDocument()
    expect(screen.getByText('unavailable')).toBeInTheDocument()
    fireEvent.click(screen.getByText('BrowserInstances.retry'))
    expect(mocks.refreshBrowserInstances).toHaveBeenCalled()
  })

  it('opens the guide from connection help', () => {
    mocks.useBrowserInstances.mockReturnValue({
      instances: [],
      history: [],
      pending: [],
      loading: false,
      error: '',
      historyError: '',
      autoApprovalErrors: {},
    })
    render(<BrowserInstancesPanel />)

    fireEvent.click(screen.getByText('BrowserInstances.connectionHelp'))
    expect(screen.getByRole('dialog')).toHaveTextContent('新手引导手册')
    expect(mocks.requestBrowserExtensionSnapshot).not.toHaveBeenCalled()
  })

  it('toggles pending, online and restorable history sections', () => {
    mocks.useBrowserInstances.mockReturnValue({
      instances: [
        baseInstance({
          id: 'online-1',
          online: true,
          identity: 'A',
          name: 'Online Browser',
          tab: { id: 1, title: 'Current Page', url: 'https://example.test/' },
        }),
        baseInstance({ id: 'offline-pairing', online: false, name: 'Old pairing record' }),
      ],
      history: [historyInstance()],
      pending: [pairingRequest({ id: 'pending-1', code: '654321' })],
      loading: false,
      error: '',
      historyError: '',
      autoApprovalErrors: { 'pending-1': { kind: 'ytray-unavailable' } },
    })
    render(<BrowserInstancesPanel />)

    expect(screen.getByTitle('Current Page')).toBeInTheDocument()
    expect(screen.getByTitle('Current Page').closest('[data-identity="A"]')).toBeInTheDocument()
    expect(screen.getByText(/确认码|verificationCode/)).toBeInTheDocument()
    expect(screen.getByText('BrowserInstances.autoApprovalUnavailable')).toBeInTheDocument()
    expect(screen.queryByText('Previous Page')).not.toBeInTheDocument()
    expect(screen.queryByText('Old pairing record')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /BrowserInstances.others/ }))
    expect(screen.getByText('Previous Page')).toBeInTheDocument()
    expect(screen.queryByText('Old pairing record')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /BrowserInstances.current/ }))
    expect(screen.queryByTitle('Current Page')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /BrowserInstances.pendingApproval/ }))
    expect(screen.queryByText(/确认码|verificationCode/)).not.toBeInTheDocument()
  })

  it('restores the selected YTray history instance', async () => {
    mocks.useBrowserInstances.mockReturnValue({
      instances: [],
      history: [historyInstance({ name: 'Saved Browser' })],
      pending: [],
      loading: false,
      error: '',
      historyError: '',
      autoApprovalErrors: {},
    })
    render(<BrowserInstancesPanel />)

    fireEvent.click(screen.getByRole('button', { name: /BrowserInstances.others/ }))
    expect(screen.getByText('BrowserInstances.statusStopped')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('BrowserInstances.restore'))
    await waitFor(() => {
      expect(mocks.restoreBrowserHistory).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000001')
      expect(mocks.success).toHaveBeenCalledWith(expect.stringContaining('restoreStarted'))
    })
  })

  it('shows failed status on failed history rows', () => {
    mocks.useBrowserInstances.mockReturnValue({
      instances: [],
      history: [historyInstance({ status: 'failed', pageTitle: 'Broken Browser' })],
      pending: [],
      loading: false,
      error: '',
      historyError: '',
      autoApprovalErrors: {},
    })
    render(<BrowserInstancesPanel />)

    fireEvent.click(screen.getByRole('button', { name: /BrowserInstances.others/ }))
    expect(screen.getByText('Broken Browser')).toBeInTheDocument()
    expect(screen.getByText('BrowserInstances.statusFailed')).toBeInTheDocument()
  })

  it('keeps history visible but disables restore when YTray exits', () => {
    mocks.useBrowserInstances.mockReturnValue({
      instances: [],
      history: [historyInstance()],
      pending: [],
      loading: false,
      error: '',
      historyError: 'YTray unavailable',
      autoApprovalErrors: {},
    })
    render(<BrowserInstancesPanel />)

    expect(screen.getByText('BrowserInstances.ytrayUnavailable')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /BrowserInstances.others/ }))
    expect(screen.getByLabelText('BrowserInstances.restore')).toBeDisabled()
  })
})
