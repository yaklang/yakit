import {NodeType, Attrs} from "@milkdown/kit/prose/model"
import {Command, Transaction} from "@milkdown/kit/prose/state"
import {findWrapping} from "@milkdown/kit/prose/transform"

export const clearContentAndSetBlockType = (nodeType: NodeType, attrs: Attrs | null = null): Command => {
    return (state, dispatch) => {
        if (dispatch) {
            const tr = setBlockType(clearRange(state.tr), nodeType, attrs)
            dispatch(tr.scrollIntoView())
        }
        return true
    }
}

const setBlockType = (tr: Transaction, nodeType: NodeType, attrs: Attrs | null = null) => {
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

const addBlockType = (tr: Transaction, nodeType: NodeType, attrs: Attrs | null = null) => {
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
