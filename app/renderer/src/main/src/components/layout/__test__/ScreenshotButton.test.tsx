import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ScreenshotButton } from '../ScreenshotButton'

const mocks = vi.hoisted(() => ({ capture: vi.fn(), notify: vi.fn(), failed: vi.fn() }))
vi.mock('@/services/electronBridge', () => ({
  yakitScreenshot: { captureAndSave: mocks.capture, openDirectory: vi.fn() },
}))
vi.mock('@/utils/notification', () => ({ yakitNotify: mocks.notify, failed: mocks.failed }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => callback(0))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('ScreenshotButton', () => {
  it('captures once during repeated clicks and shows the saved path only after success', async () => {
    let resolve!: (result: { path: string }) => void
    mocks.capture.mockReturnValue(
      new Promise((done) => {
        resolve = done
      }),
    )
    render(<ScreenshotButton />)
    const button = screen.getByRole('button', { name: 'Screenshot.capture' })
    fireEvent.click(button)
    fireEvent.click(button)
    await waitFor(() => expect(mocks.capture).toHaveBeenCalledTimes(1))
    expect(button).toBeDisabled()
    expect(mocks.notify).not.toHaveBeenCalled()
    await act(async () => resolve({ path: '/local/screenshots/test.png' }))
    expect(mocks.notify).toHaveBeenCalledWith(
      'success',
      expect.objectContaining({ description: '/local/screenshots/test.png' }),
    )
    expect(button).toBeEnabled()
  })

  it('reports capture failures and allows retry', async () => {
    mocks.capture.mockRejectedValueOnce(new Error('disk full')).mockResolvedValueOnce({ path: '/saved.png' })
    render(<ScreenshotButton />)
    const button = screen.getByRole('button', { name: 'Screenshot.capture' })
    fireEvent.click(button)
    await waitFor(() => expect(mocks.failed).toHaveBeenCalled())
    expect(mocks.notify).not.toHaveBeenCalled()
    expect(button).toBeEnabled()
    fireEvent.click(button)
    await waitFor(() => expect(mocks.notify).toHaveBeenCalled())
  })
})
