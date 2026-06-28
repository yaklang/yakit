import { $nodeSchema } from '@milkdown/utils'

export const fallbackTextDirectiveId = 'fallback-text-directive'

export const fallbackTextDirectiveSchema = $nodeSchema(fallbackTextDirectiveId, () => ({
  inline: true,
  group: 'inline',
  content: 'text*',
  atom: false,

  parseMarkdown: {
    match: (node) => node.type === 'textDirective',
    runner: (state, node, type) => {
      // console.warn(`⚠️ 未匹配的 textDirective: :${node.name}`, node.attributes)
      // 直接输出子节点（纯文本），忽略指令标记，不报错
      state.next(node.children)
    },
  },

  toMarkdown: {
    match: (node) => node.type.name === fallbackTextDirectiveId,
    runner: (state, node) => {
      // 导出时也作为普通文本输出
      state.next(node.content)
    },
  },
}))

export const fallbackTextDirectivePlugin = () => [fallbackTextDirectiveSchema.node, fallbackTextDirectiveSchema.ctx]
