import { $command, $nodeSchema, $nodeAttr } from '@milkdown/utils'
import { type Attrs } from '@milkdown/kit/prose/model'
import { TextSelection } from '@milkdown/kit/prose/state'
import { parseHttpFlowIds } from './httpFlowIds'

export const aiHttpFlowCustomId = 'ai-http-flow-custom'

const aiHttpFlowCustomAttr = $nodeAttr(aiHttpFlowCustomId, () => ({
  'data-type': aiHttpFlowCustomId,
  'data-flow-ids': '',
  'data-display-text': '',
  'data-is-summary': 'false',
}))

export const aiHttpFlowCustomSchema = $nodeSchema(aiHttpFlowCustomId, (ctx) => ({
  inline: true,
  group: 'inline',
  content: 'text*',
  atom: true,
  draggable: false,
  isolating: true,
  selectable: true,
  parseDOM: [
    {
      tag: `div[data-type='${aiHttpFlowCustomId}']`,
      getAttrs: (dom) => {
        return {
          flowIds: parseHttpFlowIds(dom.getAttribute('data-flow-ids') || dom.getAttribute('data-flow-id') || ''),
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
        ...ctx.get(aiHttpFlowCustomAttr.key)(node),
        'data-flow-ids': node.attrs.flowIds.join(','),
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
      return type === 'textDirective' && name === 'httpFlow'
    },
    runner: (state, node, type) => {
      if (type.name === aiHttpFlowCustomId) {
        // 旧 History 消息使用 flowId，读入时统一为 flowIds。
        const { flowId, ...attrs } = (node.attributes || {}) as Attrs
        state
          .openNode(type, {
            ...attrs,
            flowIds: parseHttpFlowIds(attrs.flowIds || flowId || ''),
            isSummary: attrs.isSummary === true || attrs.isSummary === 'true',
          })
          .next(node.children)
          .closeNode()
      }
    },
  },
  toMarkdown: {
    match: (node) => {
      return node.type.name === aiHttpFlowCustomId
    },
    runner: (state, node) => {
      state
        .openNode('textDirective', undefined, {
          name: 'httpFlow',
          attributes: {
            flowIds: node.attrs.flowIds.join(','),
            displayText: node.attrs.displayText,
            isSummary: node.attrs.isSummary,
          },
        })
        .next(node.content)
        .closeNode()
    },
  },
  attrs: {
    flowIds: { default: [] },
    displayText: { default: '' },
    isSummary: { default: false },
    lock: { default: false },
  },
}))

export interface AIHttpFlowCommandParams {
  flowIds: string[]
  displayText: string
  isSummary: boolean
  lock?: boolean
}

export const aiHttpFlowCommand = $command<AIHttpFlowCommandParams, string>(
  `command-${aiHttpFlowCustomId}`,
  (ctx) => (params?: AIHttpFlowCommandParams) => (state, dispatch) => {
    if (!params) return false
    const { selection, tr } = state
    if (!(selection instanceof TextSelection)) return false
    const { flowIds, displayText, isSummary, lock } = params
    const fragment = state.schema.text(displayText)
    dispatch?.(
      tr
        .setMeta(aiHttpFlowCustomId, true)
        .replaceSelectionWith(
          aiHttpFlowCustomSchema.type(ctx).create({ flowIds, displayText, isSummary, lock: lock ?? false }, fragment),
        )
        .scrollIntoView(),
    )
    return true
  },
)

export const aiHttpFlowCustomPlugin = () => {
  return [aiHttpFlowCustomAttr, aiHttpFlowCustomSchema.node, aiHttpFlowCustomSchema.ctx, aiHttpFlowCommand]
}
