import {$command} from "@milkdown/utils"
import {convertSelectionByNode} from "./utils"
import {headingSchema} from "@milkdown/kit/preset/commonmark"
import {$prose} from "@milkdown/kit/utils"
import {Plugin, PluginKey} from "@milkdown/kit/prose/state"
import type {EditorView} from "@milkdown/prose/view"
import debounce from "lodash/debounce"

export const listToHeadingCommand = $command(
    `listToHeadingCommand`,
    (ctx) =>
        (level: number = 0) =>
        (state, dispatch) => {
            const command = convertSelectionByNode(headingSchema.type(ctx), {level})
            return command(state, dispatch)
        }
)

/**标题转正文 */
export const headingToParagraphCommand = $command(`headingToParagraphCommand`, (ctx) => () => (state, dispatch) => {
    const {$from, from, to} = state.selection
    // 检查选区是否有效
    if (from === to) {
        return false // 没有选中任何内容
    }
    const parentNode = $from.node($from.depth)
    if (parentNode && parentNode.type.name === state.schema.nodes.heading.name) {
        let textNode = state.schema.text(parentNode.textContent)
        const node = state.schema.nodes.paragraph.create(
            null,
            textNode // 使用列表项的内容填充
        )
        const start = $from.start() // 标题节点的起始位置
        const end = $from.end() // 标题节点的结束位置
        // 替换整个标题节点
        const transaction = state.tr.replaceRangeWith(start, end, node)
        if (dispatch) dispatch(transaction)
        return true
    }
    return false
})

export const customSyncHeadingIdPlugin = $prose((ctx) => {
    const headingIdPluginKey = new PluginKey("CUSTOM_MILKDOWN_HEADING_ID")
    let isComposed = false
    const updateId = debounce((view: EditorView) => {
        if (isComposed) return

        const tr = view.state.tr.setMeta("addToHistory", false)

        let found = false

        view.state.doc.descendants((node, pos) => {
            if (node.type === headingSchema.type(ctx)) {
                if (node.textContent.trim().length === 0) return

                const attrs = node.attrs
                const idString = node.textContent.length > 20 ? node.textContent.substring(0, 20) : node.textContent
                const id = Buffer.from(idString).toString("hex")
                if (attrs.id !== id) {
                    found = true
                    tr.setMeta(headingIdPluginKey, true).setNodeMarkup(pos, undefined, {
                        ...attrs,
                        id: id
                    })
                }
            }
        })

        if (found) view.dispatch(tr)
    }, 500)

    return new Plugin({
        key: headingIdPluginKey,
        view: (view) => {
            updateId(view)

            return {
                update: (view, prevState) => {
                    if (view.state.doc.eq(prevState.doc)) return
                    updateId(view)
                }
            }
        },
        props: {
            handleTextInput(view, from, to, text) {
                // 检测是否为拼音中间状态
                if (!isComposed) {
                    updateId(view)
                }
                return false // 允许正常文本插入
            },
            handleDOMEvents: {
                compositionstart: () => {
                    isComposed = true
                    return false
                },
                compositionupdate: (view, event) => {
                    isComposed = true
                    return false
                },
                compositionend: (view) => {
                    isComposed = false
                    updateId(view)
                    return false
                }
            }
        }
    })
})

export const headingCustomPlugin = () => {
    return [listToHeadingCommand, headingToParagraphCommand, customSyncHeadingIdPlugin]
}
