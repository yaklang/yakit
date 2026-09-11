import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ReverseSettings } from '../ReverseSettings'

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))

vi.mock('@/utils/kv', () => ({
  getRemoteValue: vi.fn().mockResolvedValue(''),
  setRemoteValue: vi.fn(),
}))

vi.mock('@/utils/notification', () => ({
  failed: vi.fn(),
  info: vi.fn(),
}))

vi.mock('@/utils/envfile', () => ({
  isCommunityEdition: () => true,
}))

vi.mock('@/services/electronBridge', () => ({
  yakitReverse: {
    getStatus: vi.fn().mockResolvedValue(false),
    cancel: vi.fn().mockResolvedValue(undefined),
    config: vi.fn().mockResolvedValue(undefined),
    availableLocalAddr: vi.fn().mockResolvedValue({ Interfaces: [] }),
    onError: () => () => undefined,
  },
}))

describe('ReverseSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('渲染本地反连 / 公网反连 / DNSLog 三个定位区块', async () => {
    render(<ReverseSettings />)
    await waitFor(() => {
      expect(document.querySelector('[data-settings-section="local-reverse-ip"]')).toBeTruthy()
      expect(document.querySelector('[data-settings-section="public-reverse"]')).toBeTruthy()
      expect(document.querySelector('[data-settings-section="dnslog"]')).toBeTruthy()
    })
    expect(screen.getByText('SettingsPage.item.reverse')).toBeInTheDocument()
  })
})
