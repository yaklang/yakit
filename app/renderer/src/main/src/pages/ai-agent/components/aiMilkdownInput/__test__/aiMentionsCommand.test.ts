import { Editor, defaultValueCtx, editorViewCtx, rootCtx } from '@milkdown/kit/core'
import { TextSelection } from '@milkdown/kit/prose/state'
import type { EditorView } from '@milkdown/kit/prose/view'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { callCommand } from '@milkdown/kit/utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  aiMentionCommand,
  aiMentionCustomId,
  aiMentionCustomPlugin,
  aiMentionsCommand,
} from '../aiMilkdownMention/aiMentionPlugin'

let editor: Editor | undefined

const zeroDomRect = () => ({
  x: 0,
  y: 0,
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  width: 0,
  height: 0,
  toJSON: () => ({}),
})
const emptyClientRects = () => ({
  length: 0,
  item: () => null,
  [Symbol.iterator]: function* empty() {},
})

beforeEach(() => {
  for (const prototype of [Text.prototype, Range.prototype, Element.prototype]) {
    const target = prototype as {
      getClientRects?: () => ReturnType<typeof emptyClientRects>
      getBoundingClientRect?: () => ReturnType<typeof zeroDomRect>
    }
    if (typeof target.getClientRects !== 'function') target.getClientRects = emptyClientRects
    if (typeof target.getBoundingClientRect !== 'function') target.getBoundingClientRect = zeroDomRect
  }
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

it('多选插入后仍留在后文前面的空格，不会和后文粘在一起', async () => {
  const root = document.createElement('div')
  editor = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, '请用 @ab后文')
    })
    .use(commonmark)
    .use(aiMentionCustomPlugin())
    .create()

  editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const text = view.state.doc.textContent
    const cursor = 1 + text.indexOf('@ab') + '@ab'.length
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, cursor)))
  })
  editor.action(
    callCommand(aiMentionsCommand.key, [
      { mentionType: 'forge', mentionId: '1', mentionName: '技能', name: 'skill-a' },
    ]),
  )

  const view = editor.action((ctx) => ctx.get(editorViewCtx))
  const inline: unknown[] = []
  view.state.doc.firstChild?.forEach((node) => {
    inline.push(node.type.name === aiMentionCustomId ? ['mention', node.attrs.mentionName] : ['text', node.text])
  })
  expect(inline).toEqual([
    ['text', '请用 '],
    ['mention', '技能'],
    ['text', ' 后文'],
  ])
})

it('多选插入删掉 @query，每条 mention 后跟一个空格，光标停在末尾', async () => {
  const root = document.createElement('div')
  editor = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, '前文 @ab')
    })
    .use(commonmark)
    .use(aiMentionCustomPlugin())
    .create()

  editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const end = view.state.doc.content.size - 1
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, end)))
  })
  editor.action(
    callCommand(aiMentionsCommand.key, [
      { mentionType: 'forge', mentionId: '1', mentionName: '甲', name: 'skill-a' },
      { mentionType: 'tool', mentionId: '2', mentionName: '乙', name: 'tool-b' },
    ]),
  )

  const view = editor.action((ctx) => ctx.get(editorViewCtx))
  const inline: unknown[] = []
  view.state.doc.firstChild?.forEach((node) => {
    if (node.type.name === aiMentionCustomId) {
      inline.push(['mention', node.attrs.mentionId, node.attrs.mentionName, node.attrs.name])
      return
    }
    inline.push(['text', node.text])
  })
  expect(inline).toEqual([
    ['text', '前文 '],
    ['mention', '1', '甲', 'skill-a'],
    ['text', ' '],
    ['mention', '2', '乙', 'tool-b'],
    ['text', ' '],
  ])
  expect(view.state.doc.textContent).not.toContain('@ab')
  expect(view.state.selection.empty).toBe(true)
  expect(view.state.selection.from).toBe(view.state.doc.content.size - 1)
})

const collectInline = (view: EditorView) => {
  const inline: unknown[] = []
  view.state.doc.firstChild?.forEach((node) => {
    inline.push(node.type.name === aiMentionCustomId ? ['mention', node.attrs.mentionName] : ['text', node.text])
  })
  return inline
}

it('单选替换 @query 时在 mention 后补空格', async () => {
  const root = document.createElement('div')
  editor = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, '@ab后文')
    })
    .use(commonmark)
    .use(aiMentionCustomPlugin())
    .create()

  editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const text = view.state.doc.textContent
    const cursor = 1 + text.indexOf('@ab') + '@ab'.length
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, cursor)))
  })
  editor.action(callCommand(aiMentionCommand.key, { mentionType: 'forge', mentionId: '1', mentionName: '技能' }))

  const view = editor.action((ctx) => ctx.get(editorViewCtx))
  expect(collectInline(view)).toEqual([
    ['mention', '技能'],
    ['text', ' 后文'],
  ])
})

it('资料栏插入（无 @query）不补空格，避免删 chip 后残留', async () => {
  const root = document.createElement('div')
  editor = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, '正文')
    })
    .use(commonmark)
    .use(aiMentionCustomPlugin())
    .create()

  editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1)))
  })
  editor.action(callCommand(aiMentionCommand.key, { mentionType: 'forge', mentionId: '2', mentionName: '正文技能' }))

  const view = editor.action((ctx) => ctx.get(editorViewCtx))
  expect(collectInline(view)).toEqual([
    ['mention', '正文技能'],
    ['text', '正文'],
  ])
})
