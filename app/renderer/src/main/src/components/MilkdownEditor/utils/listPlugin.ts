import {$command} from "@milkdown/utils"
import {yakitNotify} from "@/utils/notification"

export const listToParagraphCommand = $command(`listToParagraphCommand`, (ctx) => () => {
    return (state, dispatch) => {
        try {
            const {$from, from, to} = state.selection
            // 检查选区是否有效
            if (from === to) {
                return false // 没有选中任何内容
            }
            // 获取父节点类型
            const parentNode = $from.node(-1) // 使用 -1 获取上一级节点
            if (parentNode && parentNode.type.name === state.schema.nodes.list_item.name) {
                const textNode = state.schema.text(parentNode.textContent)

                // 创建新的段落节点，并用它替换列表项
                const paragraphNode = state.schema.nodes.paragraph.create(
                    null, // 无需额外属性
                    textNode // 使用列表项的内容填充段落
                )

                // 使用 transaction 将列表项替换为段落
                const tr = state.tr.replaceRangeWith($from.before(-1), $from.after(-1), paragraphNode)

                if (dispatch) dispatch(tr)
                return true // 命令成功执行
            }

            return false // 命令未成功执行
        } catch (error) {
            yakitNotify("error", `listToParagraphCommand执行失败:${error}`)
            return false
        }
    }
})

export const listCustomPlugin = () => {
    return [listToParagraphCommand]
}
