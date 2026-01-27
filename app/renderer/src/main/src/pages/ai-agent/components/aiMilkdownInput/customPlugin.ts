import {Ctx} from "@milkdown/kit/ctx"
import {prosePluginsCtx} from "@milkdown/kit/core"
import {Plugin, PluginKey} from "prosemirror-state"
import {TextSelection} from "prosemirror-state"
import {$command} from "@milkdown/kit/utils"

/** 阻止删除 lock mention 的 ProseMirror 插件 */
const preventDeleteLockedMentionPMPlugin = new Plugin({
    key: new PluginKey("prevent-delete-locked-mention"),
    props: {
        handleKeyDown(view, event) {
            if (event.key !== "Backspace" && event.key !== "Delete") return false

            const {state} = view
            const {selection} = state
            if (!(selection instanceof TextSelection)) return false
            if (!selection.empty) return false

            const $pos = state.doc.resolve(selection.from)

            if (event.key === "Backspace") {
                const nodeBefore = $pos.nodeBefore
                if (nodeBefore?.attrs?.lock === true) {
                    event.preventDefault()
                    return true
                }
            }

            if (event.key === "Delete") {
                const nodeAfter = $pos.nodeAfter
                if (nodeAfter?.attrs?.lock === true) {
                    event.preventDefault()
                    return true
                }
            }

            return false
        }
    }
})

/** Milkdown 插件：注入 ProseMirror Plugin */
export const preventDeleteLockedMentionPlugin = () => {
    return (ctx: Ctx) => {
        ctx.update(prosePluginsCtx, (plugins) => [...plugins, preventDeleteLockedMentionPMPlugin])
        return () => {}
    }
}

/** 移除一个偏移量 */
export const removeAIOffsetCommand = $command(`command-remove-offset`, (ctx) => () => (state, dispatch) => {
    const {selection, tr} = state
    if (!(selection instanceof TextSelection)) return false
    const {from} = selection
    tr.deleteRange(from - 1, from)
    dispatch?.(tr.scrollIntoView())
    return true
})

/** 你的自定义插件集合 */
export const aiCustomPlugin = () => {
    return [
        removeAIOffsetCommand,
        preventDeleteLockedMentionPlugin() // ✅ 注意：调用
    ]
}
