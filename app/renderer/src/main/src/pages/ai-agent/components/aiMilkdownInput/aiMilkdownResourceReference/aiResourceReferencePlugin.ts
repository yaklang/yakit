import { $command, $nodeSchema, $nodeAttr } from '@milkdown/utils'
import type { Attrs } from '@milkdown/kit/prose/model'
import { TextSelection } from '@milkdown/kit/prose/state'
import { parseResourceReferenceIds } from './resourceReferenceIds'

export const aiResourceReferenceCustomId = 'ai-resource-reference-custom'

const aiResourceReferenceCustomAttr = $nodeAttr(aiResourceReferenceCustomId, () => ({
  'data-type': aiResourceReferenceCustomId,
  'data-resource-type': 'http',
  'data-ids': '',
  'data-display-text': '',
  'data-is-summary': 'false',
}))

export const aiResourceReferenceCustomSchema = $nodeSchema(aiResourceReferenceCustomId, (ctx) => ({
  inline: true,
  group: 'inline',
  content: 'text*',
  atom: true,
  draggable: false,
  isolating: true,
  selectable: true,
  parseDOM: [
    {
      tag: `div[data-type='${aiResourceReferenceCustomId}'], div[data-type='ai-http-flow-custom']`,
      getAttrs: (dom) => {
        const isRisk = dom.getAttribute('data-resource-type') === 'risk'
        const legacyHttpIds = isRisk ? null : dom.getAttribute('data-flow-ids') || dom.getAttribute('data-flow-id')
        return {
          type: isRisk ? 'risk' : 'http',
          ids: parseResourceReferenceIds(dom.getAttribute('data-ids') ?? legacyHttpIds ?? ''),
          displayText: dom.getAttribute('data-display-text') || '',
          isSummary: dom.getAttribute('data-is-summary') === 'true',
          lock: dom.getAttribute('data-lock') === 'true',
        }
      },
    },
  ],
  toDOM: (node) => {
    return [
      'div',
      {
        ...ctx.get(aiResourceReferenceCustomAttr.key)(node),
        'data-resource-type': node.attrs.type,
        'data-ids': node.attrs.ids.join(','),
        'data-display-text': node.attrs.displayText,
        'data-is-summary': node.attrs.isSummary ? 'true' : 'false',
        'data-lock': node.attrs.lock ? 'true' : 'false',
      },
      0,
    ]
  },
  parseMarkdown: {
    match: (node) => {
      const { type, name } = node
      return type === 'textDirective' && (name === 'httpFlow' || name === 'risk')
    },
    runner: (state, node, type) => {
      if (type.name === aiResourceReferenceCustomId) {
        const attrs = (node.attributes || {}) as Attrs
        const isRisk = node.name === 'risk'
        // 旧版 :httpFlow 使用 flowIds 或 flowId，读入时统一为 ids。
        const legacyHttpIds = isRisk ? undefined : attrs.flowIds || attrs.flowId
        state
          .openNode(type, {
            type: isRisk ? 'risk' : 'http',
            ids: parseResourceReferenceIds(attrs.ids ?? legacyHttpIds ?? ''),
            displayText: attrs.displayText || '',
            lock: attrs.lock === true || attrs.lock === 'true',
            isSummary: attrs.isSummary === true || attrs.isSummary === 'true',
          })
          .next(node.children)
          .closeNode()
      }
    },
  },
  toMarkdown: {
    match: (node) => {
      return node.type.name === aiResourceReferenceCustomId
    },
    runner: (state, node) => {
      state
        .openNode('textDirective', undefined, {
          name: node.attrs.type === 'risk' ? 'risk' : 'httpFlow',
          attributes: {
            ids: node.attrs.ids.join(','),
            displayText: node.attrs.displayText,
            isSummary: node.attrs.isSummary,
          },
        })
        .next(node.content)
        .closeNode()
    },
  },
  attrs: {
    type: { default: 'http' },
    ids: { default: [] },
    displayText: { default: '' },
    isSummary: { default: false },
    lock: { default: false },
  },
}))

export interface AIResourceReferenceParams {
  type: 'http' | 'risk'
  ids: string[]
  displayText: string
  isSummary: boolean
  lock?: boolean
}

export const aiResourceReferenceCommand = $command<AIResourceReferenceParams, string>(
  `command-${aiResourceReferenceCustomId}`,
  (ctx) => (params?: AIResourceReferenceParams) => (state, dispatch) => {
    if (!params) return false
    const { selection, tr } = state
    if (!(selection instanceof TextSelection)) return false
    const { type, ids, displayText, isSummary, lock } = params
    const fragment = state.schema.text(displayText)
    dispatch?.(
      tr
        .setMeta(aiResourceReferenceCustomId, true)
        .replaceSelectionWith(
          aiResourceReferenceCustomSchema
            .type(ctx)
            .create({ type, ids, displayText, isSummary, lock: lock ?? false }, fragment),
        )
        .scrollIntoView(),
    )
    return true
  },
)

export const aiResourceReferenceCustomPlugin = () => {
  return [
    aiResourceReferenceCustomAttr,
    aiResourceReferenceCustomSchema.node,
    aiResourceReferenceCustomSchema.ctx,
    aiResourceReferenceCommand,
  ]
}
