import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TimelineDumpButton } from '../TimelineDumpButton'
const mocks = vi.hoisted(() => ({
  dump: { dump: '', ready: true, loading: false, error: '', refreshDump: vi.fn() },
  copy: vi.fn(),
}))
vi.mock('@/pages/ai-re-act/hooks/useTimelineDump', () => ({ useTimelineDump: () => mocks.dump }))
vi.mock('@/utils/clipboard', () => ({ setClipboardText: (...args: any[]) => mocks.copy(...args) }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ loading, children, type, ...props }: any) => <button {...props}>{children}</button>,
}))
vi.mock('@/components/yakitUI/YakitPopover/YakitPopover', () => ({
  YakitPopover: ({ children, content, onVisibleChange }: any) => (
    <>
      <div onClick={() => onVisibleChange(true)}>{children}</div>
      {content}
    </>
  ),
}))
beforeEach(() => {
  vi.clearAllMocks()
  mocks.dump = { dump: '', ready: true, loading: false, error: '', refreshDump: vi.fn() }
})
afterEach(cleanup)
describe('timeline dump actions', () => {
  it('does not mount or request dump content until opened, and disables empty copying', () => {
    render(<TimelineDumpButton />)
    expect(screen.queryByText('BatchDump.refresh')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('BatchDump.title'))
    expect(screen.getByText('BatchDump.copy')).toBeDisabled()
    fireEvent.click(screen.getByText('BatchDump.refresh'))
    expect(mocks.dump.refreshDump).toHaveBeenCalledTimes(1)
  })
  it('copies actual cached content and exposes a clipboard failure', () => {
    mocks.dump.dump = 'real engine timeline'
    mocks.copy.mockImplementation((_text, options) => options.failedCallback())
    render(<TimelineDumpButton />)
    fireEvent.click(screen.getByText('BatchDump.title'))
    fireEvent.click(screen.getByText('BatchDump.copy'))
    expect(mocks.copy).toHaveBeenCalledWith('real engine timeline', expect.any(Object))
    expect(screen.getByText('BatchDump.copyFailed')).toHaveAttribute('role', 'alert')
  })
  it('retains cached content when refresh fails and disallows disconnected refresh', () => {
    mocks.dump.dump = 'cached'
    mocks.dump.error = 'timeout'
    mocks.dump.ready = false
    render(<TimelineDumpButton />)
    fireEvent.click(screen.getByText('BatchDump.title'))
    expect(screen.getByText('cached')).toBeInTheDocument()
    expect(screen.getByText('BatchDump.refresh')).toBeDisabled()
    expect(screen.getByText('BatchDump.failed')).toHaveAttribute('role', 'alert')
  })
})
