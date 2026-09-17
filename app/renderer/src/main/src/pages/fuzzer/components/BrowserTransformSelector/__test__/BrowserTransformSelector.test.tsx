import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BrowserBridgeConnection, PairedBrowserDevice } from '@/pages/browserExtension/browserExtensionClient'
import type { BrowserTransformSelection } from '../BrowserTransformSelector'

const mocks = vi.hoisted(() => ({
  getBrowserExtensionSnapshot: vi.fn(),
  callBrowserExtensionCapability: vi.fn(),
}))

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
  YakitPopover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@ant-design/icons', () => ({
  CheckCircleOutlined: () => null,
  ChromeOutlined: () => null,
  DisconnectOutlined: () => null,
  ReloadOutlined: () => null,
  RightOutlined: () => null,
}))

import { BrowserTransformSelector } from '../BrowserTransformSelector'

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
    expect(screen.queryByText('浏览器明文')).not.toBeInTheDocument()
  })

  it('always renders the selected tag when value is set, even with no online devices', async () => {
    mocks.getBrowserExtensionSnapshot.mockResolvedValue(emptySnapshot)

    render(<BrowserTransformSelector value={selection} onChange={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByTestId('gateway-active-tag')).toBeInTheDocument()
    })
    expect(screen.getByText('明文配置 A')).toBeInTheDocument()
    expect(screen.queryByText('浏览器明文')).not.toBeInTheDocument()
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
      expect(screen.getByText('浏览器明文')).toBeInTheDocument()
    })

    resolveSnapshot(emptySnapshot)

    await waitFor(() => {
      expect(screen.queryByText('浏览器明文')).not.toBeInTheDocument()
    })
  })
})
