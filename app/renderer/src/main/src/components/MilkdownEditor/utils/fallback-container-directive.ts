import { $nodeSchema } from '@milkdown/utils'

export const fallbackContainerDirectiveId = 'fallback-container-directive'

export const fallbackContainerDirectiveSchema = $nodeSchema(fallbackContainerDirectiveId, () => ({
  group: 'block',
  content: 'block*',
  atom: false,

  parseMarkdown: {
    // 匹配所有未被前面插件捕获的 containerDirective
    match: (node) => node.type === 'containerDirective',
    runner: (state, node, type) => {
      // 记录未匹配的容器指令，方便以后补充
      // console.warn(`⚠️ 未匹配的 containerDirective: :::${node.name}`, node.attributes)
      // 直接输出子内容（忽略容器标记），内容正常显示，不报错
      state.next(node.children)
    },
  },

  toMarkdown: {
    match: (node) => node.type.name === fallbackContainerDirectiveId,
    runner: (state, node) => {
      // 导出时也作为普通块级内容输出（不再生成 containerDirective）
      state.next(node.content)
    },
  },
}))

export const fallbackContainerDirectivePlugin = () => [
  fallbackContainerDirectiveSchema.node,
  fallbackContainerDirectiveSchema.ctx,
]
