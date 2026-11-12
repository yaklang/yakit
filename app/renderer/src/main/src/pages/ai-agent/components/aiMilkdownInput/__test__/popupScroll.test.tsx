import React from 'react'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AIMilkdownMention } from '../aiMilkdownMention/AIMilkdownMention'
import { AIMilkdownModeSlash } from '../aiMilkdownModeSlash/AIMilkdownModeSlash'
import { releaseMilkdownPopup, tryClaimMilkdownPopup } from '../panelMutex'

const context = vi.hoisted(() => ({ view: {} as any, prevState: {} as object, content: '', providers: [] as any[] }))
vi.mock('@milkdown/react', () => ({ useInstance: () => [false, () => ({ action: vi.fn() })] }))
vi.mock('@prosemirror-adapter/react', () => ({
  usePluginViewContext: () => ({ view: context.view, prevState: context.prevState }),
  useNodeViewContext: vi.fn(),
}))
vi.mock('@milkdown/kit/plugin/slash', () => ({
  slashFactory: vi.fn(),
  SlashProvider: class {
    element: HTMLElement
    constructor({ content }: { content: HTMLElement }) {
      this.element = content
      context.providers.push(this)
    }
    getContent() {
      return context.content
    }
    show() {
      this.element.dataset.show = 'true'
    }
    hide = vi.fn(() => {
      this.element.dataset.show = 'false'
    })
    destroy = vi.fn()
  },
}))
vi.mock('@/pages/ai-agent/defaultConstant', () => ({ iconMap: {} }))
vi.mock('../customPlugin', () => ({ removeAIOffsetCommand: {} }))
vi.mock('../aiMilkdownMention/aiMentionPlugin', () => ({ aiMentionCommand: {} }))
vi.mock('../../aiChatMention/AIChatMention', () => ({
  AIChatMention: () => <div data-testid="mention-list">items</div>,
}))
vi.mock('@/components/yakitUI/YakitTag/YakitTag', () => ({ YakitTag: () => null }))
vi.mock('@/components/yakitUI/YakitInputNumber/YakitInputNumber', () => ({ YakitInputNumber: () => null }))
vi.mock('@/components/yakitUI/YakitInput/YakitInput', () => ({ YakitInput: { TextArea: () => null } }))
vi.mock('@/components/yakitUI/YakitSelect/YakitSelect', () => ({
  YakitSelect: Object.assign(() => null, { Option: () => null }),
}))
vi.mock('@/pages/ai-agent/aiRunModeSelect/useAIRunMode', () => ({
  useAIRunMode: () => ({
    goalMinIterations: 1,
    maxSubAgents: 1,
    onToggleMode: vi.fn(),
    onSetStrategy: vi.fn(),
    isModeSelected: () => false,
  }),
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))

let scrollContainer: HTMLDivElement
beforeEach(() => {
  vi.useFakeTimers()
  context.providers = []
  context.prevState = {}
  scrollContainer = document.createElement('div')
  const anchor = document.createElement('div')
  anchor.dataset.aiInputCard = ''
  const editor = document.createElement('div')
  anchor.append(editor)
  scrollContainer.append(anchor)
  document.body.append(scrollContainer)
  context.view = {
    dom: editor,
    focus: vi.fn(),
    dispatch: vi.fn(),
    state: {
      selection: { from: 1 },
      doc: { textBetween: () => context.content },
      tr: { deleteRange: () => ({ scrollIntoView: vi.fn() }) },
    },
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
  scrollContainer.remove()
  releaseMilkdownPopup('mention')
  releaseMilkdownPopup('modeSlash')
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('mention popup outside clicks', () => {
  it('closes before the add-materials click handler and stays closed for the same editor state', () => {
    context.content = '@'
    const openMaterials = vi.fn(() => context.providers[0].element.dataset.show)
    const renderInput = () => (
      <>
        <AIMilkdownMention />
        <button
          onClick={(event) => {
            event.stopPropagation()
            openMaterials()
          }}
        >
          添加资料
        </button>
      </>
    )
    const { getByRole, rerender } = render(renderInput())
    act(() => vi.advanceTimersByTime(250))
    const { element } = context.providers[0]
    expect(element.dataset.show).toBe('true')

    fireEvent.click(getByRole('button', { name: '添加资料' }))
    expect(openMaterials).toHaveReturnedWith('false')
    expect(context.view.focus).not.toHaveBeenCalled()
    expect(tryClaimMilkdownPopup('modeSlash')).toBe(true)
    releaseMilkdownPopup('modeSlash')

    context.prevState = {}
    rerender(renderInput())
    act(() => vi.advanceTimersByTime(250))
    expect(element.dataset.show).toBe('false')

    context.prevState = context.view.state
    context.view.state = { ...context.view.state }
    context.content = '@skill'
    rerender(renderInput())
    act(() => vi.advanceTimersByTime(250))
    expect(element.dataset.show).toBe('true')
  })

  it('keeps the popup open for clicks in the popup and editor', () => {
    context.content = '@'
    const { getByTestId } = render(<AIMilkdownMention />)
    act(() => vi.advanceTimersByTime(250))
    const { element } = context.providers[0]
    expect(element.dataset.show).toBe('true')

    fireEvent.click(getByTestId('mention-list'))
    fireEvent.click(context.view.dom)
    expect(element.dataset.show).toBe('true')
  })
})

describe.each([
  { kind: 'mention' as const, trigger: '@', Component: AIMilkdownMention, other: 'modeSlash' as const },
  { kind: 'modeSlash' as const, trigger: '/', Component: AIMilkdownModeSlash, other: 'mention' as const },
])('$kind popup scrolling', ({ trigger, Component, other }) => {
  function open() {
    context.content = trigger
    const rendered = render(<Component />)
    act(() => {
      vi.advanceTimersByTime(250)
    })
    const provider = context.providers[0]
    expect(provider.element.dataset.show).toBe('true')
    return { ...rendered, provider }
  }

  it.each(['ancestor', 'document', 'window'])('closes on %s scrolling and releases the popup lock', (target) => {
    const add = vi.spyOn(window, 'addEventListener')
    const remove = vi.spyOn(window, 'removeEventListener')
    const { provider } = open()
    const handler = add.mock.calls.find(([name, , options]) => name === 'scroll' && options === true)?.[1]
    fireEvent.scroll(target === 'ancestor' ? scrollContainer : target === 'document' ? document : window)
    expect(provider.element.dataset.show).toBe('false')
    expect(remove).toHaveBeenCalledWith('scroll', handler, true)
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(provider.element.dataset.show).toBe('false')
    expect(tryClaimMilkdownPopup(other)).toBe(true)
  })

  it('keeps the panel open when its list or an unrelated container scrolls', () => {
    const { provider } = open()
    fireEvent.scroll(provider.element.firstElementChild)
    const unrelated = document.createElement('div')
    document.body.append(unrelated)
    fireEvent.scroll(unrelated)
    unrelated.remove()
    expect(provider.element.dataset.show).toBe('true')
    expect(tryClaimMilkdownPopup(other)).toBe(false)
  })

  it('removes the capturing scroll listener on unmount', () => {
    const add = vi.spyOn(window, 'addEventListener')
    const remove = vi.spyOn(window, 'removeEventListener')
    const { unmount, provider } = open()
    const handler = add.mock.calls.find(([name, , options]) => name === 'scroll' && options === true)?.[1]
    expect(handler).toBeDefined()
    unmount()
    expect(remove).toHaveBeenCalledWith('scroll', handler, true)
    provider.hide.mockClear()
    fireEvent.scroll(scrollContainer)
    expect(provider.hide).not.toHaveBeenCalled()
  })
})
