import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BrowserBridgeConnection, PairedBrowserDevice } from '@/pages/browserExtension/browserExtensionClient'
import type { BrowserTransformSelection } from '../BrowserTransformSelector'

const mocks = vi.hoisted(() => ({
  getBrowserExtensionSnapshot: vi.fn(),
  callBrowserExtensionCapability: vi.fn(),
}))

vi.mock('@/i18n/i18n', () => {
  const t = (key: string, options?: Record<string, unknown>) => {
    if (!options) return key
    return Object.entries(options).reduce((text, [name, value]) => text.replace(`{{${name}}}`, String(value)), key)
  }
  return {
    default: {
      t,
      getFixedT: () => t,
      language: 'zh',
      on: vi.fn(),
      off: vi.fn(),
    },
  }
})

vi.mock('@/i18n/useI18nNamespaces', () => {
  const t = (key: string, options?: Record<string, unknown>) => {
    if (!options) return key
    return Object.entries(options).reduce((text, [name, value]) => text.replace(`{{${name}}}`, String(value)), key)
  }
  return {
    useI18nNamespaces: () => ({
      t,
      i18n: { language: 'zh' },
      i18nRefresh: 0,
    }),
  }
})

vi.mock('@/pages/browserExtension/browserExtensionClient', () => ({
  getBrowserExtensionSnapshot: mocks.getBrowserExtensionSnapshot,
  callBrowserExtensionCapability: mocks.callBrowserExtensionCapability,
}))

vi.mock('@/utils/eventBus/eventBus', () => ({
  default: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
}))

vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({
    children,
    onClick,
  }: React.PropsWithChildren<{
    onClick?: () => void
    icon?: React.ReactNode
    type?: string
  }>) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/yakitUI/YakitTag/YakitTag', () => ({
  YakitTag: ({
    children,
    onClose,
  }: React.PropsWithChildren<{
    onClose?: (event: React.MouseEvent) => void
    color?: string
    closable?: boolean
    className?: string
  }>) => (
    <span data-testid="gateway-active-tag">
      {children}
      <button type="button" aria-label="close-tag" onClick={(event) => onClose?.(event)} />
    </span>
  ),
}))

vi.mock('@/components/yakitUI/YakitPopover/YakitPopover', () => ({
  YakitPopover: ({ children, content }: { children: React.ReactNode; content?: React.ReactNode }) => (
    <>
      {children}
      <div data-testid="gateway-popover-content">{content}</div>
    </>
  ),
}))

vi.mock('@ant-design/icons', () => ({
  CheckCircleOutlined: () => null,
  ChromeOutlined: () => null,
  DisconnectOutlined: () => null,
  ReloadOutlined: () => null,
  RightOutlined: () => null,
}))

import { BrowserTransformSelector } from '../BrowserTransformSelector'

const device: PairedBrowserDevice = {
  id: 'device-1',
  installationId: 'install-1',
  name: 'Chrome Browser',
  client: 'Chrome',
  clientVersion: '131.0.0',
  origin: 'chrome-extension://ext-1',
  createdAt: 1,
  lastSeenAt: 1,
}

const connection: BrowserBridgeConnection = {
  deviceId: 'device-1',
  installationId: 'install-1',
  client: 'Chrome',
  clientVersion: '131.0.0',
  capabilities: ['browser.transform.profile.list'],
  sessionId: 'session-1',
  connectionId: 'conn-1',
  connectedAt: 1,
}

const emptySnapshot = {
  devices: [] as PairedBrowserDevice[],
  status: {
    revision: 1,
    running: true,
    connected: false,
    protocolVersion: 1,
    engineIdentityId: 'engine',
    engineInstanceId: 'instance',
    connections: [] as BrowserBridgeConnection[],
  },
}

const onlineSnapshot = {
  devices: [device],
  status: {
    ...emptySnapshot.status,
    connected: true,
    connections: [connection],
  },
}

const enabledProfile = {
  id: 'profile-1',
  name: '明文配置 A',
  enabled: true,
  origin: 'https://example.com',
  match: { methods: ['POST'], urlPattern: '*/api/*' },
  request: { enabled: true, nodes: [] },
  response: { enabled: false, nodes: [] },
  maxConcurrency: 2,
}

const disabledProfile = {
  ...enabledProfile,
  id: 'profile-disabled',
  name: '已禁用配置',
  enabled: false,
}

const selection: BrowserTransformSelection = {
  deviceId: 'device-1',
  profileId: 'profile-1',
  profileName: '明文配置 A',
  browserName: 'Chrome',
  origin: 'https://example.com',
}

describe('BrowserTransformSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when there are no online devices and no selection', async () => {
    mocks.getBrowserExtensionSnapshot.mockResolvedValue(emptySnapshot)

    const { container } = render(<BrowserTransformSelector onChange={vi.fn()} />)

    await waitFor(() => {
      expect(mocks.getBrowserExtensionSnapshot).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(container).toBeEmptyDOMElement()
    })
    expect(screen.queryByText('BrowserTransformSelector.entry')).not.toBeInTheDocument()
  })

  it('always renders the selected tag when value is set, even with no online devices', async () => {
    mocks.getBrowserExtensionSnapshot.mockResolvedValue(emptySnapshot)

    render(<BrowserTransformSelector value={selection} onChange={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByTestId('gateway-active-tag')).toBeInTheDocument()
    })
    expect(screen.getByText('明文配置 A')).toBeInTheDocument()
    expect(screen.queryByText('BrowserTransformSelector.entry')).not.toBeInTheDocument()
  })

  it('renders the entry button while loading snapshot', async () => {
    let resolveSnapshot: (value: typeof emptySnapshot) => void = () => undefined
    mocks.getBrowserExtensionSnapshot.mockReturnValue(
      new Promise((resolve) => {
        resolveSnapshot = resolve
      }),
    )

    render(<BrowserTransformSelector onChange={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('BrowserTransformSelector.entry')).toBeInTheDocument()
    })

    resolveSnapshot(emptySnapshot)

    await waitFor(() => {
      expect(screen.queryByText('BrowserTransformSelector.entry')).not.toBeInTheDocument()
    })
  })

  it('loads online profiles and calls onChange with device/profile ids on click', async () => {
    mocks.getBrowserExtensionSnapshot.mockResolvedValue(onlineSnapshot)
    mocks.callBrowserExtensionCapability.mockResolvedValue([enabledProfile, disabledProfile])
    const onChange = vi.fn()

    render(<BrowserTransformSelector onChange={onChange} />)

    await waitFor(() => {
      expect(mocks.callBrowserExtensionCapability).toHaveBeenCalledWith(
        'device-1',
        'browser.transform.profile.list',
        {},
        15_000,
      )
    })
    await waitFor(() => {
      expect(screen.getByText('明文配置 A')).toBeInTheDocument()
    })
    expect(screen.queryByText('已禁用配置')).not.toBeInTheDocument()
    expect(screen.getByText('BrowserTransformSelector.entry')).toBeInTheDocument()

    fireEvent.click(screen.getByText('明文配置 A'))

    expect(onChange).toHaveBeenCalledWith({
      deviceId: 'device-1',
      profileId: 'profile-1',
      profileName: '明文配置 A',
      browserName: 'Chrome Browser',
      origin: 'https://example.com',
      maxConcurrency: 2,
    })
  })
})
