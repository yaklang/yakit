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
      // 如果有子节点，渲染子节点；否则输出指令名称本身
      if (node.children && node.children.length > 0) {
        state.next(node.children)
      } else {
        // 手动添加文本，带上冒号还原原始内容
        state.addText(`:${node.name}`)
      }
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
