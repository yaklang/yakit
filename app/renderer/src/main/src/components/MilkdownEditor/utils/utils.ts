import {yakitNotify} from "@/utils/notification"
import {NodeType, Attrs} from "@milkdown/kit/prose/model"
import {Command, Transaction} from "@milkdown/kit/prose/state"
import {findWrapping} from "@milkdown/kit/prose/transform"

export const clearContentAndSetBlockType = (nodeType: NodeType, attrs: Attrs | null = null): Command => {
    return (state, dispatch) => {
        if (dispatch) {
            const tr = setBlockTypeCustom(clearRange(state.tr), nodeType, attrs)
            dispatch(tr.scrollIntoView())
        }
        return true
    }
}

const setBlockTypeCustom = (tr: Transaction, nodeType: NodeType, attrs: Attrs | null = null) => {
    const {from, to} = tr.selection
    return tr.setBlockType(from, to, nodeType, attrs)
}

const clearRange = (tr: Transaction) => {
    const {$from, $to} = tr.selection
    const {pos: from} = $from
    const {pos: to} = $to
    tr = tr.deleteRange(from - $from.node().content.size, to)
    return tr
}

export const clearContentAndAddBlockType = (nodeType: NodeType, attrs: Attrs | null = null): Command => {
    return (state, dispatch) => {
        const tr = addBlockType(clearRange(state.tr), nodeType, attrs)
        if (!tr) return false

        if (dispatch) dispatch(tr.scrollIntoView())

        return true
    }
}

export const addBlockType = (tr: Transaction, nodeType: NodeType, attrs: Attrs | null = null) => {
    const node = nodeType.createAndFill(attrs)
    if (!node) return null

    return tr.replaceSelectionWith(node)
}

export const setWrapInBlockType = (nodeType: NodeType, attrs: Attrs | null = null): Command => {
    return (state, dispatch) => {
        const tr = wrapInBlockType(state.tr, nodeType, attrs)
        if (!tr) return false

        if (dispatch) dispatch(tr.scrollIntoView())

        return true
    }
}

const wrapInBlockType = (tr: Transaction, nodeType: NodeType, attrs: Attrs | null = null) => {
    const {$from, $to} = tr.selection

    const range = $from.blockRange($to)
    const wrapping = range && findWrapping(range, nodeType, attrs)
    if (!wrapping) return null

    return tr.wrap(range, wrapping)
}

export const clearContentAndWrapInBlockType = (nodeType: NodeType, attrs: Attrs | null = null): Command => {
    return (state, dispatch) => {
        const tr = wrapInBlockType(clearRange(state.tr), nodeType, attrs)
        if (!tr) return false

        if (dispatch) dispatch(tr.scrollIntoView())

        return true
    }
}

/**
 * @description 将选区转换为指定节点类型,未做更多的适配
 * @param nodeType
 * @param attrs
 * @returns {boolean}
 */
export const convertSelectionByNode = (nodeType: NodeType, attrs: Attrs | null = null): Command => {
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
                let textNode = state.schema.text(parentNode.textContent)
                if (parentNode.attrs?.listType === "ordered" && nodeType.name === state.schema.nodes.heading.name) {
                    // 有序列表转为标题的时候需要把序号带上
                    textNode = state.schema.text(`${parentNode.attrs.label || ""}${parentNode.textContent}`)
                }

                // 创建新的节点，并用它替换列表项
                const node = state.schema.nodes[nodeType.name].create(
                    attrs, // attrs属性
                    textNode // 使用列表项的内容填充
                )

                // 使用 transaction 将列表项替换为
                const tr = state.tr.replaceRangeWith($from.before(-1), $from.after(-1), node)

                if (dispatch) dispatch(tr)

                return true
            }
            return false
        } catch (error) {
            yakitNotify("error", `[${nodeType.name}]convertSelectionByNode执行失败:${error}`)
            return false
        }
    }
}
