import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({ external: vi.fn() }))
vi.mock('@/services/electronBridge', () => ({ yakitShell: { openExternal: m.external } }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (k: string) => k }) }))
vi.mock('@/components/yakitUI/YakitModal/YakitModal', () => ({
  YakitModal: ({ visible, children, title, footer }: any) =>
    visible ? (
      <div>
        {title}
        {children}
        {footer}
      </div>
    ) : null,
}))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}))
vi.mock('@/components/yakitUI/YakitRadioButtons/YakitRadioButtons', () => ({
  YakitRadioButtons: ({ options, onChange }: any) => (
    <div>
      {options.map((s: any) => (
        <button key={s.value} onClick={() => onChange({ target: { value: s.value } })}>
          {s.value}
        </button>
      ))}
    </div>
  ),
}))
import {
  BrowserInstancesGuideEmpty,
  BrowserInstancesGuideManual,
} from '../BrowserInstancesGuideEmpty/BrowserInstancesGuideEmpty'
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
it('opens the guide from the empty state', () => {
  const open = vi.fn()
  render(<BrowserInstancesGuideEmpty onOpenManual={open} />)
  fireEvent.click(screen.getByText('BrowserInstances.guideViewManual'))
  expect(open).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringContaining('preview.webp'))
})
it('switches platform illustrations and opens external links through the existing bridge', () => {
  render(<BrowserInstancesGuideManual open onClose={vi.fn()} />)
  fireEvent.click(screen.getByText('windows'))
  expect(screen.getByAltText('BrowserInstances.guideStep2Desc')).toHaveAttribute(
    'src',
    expect.stringContaining('windows.webp'),
  )
  fireEvent.click(screen.getByText('macos'))
  expect(screen.getByAltText('BrowserInstances.guideStep2Desc')).toHaveAttribute(
    'src',
    expect.stringContaining('macos.webp'),
  )
  fireEvent.click(screen.getByText('Chrome for Testing'))
  expect(m.external).toHaveBeenCalledWith('https://googlechromelabs.github.io/chrome-for-testing/')
})
