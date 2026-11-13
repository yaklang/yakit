import { Editor, editorViewCtx, rootCtx } from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import type { EditorView } from '@milkdown/kit/prose/view'
import { getMarkdown } from '@milkdown/kit/utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { placeholderConfig, placeholderPlugin } from '../Placeholder'

let editor: Editor | undefined

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'], shouldAdvanceTime: true })
})

afterEach(async () => {
  try {
    await editor?.destroy()
    await vi.runAllTimersAsync()
  } finally {
    editor = undefined
    vi.useRealTimers()
  }
})

it('keeps rich placeholder content out of Markdown and hides it once the document has text', async () => {
  const root = document.createElement('div')
  const render = (view: EditorView) => {
    const widget = view.dom.ownerDocument.createElement('span')
    widget.textContent = 'Ask me anything @ Use skills'
    return widget
  }

  editor = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(placeholderConfig.key, { mode: 'doc', text: '', render })
    })
    .use(commonmark)
    .use(placeholderConfig)
    .use(placeholderPlugin)
    .create()

  const view = editor.action((ctx) => ctx.get(editorViewCtx))
  const getWidget = () => root.querySelector<HTMLElement>('p > .ProseMirror-widget')
  expect(getWidget()?.textContent).toBe('Ask me anything @ Use skills')
  expect(getWidget()?.contentEditable).toBe('false')
  expect(editor.action(getMarkdown()).trim()).toBe('')

  view.dispatch(view.state.tr.insertText('Question'))
  expect(getWidget()).toBeNull()
  expect(editor.action(getMarkdown()).trim()).toBe('Question')

  view.dispatch(view.state.tr.delete(1, view.state.doc.content.size - 1))
  expect(getWidget()?.textContent).toBe('Ask me anything @ Use skills')
})

it('continues rendering the text placeholder for other editors', async () => {
  const root = document.createElement('div')
  editor = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(placeholderConfig.key, { mode: 'block', text: 'Enter text' })
    })
    .use(commonmark)
    .use(placeholderConfig)
    .use(placeholderPlugin)
    .create()

  expect(root.querySelector('p.crepe-placeholder')?.getAttribute('data-placeholder')).toBe('Enter text')
})
