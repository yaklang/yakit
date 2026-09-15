import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LocalTransportSettings } from '../LocalTransportSettings'
import { yakitCache } from '@/utils/electronBridge'

vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('@/utils/envfile', () => ({ FetchSoftwareVersion: () => 'yakit' }))
vi.mock('@/utils/electronBridge', () => ({ yakitCache: { getLocalCache: vi.fn(), setLocalCache: vi.fn() } }))
vi.mock('@/components/yakitUI/YakitPopover/YakitPopover', () => ({
  YakitPopover: ({ children, content }: { children: ReactNode; content: ReactNode }) => (
    <>
      {children}
      {content}
    </>
  ),
}))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children, onClick }: { children: ReactNode; onClick: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}))

describe('local startup policy settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(yakitCache.getLocalCache).mockResolvedValue('auto')
    vi.mocked(yakitCache.setLocalCache).mockResolvedValue(undefined)
  })
  it('loads the edition-scoped policy and ignores unknown stored values', async () => {
    vi.mocked(yakitCache.getLocalCache).mockResolvedValue('unknown')
    render(<LocalTransportSettings />)
    await waitFor(() => expect(yakitCache.getLocalCache).toHaveBeenCalledWith('LocalEngine.TransportPolicy.yakit'))
    expect(screen.getAllByRole('radio')[0].getAttribute('aria-checked')).toBe('true')
  })
  it('persists an explicit choice without launching or interrupting an engine', async () => {
    render(<LocalTransportSettings />)
    fireEvent.click(screen.getAllByRole('radio')[2])
    await waitFor(() => expect(screen.getAllByRole('radio')[2].getAttribute('aria-checked')).toBe('true'))
    expect(yakitCache.setLocalCache).toHaveBeenCalledWith('LocalEngine.TransportPolicy.yakit', 'tcp')
  })
  it('retains the selected policy and reports failed persistence', async () => {
    vi.mocked(yakitCache.setLocalCache).mockRejectedValue(new Error('unwritable'))
    render(<LocalTransportSettings />)
    fireEvent.click(screen.getAllByRole('radio')[1])
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('EngineManagement.operationFailed'))
    expect(screen.getAllByRole('radio')[0].getAttribute('aria-checked')).toBe('true')
    expect((screen.getAllByRole('radio')[1] as HTMLButtonElement).disabled).toBe(false)
  })
})
