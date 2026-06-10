import { $command, $nodeSchema, $nodeAttr } from '@milkdown/utils'
import { Attrs } from '@milkdown/kit/prose/model'
import { TextSelection } from '@milkdown/kit/prose/state'

export const aiCodeBlockCustomId = 'ai-code-block-custom'

export interface AICodeRefRange {
  startLineNumber: number
  startColumn: number
  endLineNumber: number
  endColumn: number
}

export interface AICodeBlockCommandParams {
  /** 选中的代码内容 */
  content: string
  /** 选中范围 */
  range: AICodeRefRange | null
  /** 文件名 */
  name: string
  /** 代码语言 */
  language: string
  /** 文件路径 */
  path: string
  /** 根目录路径 */
  rootPath: string
  lock?: boolean
}

const aiCodeBlockCustomAttr = $nodeAttr(aiCodeBlockCustomId, () => ({
  'data-type': aiCodeBlockCustomId,
  'data-name': '',
  'data-content': '',
  'data-path': '',
  'data-root-path': '',
  'data-language': '',
  'data-start-line-number': '',
  'data-start-column': '',
  'data-end-line-number': '',
  'data-end-column': '',
}))

export const buildCodeRefDisplayText = (name: string, range?: AICodeRefRange | null) => {
  if (!range?.startLineNumber) {
    return name
  }
  if (range.startLineNumber === range.endLineNumber) {
    return `${name} (${range.startLineNumber})`
  }
  return `${name} (${range.startLineNumber}-${range.endLineNumber})`
}

export const aiCodeBlockCustomSchema = $nodeSchema(aiCodeBlockCustomId, (ctx) => ({
  inline: true,
  group: 'inline',
  content: 'text*',
  atom: true,
  draggable: false,
  isolating: true,
  selectable: true,
  parseDOM: [
    {
      tag: `div[data-type='${aiCodeBlockCustomId}']`,
      getAttrs: (dom) => {
        return {
          name: dom.getAttribute('data-name') || '',
          content: dom.getAttribute('data-content') || '',
          path: dom.getAttribute('data-path') || '',
          rootPath: dom.getAttribute('data-root-path') || '',
          language: dom.getAttribute('data-language') || '',
          startLineNumber: Number(dom.getAttribute('data-start-line-number') || 0),
          startColumn: Number(dom.getAttribute('data-start-column') || 0),
          endLineNumber: Number(dom.getAttribute('data-end-line-number') || 0),
          endColumn: Number(dom.getAttribute('data-end-column') || 0),
          lock: dom.getAttribute('data-lock') === 'true',
        }
      },
    },
  ],
  toDOM: (node) => {
    return [
      'div',
      {
        ...ctx.get(aiCodeBlockCustomAttr.key)(node),
        'data-name': node.attrs.name,
        'data-content': node.attrs.content,
        'data-path': node.attrs.path,
        'data-root-path': node.attrs.rootPath,
        'data-language': node.attrs.language,
        'data-start-line-number': String(node.attrs.startLineNumber || 0),
        'data-start-column': String(node.attrs.startColumn || 0),
        'data-end-line-number': String(node.attrs.endLineNumber || 0),
        'data-end-column': String(node.attrs.endColumn || 0),
        'data-lock': node.attrs.lock ? 'true' : 'false',
      },
      0,
    ]
  },
  parseMarkdown: {
    match: (node) => {
      const { type, name } = node
      return type === 'textDirective' && name === 'codeBlockTag'
    },
    runner: (state, node, type) => {
      if (type.name === aiCodeBlockCustomId) {
        state
          .openNode(type, { ...(node.attributes as Attrs) })
          .next(node.children)
          .closeNode()
      }
    },
  },
  toMarkdown: {
    match: (node) => {
      return node.type.name === aiCodeBlockCustomId
    },
    runner: (state, node) => {
      state
        .openNode('textDirective', undefined, {
          name: 'codeBlockTag',
          attributes: {
            name: node.attrs.name,
            content: node.attrs.content,
            path: node.attrs.path,
            rootPath: node.attrs.rootPath,
            language: node.attrs.language,
            startLineNumber: node.attrs.startLineNumber,
            startColumn: node.attrs.startColumn,
            endLineNumber: node.attrs.endLineNumber,
            endColumn: node.attrs.endColumn,
          },
        })
        .next(node.content)
        .closeNode()
    },
  },
  attrs: {
    name: { default: '' },
    content: { default: '' },
    path: { default: '' },
    rootPath: { default: '' },
    language: { default: '' },
    startLineNumber: { default: 0 },
    startColumn: { default: 0 },
    endLineNumber: { default: 0 },
    endColumn: { default: 0 },
    lock: { default: false },
  },
}))

export const aiCodeBlockCommand = $command<AICodeBlockCommandParams, string>(
  `command-${aiCodeBlockCustomId}`,
  (ctx) => (params?: AICodeBlockCommandParams) => (state, dispatch) => {
    if (!params) return false
    const { selection, tr } = state
    if (!(selection instanceof TextSelection)) return false
    const { content, range, name, path, rootPath, language, lock } = params
    const displayText = buildCodeRefDisplayText(name, range)
    const fragment = state.schema.text(displayText)
    dispatch?.(
      tr
        .setMeta(aiCodeBlockCustomId, true)
        .replaceSelectionWith(
          aiCodeBlockCustomSchema.type(ctx).create(
            {
              name,
              content,
              path: path || '',
              rootPath: rootPath || '',
              language: language || '',
              startLineNumber: range?.startLineNumber ?? 0,
              startColumn: range?.startColumn ?? 0,
              endLineNumber: range?.endLineNumber ?? 0,
              endColumn: range?.endColumn ?? 0,
              lock: lock ?? false,
            },
            fragment,
          ),
        )
        .scrollIntoView(),
    )
    return true
  },
)

export const aiCodeBlockCustomPlugin = () => {
  return [aiCodeBlockCustomAttr, aiCodeBlockCustomSchema.node, aiCodeBlockCustomSchema.ctx, aiCodeBlockCommand]
}
