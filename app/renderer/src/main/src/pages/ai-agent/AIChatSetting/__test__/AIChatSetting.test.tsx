import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '../../../ai-re-act/hooks/__test__/setupElectron'

const fixture = vi.hoisted(() => ({ setting: {} as Record<string, unknown>, setSetting: vi.fn() }))

vi.mock('../../useContext/useStore', () => ({ default: () => ({ setting: fixture.setting }) }))
vi.mock('../../useContext/useDispatcher', () => ({ default: () => ({ setSetting: fixture.setSetting }) }))
vi.mock('@/utils/kv', () => ({ getRemoteValue: vi.fn().mockResolvedValue(''), setRemoteValue: vi.fn() }))
vi.mock('@/utils/notification', () => ({ yakitFailed: vi.fn() }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('@/components/yakitUI/YakitSwitch/yakitSwitchAnimation.scss', () => ({}))

import { AIAgentSettingDefault } from '../../defaultConstant'
import AIChatSetting from '../AIChatSetting'

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn() })),
  )
  fixture.setting = { ...AIAgentSettingDefault, RuntimeContextSizeLimit: 450 }
  fixture.setSetting.mockReset().mockImplementation((update) => {
    fixture.setting = typeof update === 'function' ? update(fixture.setting) : update
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('runtime context setting in the existing AI Senso form', () => {
  it('shows and edits KB values and allows clearing the field for the engine default', async () => {
    render(<AIChatSetting />)
    const input = screen.getByRole('textbox', { name: /AIChatSetting.runtimeContextSize/ })
    await waitFor(() => expect(input).toHaveValue('450'))
    fireEvent.change(input, { target: { value: '600' } })
    expect(fixture.setting.RuntimeContextSizeLimit).toBe('600')
    fireEvent.change(input, { target: { value: '' } })
    expect(input).toHaveValue('')
    expect(fixture.setting.RuntimeContextSizeLimit).toBe('')
    expect(fixture.setting).not.toHaveProperty('TimelineContentSizeLimit')
  })

  it('resets to the new 300 KB default using the existing reset control', async () => {
    render(<AIChatSetting />)
    const input = screen.getByRole('textbox', { name: /AIChatSetting.runtimeContextSize/ })
    await waitFor(() => expect(input).toHaveValue('450'))
    fireEvent.click(screen.getByRole('button', { name: '重置', exact: true }))
    await waitFor(() => expect(input).toHaveValue('300'))
    expect(fixture.setting.RuntimeContextSizeLimit).toBe(300)
    expect(fixture.setting).not.toHaveProperty('TimelineContentSizeLimit')
  })
})
