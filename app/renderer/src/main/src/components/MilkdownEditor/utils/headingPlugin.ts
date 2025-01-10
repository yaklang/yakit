import {$command} from "@milkdown/utils"
import {convertSelectionByNode} from "./utils"
import {headingSchema} from "@milkdown/kit/preset/commonmark"

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

export const headingCustomPlugin = () => {
    return [listToHeadingCommand, headingToParagraphCommand]
}
