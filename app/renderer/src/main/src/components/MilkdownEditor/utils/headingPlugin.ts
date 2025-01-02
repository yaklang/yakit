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
    if (parentNode.type.name === state.schema.nodes.heading.name) {
        let textNode = state.schema.text(parentNode.textContent)
        // 创建新的节点，并用它替换列表项
        const node = state.schema.nodes.paragraph.create(
            null,
            textNode // 使用列表项的内容填充
        )

        // 替换整个标题节点
        const tr = state.tr.replaceRangeWith(from, to, node)

        if (dispatch) dispatch(tr)

        return true
    }
    return false
})

export const headingCustomPlugin = () => {
    return [listToHeadingCommand, headingToParagraphCommand]
}
