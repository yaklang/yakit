import {$ctx, $prose} from "@milkdown/kit/utils"
import type {EditorState, Selection} from "@milkdown/kit/prose/state"
import {Plugin, PluginKey} from "@milkdown/kit/prose/state"
import type {Node} from "@milkdown/kit/prose/model"
import {Decoration, DecorationSet} from "@milkdown/kit/prose/view"
import {findParent} from "@milkdown/kit/prose"
import type {Editor} from "@milkdown/kit/core"

type DefineFeature<Config = unknown> = (editor: Editor, config?: Config) => void | Promise<void>

const isInCodeBlock = (selection: Selection) => {
    const type = selection.$from.parent.type
    return type.name === "code_block"
}

const isInList = (selection: Selection) => {
    const type = selection.$from.node(selection.$from.depth - 1)?.type
    return type?.name === "list_item"
}

const isDocEmpty = (doc: Node) => {
    return doc.childCount <= 1 && !doc.firstChild?.content.size
}

function createPlaceholderDecoration(state: EditorState, placeholderText: string): Decoration | null {
    const {selection} = state
    if (!selection.empty) return null

    const $pos = selection.$anchor
    const node = $pos.parent
    if (node.content.size > 0) return null

    const inTable = findParent((node) => node.type.name === "table")($pos)
    if (inTable) return null

    const before = $pos.before()

    return Decoration.node(before, before + node.nodeSize, {
        class: "crepe-placeholder",
        "data-placeholder": placeholderText
    })
}

interface PlaceholderConfig {
    text: string
    mode: "doc" | "block"
}

export type PlaceHolderFeatureConfig = Partial<PlaceholderConfig>

export const placeholderConfig = $ctx(
    {
        text: "Please enter...",
        mode: "block"
    } as PlaceholderConfig,
    "placeholderConfigCtx"
)

export const placeholderPlugin = $prose((ctx) => {
    return new Plugin({
        key: new PluginKey("CREPE_PLACEHOLDER"),
        props: {
            decorations: (state) => {
                const config = ctx.get(placeholderConfig.key)
                if (config.mode === "doc" && !isDocEmpty(state.doc)) return null

                if (isInCodeBlock(state.selection) || isInList(state.selection)) return null

                const placeholderText = config.text ?? "Please enter..."
                const deco = createPlaceholderDecoration(state, placeholderText)
                if (!deco) return null

                return DecorationSet.create(state.doc, [deco])
            }
        }
    })
})

