import React, { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createStore } from 'zustand/vanilla'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../../../ai-re-act/hooks/__test__/setupElectron'
import useGetSetState from '@/pages/pluginHub/hooks/useGetSetState'
import AIAgentContext from '../../useContext/AIAgentContext'
import type { AIAgentSetting } from '../../aiAgentType'
import type { AISession } from '../../type/aiChat'
import { AIAgentSettingDefault } from '../../defaultConstant'
import AIRunModeSelect from '../AIRunModeSelect'

const sessionStore = createStore(() => ({ execute: false }))
vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({ useCurrentStore: () => sessionStore }))
vi.mock('@/pages/ai-re-act/hooks/useCurrentSessionId', () => ({ default: () => '' }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('@/components/yakitUI/YakitSwitch/yakitSwitchAnimation.scss', () => ({}))

let selected: AIAgentSetting
const Harness = () => {
  const [setting, setSetting, getSetting] = useGetSetState<AIAgentSetting>({
    ...AIAgentSettingDefault,
    Strategy: { EnableGoalMode: false, EnableMultiAgent: false },
  })
  const [activeChat, setActiveChat] = useState<AISession>()
  selected = setting
  return (
    <AIAgentContext.Provider
      value={{
        store: { setting, activeChat },
        dispatcher: {
          getSetting,
          setSetting,
          setActiveChat,
          onSend: () => false,
          onStart: () => {},
          onClose: () => {},
          cancelPendingChat: () => {},
          detachPendingChat: () => {},
          onUpdatePageId: () => {},
        },
      }}
    >
      <AIRunModeSelect />
    </AIAgentContext.Provider>
  )
}
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Goal entry in the retained AI Senso mode dropdown', () => {
  it('opens Goal from the mode button and commits duration through the real context and hook', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn() })),
    )
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Plan' }))
    expect(await screen.findByRole('menuitemcheckbox', { name: 'Plan' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('menuitemcheckbox', { name: 'Multi-Agent' })).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: 'Goal' }))
    fireEvent.click(screen.getByRole('radio', { name: 'AIRunModeSelect.duration' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'AIRunModeSelect.minimumDuration' }), {
      target: { value: '1200' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'AIRunModeSelect.applyCondition' }))
    expect(selected.Strategy).toMatchObject({
      EnableGoalMode: true,
      GoalMinIterations: 0,
      GoalDurationSeconds: 1200,
      GoalAcceptanceCriteria: '',
    })
    expect(screen.getByRole('menuitemcheckbox', { name: 'Goal' })).toHaveAttribute('aria-checked', 'true')
  })

  it('allows disabling Plan in the current conversation and starts a fresh conversation with Plan selected', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn() })),
    )
    const first = render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Plan' }))
    fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: 'Plan' }))
    expect(selected.EnablePlan).toBe(false)
    expect(screen.getByRole('menuitemcheckbox', { name: 'Plan' })).toHaveAttribute('aria-checked', 'false')
    first.unmount()

    render(<Harness />)
    expect(selected.EnablePlan).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Plan' }))
    expect(await screen.findByRole('menuitemcheckbox', { name: 'Plan' })).toHaveAttribute('aria-checked', 'true')
  })
})
