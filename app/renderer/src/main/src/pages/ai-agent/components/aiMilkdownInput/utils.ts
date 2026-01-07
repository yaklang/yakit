import {EditorMilkdownProps} from "@/components/MilkdownEditor/MilkdownEditorType"
import {editorViewCtx, parserCtx} from "@milkdown/kit/core"
import {AIMentionCommandParams, aiMentionCustomId} from "./aiMilkdownMention/aiMentionPlugin"

/**md编辑器中匹配出提及相关数据/纯文本 */
export const extractDataWithMilkdown = (editor: EditorMilkdownProps) => {
    const mentions: AIMentionCommandParams[] = []
    let plainText = ""
    editor.action((ctx) => {
        const view = ctx.get(editorViewCtx)
        const state = view.state
        const doc = state.doc

        // 遍历文档树
        doc.descendants((node) => {
            if (node.type.name === aiMentionCustomId) {
                mentions.push({
                    ...(node.attrs as AIMentionCommandParams)
                })
            }
        })
        plainText = doc.textBetween(0, doc.content.size, "\n\n")
    })
    return {mentions, plainText}
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
