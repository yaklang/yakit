import { createContext, useContext } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  view: {
    dom: document.createElement('div'),
    state: { selection: { from: 0 }, doc: { textBetween: () => '' } },
    focus: vi.fn(),
  },
  onSetStrategy: vi.fn(),
}))

const EditorContext = createContext(state)

vi.mock('@milkdown/kit/plugin/slash', () => ({
  slashFactory: vi.fn(),
  SlashProvider: class {
    show = vi.fn()
    hide = vi.fn()
    destroy = vi.fn()
    getContent = () => ''
  },
}))
vi.mock('@milkdown/react', () => ({ useInstance: () => [false, vi.fn()] }))
vi.mock('@prosemirror-adapter/react', () => ({
  usePluginViewContext: () => ({ view: useContext(EditorContext).view }),
}))
vi.mock('@/pages/ai-agent/aiRunModeSelect/useAIRunMode', () => ({
  useAIRunMode: () => ({
    goalMinIterations: 0,
    maxSubAgents: 0,
    strategy: { EnableGoalMode: true, GoalDurationSeconds: 3600 },
    onSetStrategy: useContext(EditorContext).onSetStrategy,
    onToggleMode: vi.fn(),
    isModeSelected: () => false,
  }),
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))
import { AIMilkdownModeSlash } from '../AIMilkdownModeSlash'
import { useStrategySetupTags } from '../../../../template/StrategySetupTags'
import { requestModeSlashReopen } from '../store'

const openDuration = (durationKey = '1h') => {
  render(<AIMilkdownModeSlash />)
  act(() => requestModeSlashReopen(state.view.dom, { kind: 'goalDuration', durationKey }))
}

const pickDuration = (label: string) => {
  fireEvent.mouseDown(screen.getByRole('combobox'))
  fireEvent.click(screen.getByText(label, { selector: '.ant-select-item-option-content' }))
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    },
  )
  const card = document.createElement('div')
  card.setAttribute('data-ai-input-card', '')
  card.appendChild(state.view.dom)
  document.body.appendChild(card)
})

afterEach(() => {
  cleanup()
  state.view.dom.parentElement?.remove()
  vi.unstubAllGlobals()
})

describe('AIMilkdownModeSlash duration', () => {
  it('另一个输入框挂载后，点击原输入框的目标标签仅修改原会话', () => {
    const Tags = () => <>{useStrategySetupTags()}</>
    const card = state.view.dom.parentElement!
    render(
      <>
        <Tags />
        <AIMilkdownModeSlash />
      </>,
      { container: state.view.dom },
    )

    const historyCard = document.createElement('div')
    historyCard.setAttribute('data-ai-input-card', '')
    document.body.appendChild(historyCard)
    const history = { view: { ...state.view, dom: historyCard }, onSetStrategy: vi.fn() }
    render(
      <EditorContext.Provider value={history}>
        <AIMilkdownModeSlash />
      </EditorContext.Provider>,
      { container: historyCard },
    )
    historyCard.hidden = true

    fireEvent.click(within(card).getByRole('button', { name: 'AIMilkdownModeSlash.durationPrefix' }))
    pickDuration('3h')
    fireEvent.click(screen.getByRole('button', { name: 'confirm' }))
    expect(state.onSetStrategy).toHaveBeenCalledWith(expect.objectContaining({ GoalDurationSeconds: 10800 }))
    expect(history.onSetStrategy).not.toHaveBeenCalled()
  })

  it('offers the duration presets, never and custom in the same order', () => {
    openDuration()
    fireEvent.mouseDown(screen.getByRole('combobox'))
    const options = document.querySelectorAll('.ant-select-item-option-content')
    expect(Array.from(options, (option) => option.textContent)).toEqual([
      '30m',
      '1h',
      '3h',
      'AIMilkdownModeSlash.durationNever',
      'AIRunModeSelect.customDuration',
    ])
  })

  it('restores a custom duration and submits edited hours and minutes only on confirmation', () => {
    openDuration('18000')
    expect(screen.getByText('AIRunModeSelect.customDuration')).toBeInTheDocument()
    const hours = screen.getByRole('spinbutton', { name: 'AIRunModeSelect.durationHours' })
    const minutes = screen.getByRole('spinbutton', { name: 'AIRunModeSelect.durationMinutes' })
    expect(hours).toHaveValue('5')
    expect(minutes).toHaveValue('0')
    fireEvent.change(hours, { target: { value: '3' } })
    fireEvent.change(minutes, { target: { value: '20' } })
    expect(state.onSetStrategy).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'confirm' }))
    expect(state.onSetStrategy).toHaveBeenCalledWith({
      EnableGoalMode: true,
      GoalMinIterations: 0,
      GoalDurationSeconds: 12000,
      GoalAcceptanceCriteria: '',
    })
  })

  it.each([
    ['3h', 10800],
    ['AIMilkdownModeSlash.durationNever', -1],
  ])('switches from custom to %s without submitting the custom draft', (preset, seconds) => {
    openDuration('8100')
    pickDuration(preset)
    expect(screen.queryByRole('spinbutton', { name: 'AIRunModeSelect.durationHours' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'confirm' }))
    expect(state.onSetStrategy).toHaveBeenCalledWith(expect.objectContaining({ GoalDurationSeconds: seconds }))
  })

  it('lets a preset become custom and cancels without persisting the draft', () => {
    openDuration('3h')
    pickDuration('AIRunModeSelect.customDuration')
    expect(screen.getByRole('spinbutton', { name: 'AIRunModeSelect.durationHours' })).toHaveValue('3')
    fireEvent.change(screen.getByRole('spinbutton', { name: 'AIRunModeSelect.durationMinutes' }), {
      target: { value: '30' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'cancel' }))
    expect(state.onSetStrategy).not.toHaveBeenCalled()
  })

  it('keeps Enter for the open dropdown and confirms custom input after it closes', async () => {
    openDuration('1h')
    const select = screen.getByRole('combobox')
    fireEvent.mouseDown(select)
    await waitFor(() => expect(screen.getByRole('option', { name: '1h' })).toHaveClass('ant-select-item-option-active'))
    for (let index = 0; index < 3; index++) {
      fireEvent.keyDown(select, { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, which: 40 })
    }
    fireEvent.keyDown(select, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13 })
    expect(state.onSetStrategy).not.toHaveBeenCalled()
    const hours = screen.getByRole('spinbutton', { name: 'AIRunModeSelect.durationHours' })
    fireEvent.change(hours, { target: { value: '3' } })
    expect(
      screen.getByText('AIRunModeSelect.customDuration', { selector: '.ant-select-selection-item' }),
    ).toBeInTheDocument()
    fireEvent.keyDown(hours, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13 })
    expect(state.onSetStrategy).toHaveBeenCalledWith(expect.objectContaining({ GoalDurationSeconds: 10800 }))
  })
})
