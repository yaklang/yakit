import { Schema } from '@milkdown/kit/prose/model'
import { describe, expect, it } from 'vitest'
import { createTriggerQueryReg, getTriggerQueryDeleteRange, triggerTextBeforeCursor } from '../triggerQuery'

describe('triggerTextBeforeCursor', () => {
  const schema = new Schema({
    nodes: {
      doc: { content: 'block+' },
      paragraph: { content: 'inline*', group: 'block' },
      text: { group: 'inline' },
      mention: { content: 'text*', inline: true, group: 'inline', atom: true },
    },
  })

  function cursorAfterLastText(doc: ReturnType<typeof schema.node>): number {
    let pos = 0
    doc.descendants((node, nodePos) => {
      if (node.isText) pos = nodePos + node.nodeSize
    })
    return pos
  }

  it.each([
    ['@', '@'],
    ['@', '@ad'],
    ['/', '/'],
    ['/', '/plan'],
  ])('换段后触发符 %s + %s：只删本行触发段，上一段技能名不动', (trigger, query) => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.node('mention', null, [schema.text('yaklang-system')])]),
      schema.node('paragraph', null, [schema.text(query)]),
    ])
    const cursor = cursorAfterLastText(doc)
    const range = getTriggerQueryDeleteRange(
      createTriggerQueryReg(trigger),
      cursor,
      triggerTextBeforeCursor(doc, cursor, 64),
    )
    expect(doc.textBetween(range!.from, range!.to, '\n', '\uFFFC')).toBe(query)
    expect(doc.textBetween(0, range!.from, '\n', '\uFFFC')).toBe('yaklang-system\n')
  })
})
