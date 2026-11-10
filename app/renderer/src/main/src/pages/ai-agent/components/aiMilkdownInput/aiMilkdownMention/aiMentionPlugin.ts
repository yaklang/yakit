import { $command, $nodeSchema, $nodeAttr } from '@milkdown/utils'
import type { Attrs } from '@milkdown/kit/prose/model'
import { TextSelection } from '@milkdown/kit/prose/state'
import type { iconMapType } from '../../aiChatMention/type'
import { getMentionQueryDeleteRange, mentionTextBeforeCursor } from './mentionQuery'

export const aiMentionCustomId = 'ai-mention-custom'

const aiMentionCustomAttr = $nodeAttr(aiMentionCustomId, () => ({
  'data-type': aiMentionCustomId,
  'data-mention-type': '',
  'data-mention-name': '',
  'data-mention-id': '',
}))

export const aiMentionCustomSchema = $nodeSchema(aiMentionCustomId, (ctx) => ({
  inline: true,
  group: 'inline',
  content: 'text*',
  atom: true,
  draggable: false,
  isolating: true, // 阻止其他节点进入这个节点,
  selectable: true,
  // 从 DOM 中解析节点，动态设置属性
  parseDOM: [
    {
      tag: `div[data-type='${aiMentionCustomId}']`,
      getAttrs: (dom) => {
        return {
          mentionId: dom.getAttribute('data-mention-id'),
          mentionType: dom.getAttribute('data-mention-type'),
          mentionName: dom.getAttribute('data-mention-name'),
          mentionSource: dom.getAttribute('data-mention-source') === 'attachment' ? 'attachment' : undefined,
          forgeName: dom.getAttribute('data-forge-name') ?? undefined,
          lock: dom.getAttribute('data-lock') === 'true', // 新增 lock
        }
      },
    },
  ],

  // 将节点转为 DOM 结构，动态设置样式
  toDOM: (node) => {
    return [
      'div',
      {
        ...ctx.get(aiMentionCustomAttr.key)(node),
        'data-mention-id': node.attrs.mentionId,
        'data-mention-type': node.attrs.mentionType,
        'data-mention-name': node.attrs.mentionName,
        'data-mention-source': node.attrs.mentionSource,
        'data-forge-name': node.attrs.forgeName,
        'data-lock': node.attrs.lock ? 'true' : 'false', // 新增 lock
      },
      0,
    ]
  },

  parseMarkdown: {
    match: (node) => {
      const { type, name } = node
      return type === 'textDirective' && name === 'mention'
    },
    runner: (state, node, type) => {
      if (type.name === aiMentionCustomId) {
        state
          .openNode(type, { ...(node.attributes as Attrs) })
          .next(node.children)
          .closeNode()
      }
    },
  },

  toMarkdown: {
    match: (node) => {
      return node.type.name === aiMentionCustomId
    },
    runner: (state, node) => {
      state
        .openNode('textDirective', undefined, {
          name: 'mention',
          attributes: {
            mentionId: node.attrs.mentionId,
            mentionType: node.attrs.mentionType,
            mentionName: node.attrs.mentionName,
            ...(node.attrs.mentionSource && { mentionSource: node.attrs.mentionSource }),
            ...(node.attrs.forgeName && { forgeName: node.attrs.forgeName }),
          },
        })
        .next(node.content)
        .closeNode()
    },
  },
  attrs: {
    mentionId: { default: '0' },
    mentionType: { default: '' },
    mentionName: { default: '' },
    mentionSource: { default: undefined },
    forgeName: { default: undefined },
    lock: { default: false }, // 默认不可锁
  },
}))

export interface AIMentionCommandParams {
  mentionId: string
  mentionType: iconMapType
  mentionName: string
  mentionSource?: 'attachment'
  forgeName?: string
  lock?: boolean // 新增 lock 属性
}
export const aiMentionCommand = $command<AIMentionCommandParams, string>(
  `command-${aiMentionCustomId}`,
  (ctx) => (params?: AIMentionCommandParams) => (state, dispatch) => {
    if (!params) return false
    const { selection, tr } = state
    if (!(selection instanceof TextSelection)) return false
    const { mentionType, mentionId, mentionName, mentionSource, forgeName, lock } = params
    const { from } = selection
    // 删除光标前整段 @query（含 @）。块边界必须带换行，否则换段后再选会留下 @
    const textBefore = mentionTextBeforeCursor(state.doc, from)
    const deleteRange = getMentionQueryDeleteRange(from, textBefore)
    if (deleteRange) {
      tr.deleteRange(deleteRange.from, deleteRange.to)
    }
    const fragment = state.schema.text(`${mentionName}`)
    dispatch?.(
      tr
        .setMeta(aiMentionCustomId, true)
        .replaceSelectionWith(
          aiMentionCustomSchema
            .type(ctx)
            .create({ mentionId, mentionType, mentionName, mentionSource, forgeName, lock: lock ?? false }, fragment),
        )
        .scrollIntoView(),
    )
    return true
  },
)

export const aiMentionCustomPlugin = () => {
  return [aiMentionCustomAttr, aiMentionCustomSchema.node, aiMentionCustomSchema.ctx, aiMentionCommand]
}
