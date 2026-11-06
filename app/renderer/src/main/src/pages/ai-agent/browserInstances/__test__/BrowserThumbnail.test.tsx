import React from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({ read: vi.fn() }))
vi.mock('../browserInstanceStore', () => ({ readBrowserThumbnail: m.read }))
vi.mock('antd', () => ({ Popover: ({ children }: any) => children }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (k: string) => k }) }))
import { BrowserThumbnail, validThumbnail } from '../BrowserThumbnail'
const instance: any = {
  id: 'device',
  name: 'browser',
  online: true,
  tab: { id: 1, active: true, url: 'https://a' },
  connection: { capabilities: ['browser.thumbnail'] },
}
const picture: any = { title: 'page', dataUrl: 'data:image/png;base64,YQ==', tabId: 1 }
beforeEach(() => {
  vi.clearAllMocks()
  m.read.mockResolvedValue(picture)
})
afterEach(cleanup)
it('shows a valid thumbnail and allows refresh', async () => {
  render(<BrowserThumbnail instance={instance} />)
  await screen.findByAltText('page')
  fireEvent.click(screen.getByText('Parity.refreshThumbnail'))
  expect(m.read).toHaveBeenCalledTimes(2)
})
it('clears previous device images and ignores late replies', async () => {
  let old!: (value: any) => void
  m.read.mockReturnValueOnce(
    new Promise((r) => {
      old = r
    }),
  )
  const h = render(<BrowserThumbnail instance={instance} />)
  h.rerender(<BrowserThumbnail instance={{ ...instance, id: 'other', online: false }} />)
  await act(async () => old(picture))
  expect(screen.queryByAltText('page')).toBeNull()
})
it('rejects remote and SVG URLs and surfaces a capture failure', async () => {
  expect(validThumbnail({ ...picture, dataUrl: 'https://remote/image.png' })).toBeUndefined()
  expect(validThumbnail({ ...picture, dataUrl: 'data:image/svg+xml;base64,YQ==' })).toBeUndefined()
  m.read.mockRejectedValue(Error('capture failed'))
  render(<BrowserThumbnail instance={instance} />)
  expect(await screen.findByRole('status')).toHaveTextContent('capture failed')
})
