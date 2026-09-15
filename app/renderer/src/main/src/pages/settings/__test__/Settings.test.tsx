import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import emiter from '@/utils/eventBus/eventBus'
import { Settings } from '../Settings'

vi.mock('../settingsSide/SettingsSide', () => ({
  SettingsSide: (props: { activeAnchor: string; onSelect: (anchor: string) => void }) => (
    <button type="button" onClick={() => props.onSelect('appearance')}>
      {`side:${props.activeAnchor}`}
    </button>
  ),
}))

vi.mock('../settingsContent/SettingsContent', () => ({
  SettingsContent: (props: { anchor: string; section?: string; sectionTick?: number }) => (
    <div>{`content:${props.anchor}:${props.section || ''}:${props.sectionTick ?? 0}`}</div>
  ),
}))

describe('Settings', () => {
  it('默认打开 general，侧栏切换会清掉 section', async () => {
    const user = userEvent.setup()
    render(<Settings section="workspace" />)
    expect(screen.getByText('side:general')).toBeInTheDocument()
    expect(screen.getByText(/content:general:workspace:/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'side:general' }))
    expect(screen.getByText('side:appearance')).toBeInTheDocument()
    expect(screen.getByText(/content:appearance::/)).toBeInTheDocument()
  })

  it('跟随 props.anchor / props.section，并响应事件总线', () => {
    const { rerender } = render(<Settings anchor="ai-model" section="theme" />)
    expect(screen.getByText(/content:ai-model:theme:/)).toBeInTheDocument()

    rerender(<Settings anchor="yak-mcp" section="tool-config" />)
    expect(screen.getByText(/content:yak-mcp:tool-config:/)).toBeInTheDocument()

    act(() => {
      emiter.emit('onSettingsAnchor', 'reverse')
      emiter.emit('onSettingsSection', 'dnslog')
    })
    expect(screen.getByText(/content:reverse:dnslog:/)).toBeInTheDocument()
  })
})
