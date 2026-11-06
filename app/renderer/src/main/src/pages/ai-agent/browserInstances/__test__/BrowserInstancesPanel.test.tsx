import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  approve: vi.fn(),
  reject: vi.fn(),
  request: vi.fn(),
  refresh: vi.fn(),
  restore: vi.fn(),
  confirm: vi.fn(),
  state: {
    instances: [
      { id: 'online', name: 'paired', online: true },
      { id: 'offline', name: 'offline', online: false },
    ],
    pending: [
      {
        id: 'pair',
        client: 'Chrome',
        origin: 'chrome-extension://verified',
        code: '1234',
        expiresAt: Date.now() + 999999,
      },
    ],
    history: [{ id: 'history', name: 'old browser' }],
    historyError: '',
    error: '',
    autoApprovalErrors: {},
    loading: false,
  },
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('@/services/electronBridge', () => ({ yakitShell: { openExternal: vi.fn() } }))
vi.mock('antd', async () => ({
  ...(await vi.importActual<any>('antd')),
  Modal: Object.assign(({ visible, children }: any) => (visible ? <div>{children}</div> : null), {
    confirm: mocks.confirm,
  }),
}))
vi.mock('@/pages/browserExtension/browserExtensionClient', () => ({
  approveBrowserExtensionPairing: mocks.approve,
  rejectBrowserExtensionPairing: mocks.reject,
  requestBrowserExtensionSnapshot: mocks.request,
  callBrowserExtensionCapability: vi.fn(),
}))
vi.mock('../browserInstanceStore', () => ({
  useBrowserInstances: () => mocks.state,
  refreshBrowserInstances: mocks.refresh,
  restoreBrowserHistory: mocks.restore,
  selectBrowserInstance: vi.fn(),
  browserInstanceMentionName: (instance: any) => instance.name,
}))
import { BrowserInstancesPanel } from '../BrowserInstancesPanel'
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
describe('browser instance actions', () => {
  it('keeps confirmations inside the requesting editor container', () => {
    const owner = document.createElement('div')
    render(<BrowserInstancesPanel onMention={vi.fn()} modalContainer={() => owner} />)
    fireEvent.click(screen.getByText('BrowserInstances.approve'))
    expect(mocks.confirm.mock.calls.at(-1)![0].getContainer()).toBe(owner)
    fireEvent.click(screen.getByText('BrowserInstances.restore'))
    expect(mocks.confirm.mock.calls.at(-1)![0].getContainer()).toBe(owner)
  })
  it('references the exact selected online device and disables offline references', () => {
    const onMention = vi.fn()
    render(<BrowserInstancesPanel onMention={onMention} />)
    const buttons = screen.getAllByText('BrowserInstances.reference')
    fireEvent.click(buttons[0])
    expect(onMention).toHaveBeenCalledWith({ mentionType: 'browser', mentionId: 'online', mentionName: 'paired' })
    expect((buttons[1].closest('button') as HTMLButtonElement).disabled).toBe(true)
  })
  it('requires confirmation before approving and restoring', async () => {
    render(<BrowserInstancesPanel onMention={vi.fn()} />)
    fireEvent.click(screen.getByText('BrowserInstances.approve'))
    expect(mocks.approve).not.toHaveBeenCalled()
    await mocks.confirm.mock.calls.at(-1)![0].onOk()
    expect(mocks.approve).toHaveBeenCalledWith(mocks.state.pending[0])
    fireEvent.click(screen.getByText('BrowserInstances.restore'))
    expect(mocks.restore).not.toHaveBeenCalled()
    await mocks.confirm.mock.calls.at(-1)![0].onOk()
    expect(mocks.restore).toHaveBeenCalledWith('history')
  })
  it('shows native failures and permits another attempt', async () => {
    mocks.restore.mockRejectedValueOnce(new Error('YTray unavailable'))
    render(<BrowserInstancesPanel onMention={vi.fn()} />)
    fireEvent.click(screen.getByText('BrowserInstances.restore'))
    await mocks.confirm.mock.calls.at(-1)![0].onOk()
    await screen.findByRole('alert')
    expect(screen.getByRole('alert').textContent).toContain('YTray unavailable')
    await waitFor(() =>
      expect((screen.getByText('BrowserInstances.restore').closest('button') as HTMLButtonElement).disabled).toBe(
        false,
      ),
    )
  })
})
