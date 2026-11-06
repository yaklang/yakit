import '@/pages/ai-re-act/hooks/__test__/setupElectron'
import React from 'react'
import { Schema } from '@milkdown/kit/prose/model'
import { EditorState, TextSelection } from '@milkdown/kit/prose/state'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ view: undefined as any, query: '/plan', toggle: vi.fn(), strategy: vi.fn() }))
vi.mock('@milkdown/react', () => ({ useInstance: () => [false, () => ({ action: vi.fn() })] }))
vi.mock('@prosemirror-adapter/react', () => ({
  usePluginViewContext: () => ({ view: mocks.view, prevState: mocks.view.state }),
}))
vi.mock('@milkdown/kit/plugin/slash', () => ({
  slashFactory: () => ({ key: 'slash' }),
  SlashProvider: class {
    element: HTMLElement
    constructor({ content }: any) {
      this.element = content
    }
    getContent() {
      return mocks.query
    }
    show() {
      this.element.dataset.show = 'true'
    }
    hide() {
      this.element.dataset.show = 'false'
    }
    destroy() {}
  },
}))
vi.mock('@/pages/ai-agent/aiRunModeSelect/useAIRunMode', () => ({
  useAIRunMode: () => ({
    goalMinIterations: 1,
    maxSubAgents: 0,
    onToggleMode: mocks.toggle,
    onSetStrategy: mocks.strategy,
    isModeSelected: () => false,
  }),
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }) }))
import { AIMilkdownModeSlash } from '../AIMilkdownModeSlash'

beforeEach(() => {
  mocks.query = '/plan'
  mocks.toggle.mockReset().mockReturnValue(true)
  mocks.strategy.mockReset().mockReturnValue(true)
  const schema = new Schema({
    nodes: {
      doc: { content: 'paragraph+' },
      paragraph: { content: 'inline*', group: 'block' },
      text: { group: 'inline' },
      mention: {
        inline: true,
        group: 'inline',
        atom: true,
        attrs: { lock: { default: true }, forge: { default: 'employee-forge' } },
      },
    },
  })
  const doc = schema.node('doc', null, [
    schema.node('paragraph', null, [schema.node('mention'), schema.text(' hello /plan')]),
  ])
  let state = EditorState.create({ schema, doc, selection: TextSelection.atEnd(doc) })
  const card = document.createElement('div')
  card.dataset.aiInputCard = ''
  document.body.appendChild(card)
  const dom = document.createElement('div')
  dom.contentEditable = 'true'
  card.appendChild(dom)
  mocks.view = {
    dom,
    get state() {
      return state
    },
    dispatch: (transaction: any) => {
      state = state.apply(transaction)
    },
    focus: vi.fn(),
  }
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
})
afterEach(() => {
  cleanup()
  mocks.view.dom.parentElement.remove()
  vi.unstubAllGlobals()
})
describe('mode slash editor integration', () => {
  it('consumes only the command and preserves the locked employee Forge node and preceding text', async () => {
    render(<AIMilkdownModeSlash />)
    fireEvent.click(await screen.findByText('AIMilkdownModeSlash.plan'))
    expect(mocks.toggle).toHaveBeenCalledWith('plan')
    const paragraph = mocks.view.state.doc.firstChild
    expect(paragraph.firstChild.type.name).toBe('mention')
    expect(paragraph.firstChild.attrs.lock).toBe(true)
    expect(paragraph.firstChild.attrs.forge).toBe('employee-forge')
    expect(paragraph.textContent).toBe(' hello ')
  })
  it('ignores IME Enter and confirms the filtered command on regular Enter', async () => {
    render(<AIMilkdownModeSlash />)
    await screen.findByText('AIMilkdownModeSlash.plan')
    fireEvent.keyDown(mocks.view.dom, { key: 'Enter', keyCode: 229, isComposing: true })
    expect(mocks.toggle).not.toHaveBeenCalled()
    fireEvent.keyDown(mocks.view.dom, { key: 'Enter', keyCode: 13 })
    await waitFor(() => expect(mocks.toggle).toHaveBeenCalledTimes(1))
  })
  it('keeps a rejected strategy available instead of advancing to an unapplied configuration', async () => {
    mocks.query = '/goal'
    mocks.strategy.mockReturnValue(false)
    render(<AIMilkdownModeSlash />)
    fireEvent.click(await screen.findByText('AIMilkdownModeSlash.goal'))
    expect(mocks.strategy).toHaveBeenCalledWith({ EnableGoalMode: true })
    expect(screen.queryByText('AIMilkdownModeSlash.acceptanceOption')).toBeNull()
    expect(mocks.view.state.doc.firstChild.firstChild.attrs.lock).toBe(true)
  })
})
