import {$command} from "@milkdown/utils"
import {yakitNotify} from "@/utils/notification"
import {headingSchema, paragraphSchema} from "@milkdown/kit/preset/commonmark"
import {setBlockType} from "@milkdown/prose/commands"

export const listToHeadingCommand = $command(
    `headingToParagraphCommand`,
    (ctx) =>
        (level: number = 0) =>
        (state, dispatch) => {
            try {
                const {$from, from, to} = state.selection
                // 检查选区是否有效
                if (from === to) {
                    return false // 没有选中任何内容
                }
                // 获取父节点类型
                const parentNode = $from.node(-1) // 使用 -1 获取上一级节点
                if (parentNode && parentNode.type.name === state.schema.nodes.list_item.name) {
                    const textNode = state.schema.text(`${parentNode.attrs.label || ""}${parentNode.textContent}`)
                    // 创建新的标题节点，并用它替换列表项
                    const headerNode = state.schema.nodes.heading.create(
                        {level}, // 无需额外属性
                        textNode // 使用列表项的内容填充标题
                    )

                    // 使用 transaction 将列表项替换为标题
                    const tr = state.tr.replaceRangeWith($from.before(-1), $from.after(-1), headerNode)

                    if (dispatch) dispatch(tr)

                    return true
                }

                return false
            } catch (error) {
                yakitNotify("error", `headingToParagraphCommand执行失败:${error}`)
                return false
            }
        }
)

export const headingCustomPlugin = () => {
    return [listToHeadingCommand]
}
