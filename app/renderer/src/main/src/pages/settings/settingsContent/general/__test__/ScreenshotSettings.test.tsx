import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ScreenshotSettings } from '../ScreenshotSettings'

const defaults = {
  directory: '/yakit-projects/screenshots',
  defaultDirectory: '/yakit-projects/screenshots',
  watermarkEnabled: true,
  watermarkPosition: 'bottom-left',
}
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  select: vi.fn(),
  reset: vi.fn(),
  open: vi.fn(),
  update: vi.fn(),
  failed: vi.fn(),
}))
vi.mock('@/services/electronBridge', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  yakitScreenshot: {
    getSettings: mocks.get,
    updateWatermark: mocks.update,
    selectDirectory: mocks.select,
    resetDirectory: mocks.reset,
    openDirectory: mocks.open,
  },
}))
vi.mock('@/utils/notification', () => ({ failed: mocks.failed }))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'zh' } }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.get.mockResolvedValue(defaults)
  mocks.reset.mockResolvedValue(defaults)
  let settings = { ...defaults }
  mocks.update.mockImplementation(async (options) => {
    settings = { ...settings, ...options }
    return settings
  })
})
afterEach(cleanup)

describe('ScreenshotSettings', () => {
  it('hides the position when disabled and restores the chosen position when re-enabled', async () => {
    render(<ScreenshotSettings />)
    await screen.findByTitle(defaults.directory)
    const toggle = screen.getByRole('switch', { name: 'SettingsPage.screenshot.watermarkEnabled' })
    const positionName = 'SettingsPage.screenshot.watermarkPosition'
    expect(toggle).toBeChecked()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: positionName }))
    fireEvent.click(await screen.findByText('SettingsPage.screenshot.positions.top-right'))
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith({ watermarkPosition: 'top-right' }))
    await waitFor(() => expect(toggle).toBeEnabled())
    fireEvent.click(toggle)
    await waitFor(() => expect(toggle).not.toBeChecked())
    expect(screen.queryByRole('combobox', { name: positionName })).not.toBeInTheDocument()
    expect(screen.queryByText(positionName)).not.toBeInTheDocument()
    fireEvent.click(toggle)
    await waitFor(() => expect(toggle).toBeChecked())
    expect(screen.getByRole('combobox', { name: positionName })).toBeInTheDocument()
    expect(screen.getByText('SettingsPage.screenshot.positions.top-right')).toBeInTheDocument()
  })

  it('starts with the position hidden for a saved disabled setting and retains the UI state on save failure', async () => {
    mocks.get.mockResolvedValue({ ...defaults, watermarkEnabled: false })
    mocks.update.mockRejectedValueOnce(new Error('read only'))
    render(<ScreenshotSettings />)
    await screen.findByTitle(defaults.directory)
    const toggle = screen.getByRole('switch', { name: 'SettingsPage.screenshot.watermarkEnabled' })
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    fireEvent.click(toggle)
    await waitFor(() => expect(mocks.failed).toHaveBeenCalled())
    expect(toggle).not.toBeChecked()
    expect(toggle).toBeEnabled()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('shows the default, applies folder selection, and restores the default without moving existing files', async () => {
    mocks.select.mockResolvedValue({ ...defaults, directory: '/custom/screenshots' })
    render(<ScreenshotSettings />)
    await screen.findByTitle(defaults.directory)
    const reset = screen.getByRole('button', { name: 'SettingsPage.screenshot.resetDirectory' })
    expect(reset).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'SettingsPage.screenshot.selectDirectory' }))
    await screen.findByTitle('/custom/screenshots')
    expect(reset).toBeEnabled()
    fireEvent.click(reset)
    await screen.findByTitle(defaults.directory)
    expect(mocks.reset).toHaveBeenCalledTimes(1)
  })

  it('keeps the previous path on canceled selection or a failed update', async () => {
    mocks.select.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('config is read only'))
    render(<ScreenshotSettings />)
    await screen.findByTitle(defaults.directory)
    const choose = screen.getByRole('button', { name: 'SettingsPage.screenshot.selectDirectory' })
    fireEvent.click(choose)
    await waitFor(() => expect(choose).toBeEnabled())
    expect(screen.getByTitle(defaults.directory)).toBeInTheDocument()
    fireEvent.click(choose)
    await waitFor(() => expect(mocks.failed).toHaveBeenCalled())
    expect(screen.getByTitle(defaults.directory)).toBeInTheDocument()
    expect(choose).toBeEnabled()
  })
})
