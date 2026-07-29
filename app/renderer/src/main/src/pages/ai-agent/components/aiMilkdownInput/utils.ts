import { EditorMilkdownProps } from '@/components/MilkdownEditor/MilkdownEditorType'
import { editorViewCtx, parserCtx } from '@milkdown/kit/core'
import { AIMentionCommandParams, aiMentionCustomId } from './aiMilkdownMention/aiMentionPlugin'
import { AIHttpFlowCommandParams, aiHttpFlowCustomId } from './aiMilkdownHttpFlow/aiHttpFlowPlugin'
import { AICodeBlockCommandParams, aiCodeBlockCustomId } from './aiCodeBlock/aiCustomCodeBlockPlugin'
import { AIChatIPCStartParams } from '@/pages/ai-re-act/hooks/type'
import { imgTypes } from '@/components/MilkdownEditor/utils/utils'

/**md编辑器中匹配出提及相关数据/纯文本 */
export const extractDataWithMilkdown = (editor: EditorMilkdownProps) => {
  const mentions: AIMentionCommandParams[] = []
  const httpFlowList: AIHttpFlowCommandParams[] = []
  const codeBlockList: AICodeBlockCommandParams[] = []
  const imageList: string[] = []
  let plainText = ''
  editor?.action &&
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      const state = view?.state
      const doc = state?.doc

      // 遍历文档树
      doc.descendants((node) => {
        if (node?.type?.name === aiMentionCustomId) {
          mentions.push({
            ...(node.attrs as AIMentionCommandParams),
          })
        }
        if (node?.type?.name === aiHttpFlowCustomId) {
          httpFlowList.push({
            ...(node.attrs as AIHttpFlowCommandParams),
          })
        }
        if (node?.type?.name === aiCodeBlockCustomId) {
          const attrs = node.attrs as AICodeBlockCommandParams & {
            startLineNumber?: number
            startColumn?: number
            endLineNumber?: number
            endColumn?: number
          }
          const range =
            attrs.startLineNumber || attrs.endLineNumber
              ? {
                  startLineNumber: Number(attrs.startLineNumber || 0),
                  startColumn: Number(attrs.startColumn || 0),
                  endLineNumber: Number(attrs.endLineNumber || 0),
                  endColumn: Number(attrs.endColumn || 0),
                }
              : null
          codeBlockList.push({
            content: attrs.content || '',
            range,
            name: attrs.name || '',
            language: attrs.language || '',
            path: attrs.path,
            rootPath: attrs.rootPath || '',
          })
        }
        if (node?.type?.name === state?.schema?.nodes?.image?.name) {
          const src = node.attrs.src
          if (src) {
            imageList.push(src)
          }
        }
      })
      plainText = doc.textBetween(0, doc?.content?.size, '\n\n')
    })
  return { mentions, plainText, imageList, httpFlowList, codeBlockList }
}

type Mention = {
  text: string
  mentionId: string
  mentionType: string
  mentionName: string
}
export const parseMentions = (markdown: string): Mention[] => {
  const result: Mention[] = []

  const mentionRegex = /:mention\[([^\]]+)\]\{([^}]+)\}/g
  let match: RegExpExecArray | null

  while ((match = mentionRegex.exec(markdown))) {
    const text = match[1]
    const attrs = match[2]

    const attrMap: Record<string, string> = {}

    attrs.replace(/(\w+)="([^"]*)"/g, (_, key, value) => {
      attrMap[key] = value
      return ''
    })

    result.push({
      text,
      mentionId: attrMap.mentionId,
      mentionType: attrMap.mentionType,
      mentionName: attrMap.mentionName,
    })
  }

  return result
}

/**设置编辑器内容 */
export const setEditorValue = (editor: EditorMilkdownProps, value: string) => {
  editor?.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const parser = ctx.get(parserCtx)

    const doc = parser(value)
    if (!doc) return

    const tr = view.state.tr
    tr.replaceWith(0, view.state.doc.content.size, doc)
    view.dispatch(tr)
  })
}

export interface AIInputWithParamsTemplate {
  description: string
  param: AIChatIPCStartParams['extraValue']
}
/**
 *
 * @param data AI输入命令参数
 * @returns markdown字符串，
 */
export const aiInputWithParamsTemplate = (data: AIInputWithParamsTemplate) => {
  if (!data) return ''
  return `${data.description || ''}
\`\`\`
${JSON.stringify(data.param || {}, null, 2)}
\`\`\`
  `
}

export const getAIImageSuffix = () => {
  return imgTypes.map((ext) => ext.slice(1))
}
