import { $command, $nodeSchema, $nodeAttr } from '@milkdown/utils'
import { Attrs, Node } from '@milkdown/kit/prose/model'
import { TextSelection } from '@milkdown/kit/prose/state'
import i18n from '@/i18n/i18n'

export const aiHttpFlowCustomId = 'ai-http-flow-custom'

export const HTTP_FLOW_DISPLAY_LIMIT = 5

const aiHttpFlowCustomAttr = $nodeAttr(aiHttpFlowCustomId, () => ({
  'data-type': aiHttpFlowCustomId,
  'data-flow-id': '',
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
          flowId: dom.getAttribute('data-flow-id') || '',
          flowIds: dom.getAttribute('data-flow-ids') || '',
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
        'data-flow-id': node.attrs.flowId,
        'data-flow-ids': node.attrs.flowIds,
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
        state
          .openNode(type, { ...(node.attributes as Attrs) })
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
            flowId: node.attrs.flowId,
            flowIds: node.attrs.flowIds,
            displayText: node.attrs.displayText,
            isSummary: node.attrs.isSummary,
          },
        })
        .next(node.content)
        .closeNode()
    },
  },
  attrs: {
    flowId: { default: '' },
    flowIds: { default: '' },
    displayText: { default: '' },
    isSummary: { default: false },
    lock: { default: false },
  },
}))

export interface AIHttpFlowCommandParams {
  flowId: string
  flowIds: string
  displayText: string
  isSummary: boolean
  lock?: boolean
}

export interface AIHttpFlowRemovePayload {
  flowId: string
  flowIds: string
  isSummary: boolean
}

const buildHttpFlowDisplayText = (flowIds: string[]) => {
  return flowIds.map((id) => `#${id}`).join(', ')
}

const buildHttpFlowNodes = (ctx: Parameters<Parameters<typeof $command>[1]>[0], state: any, flowIds: string[]) => {
  const schema = aiHttpFlowCustomSchema.type(ctx)
  const nodes: Node[] = []
  const allIds = flowIds.join(',')

  if (flowIds.length <= HTTP_FLOW_DISPLAY_LIMIT) {
    const displayText = buildHttpFlowDisplayText(flowIds)
    const fragment = state.schema.text(displayText)
    nodes.push(
      schema.create(
        {
          flowId: '',
          flowIds: allIds,
          displayText,
          isSummary: false,
          lock: true,
        },
        fragment,
      ),
    )
    return nodes
  }

  const displayText = i18n.t('aiAgent:AIMilkdownInput.selectedHttpFlowSummary', { count: flowIds.length })
  const fragment = state.schema.text(displayText)
  nodes.push(
    schema.create(
      {
        flowId: '',
        flowIds: allIds,
        displayText,
        isSummary: true,
        lock: true,
      },
      fragment,
    ),
  )
  return nodes
}

const removeLockedHttpFlowNodes = (state: any, tr: any) => {
  const toDelete: { from: number; to: number }[] = []
  state.doc.descendants((node, pos) => {
    if (node.type.name === aiHttpFlowCustomId && node.attrs.lock) {
      toDelete.push({ from: pos, to: pos + node.nodeSize })
    }
  })
  toDelete
    .sort((a, b) => b.from - a.from)
    .forEach(({ from, to }) => {
      tr = tr.delete(from, to)
    })
  return tr
}

export const setHttpFlowListCommand = $command<string[], string>(
  `command-set-${aiHttpFlowCustomId}`,
  (ctx) => (flowIds?: string[]) => (state, dispatch) => {
    const ids = flowIds || []
    let tr = removeLockedHttpFlowNodes(state, state.tr)

    if (!ids.length) {
      dispatch?.(tr.scrollIntoView())
      return true
    }

    const nodes = buildHttpFlowNodes(ctx, state, ids)
    let insertPos = 1
    nodes.forEach((node) => {
      tr = tr.insert(insertPos, node)
      insertPos += node.nodeSize
    })

    dispatch?.(tr.scrollIntoView())
    return true
  },
)

export const aiHttpFlowCommand = $command<AIHttpFlowCommandParams, string>(
  `command-${aiHttpFlowCustomId}`,
  (ctx) => (params?: AIHttpFlowCommandParams) => (state, dispatch) => {
    if (!params) return false
    const { selection, tr } = state
    if (!(selection instanceof TextSelection)) return false
    const { flowId, flowIds, displayText, isSummary, lock } = params
    const fragment = state.schema.text(displayText)
    dispatch?.(
      tr
        .setMeta(aiHttpFlowCustomId, true)
        .replaceSelectionWith(
          aiHttpFlowCustomSchema
            .type(ctx)
            .create({ flowId, flowIds, displayText, isSummary, lock: lock ?? false }, fragment),
        )
        .scrollIntoView(),
    )
    return true
  },
)

export const aiHttpFlowCustomPlugin = () => {
  return [aiHttpFlowCustomAttr, aiHttpFlowCustomSchema.node, aiHttpFlowCustomSchema.ctx, aiHttpFlowCommand, setHttpFlowListCommand]
}
