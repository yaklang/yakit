import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { RemoteMitmGV } from '@/enums/mitm'

const storage = vi.hoisted(() => new Map<string, string>())
vi.mock('@/utils/kv', () => ({
  getRemoteValue: vi.fn(async (key: string) => storage.get(key) || ''),
  setRemoteValue: vi.fn((key: string, value: string) => storage.set(key, value)),
}))
vi.mock('@/utils/tool', () => ({ JSONParseLog: (raw: string) => (raw ? JSON.parse(raw) : []) }))
vi.mock('@/utils/str', () => ({ StringToUint8Array: vi.fn(), Uint8ArrayToString: vi.fn() }))
vi.mock('@/utils/openWebsite', () => ({ saveABSFileToOpen: vi.fn() }))
vi.mock('@/utils/notification', () => ({ yakitFailed: vi.fn() }))
vi.mock('@/utils/eventBus/eventBus', () => ({ default: { emit: vi.fn() } }))
vi.mock('@/pages/fuzzer/HTTPFuzzerHosts', () => ({ inputHTTPFuzzerHostConfigItem: vi.fn() }))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}))
// Keep the real Form and YakitSwitch; isolate unrelated drawers and field wrappers.
vi.mock('@/components/yakitUI/YakitDrawer/YakitDrawer', () => ({
  YakitDrawer: ({ open, title, children }: any) =>
    open ? (
      <section>
        {title}
        {children}
      </section>
    ) : null,
}))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children, onClick }: any) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}))
vi.mock('@/components/yakitUI/YakitInput/YakitInput', async () => ({ YakitInput: (await import('antd')).Input }))
vi.mock('@/components/yakitUI/YakitCheckbox/YakitCheckbox', async () => ({
  YakitCheckbox: (await import('antd')).Checkbox,
}))
vi.mock('@/components/yakitUI/YakitAutoComplete/YakitAutoComplete', async () => ({
  YakitAutoComplete: (await import('antd')).AutoComplete,
}))
vi.mock('@/components/yakitUI/YakitSelect/YakitSelect', async () => ({ YakitSelect: (await import('antd')).Select }))
vi.mock('@/components/yakitUI/YakitTag/YakitTag', async () => ({ YakitTag: (await import('antd')).Tag }))
vi.mock('@/components/yakitUI/YakitInputNumber/YakitInputNumber', async () => ({
  YakitInputNumber: (await import('antd')).InputNumber,
}))
vi.mock('../MITMServerStartForm/MITMAddTLS', () => ({ default: () => null }))
vi.mock('../MITMServerStartForm/MITMFiltersModal', () => ({ default: () => null }))
vi.mock('../MITMServerStartForm/MITMCertificateDownloadModal', () => ({ default: () => null }))

import MITMFormAdvancedConfiguration from '../MITMServerStartForm/MITMFormAdvancedConfiguration'
import { createDefaultAdvancedConfig, loadAdvancedConfig } from '../MITMAdvancedConfig'

const label = 'MITMFormAdvancedConfiguration.useEMudhra'
const props = { visible: true, setVisible: vi.fn(), enableGMTLS: false, supportsEMudhra: true }

describe('MITM V2 eMudhra advanced form', () => {
  beforeEach(() => {
    storage.clear()
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('defaults off, saves the switch, restores it on reopen, and can disable it', async () => {
    const onSave = vi.fn()
    const view = render(<MITMFormAdvancedConfiguration {...props} onSave={onSave} />)
    await waitFor(() => expect(screen.getByRole('switch', { name: label })).not.toBeChecked())
    fireEvent.click(screen.getByRole('switch', { name: label }))
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.save' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ UseEMudhra: true })))
    expect((await loadAdvancedConfig()).UseEMudhra).toBe(true)
    view.unmount()

    render(<MITMFormAdvancedConfiguration {...props} onSave={onSave} />)
    await waitFor(() => expect(screen.getByRole('switch', { name: label })).toBeChecked())
    fireEvent.click(screen.getByRole('switch', { name: label }))
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.save' }))
    await waitFor(() => expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({ UseEMudhra: false })))
    expect((await loadAdvancedConfig()).UseEMudhra).toBe(false)
  }, 20000)

  it('hides the option in V1 without erasing the saved V2 preference', async () => {
    storage.set(RemoteMitmGV.MitmAdvancedConfig, JSON.stringify({ ...createDefaultAdvancedConfig(), UseEMudhra: true }))
    const onSave = vi.fn()
    render(<MITMFormAdvancedConfiguration {...props} supportsEMudhra={false} onSave={onSave} />)
    const toggle = screen.getByLabelText(label)
    expect(toggle).not.toBeVisible()
    expect(screen.queryByRole('switch', { name: label })).toBeNull()
    await waitFor(() => expect(toggle).toBeChecked())
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.save' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ UseEMudhra: true })))
    expect((await loadAdvancedConfig()).UseEMudhra).toBe(true)
  }, 20000)
})
