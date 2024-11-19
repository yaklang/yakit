import {$command, $nodeSchema, $nodeAttr} from "@milkdown/utils"
import {Attrs} from "@milkdown/kit/prose/model"
import {TextSelection} from "@milkdown/kit/prose/state"

const fileCustomId = "file-custom"
export const fileCustomAttr = $nodeAttr("file-custom", () => ({
    "data-type": fileCustomId,
    contenteditable: "false"
}))

export const fileCustomSchema = $nodeSchema(fileCustomId, (ctx) => ({
    inline: true,
    group: "inline",
    content: "",
    atom: true,
    draggable: false,
    isolating: true, // 阻止其他节点进入这个节点,
    // 从 DOM 中解析节点，动态设置属性
    parseDOM: [
        {
            tag: `div[data-type='${fileCustomId}']`,
            getAttrs: (dom) => {
                return {fileId: dom.getAttribute("data-file-id")}
            }
        }
    ],

    // 将节点转为 DOM 结构，动态设置样式
    toDOM: (node) => {
        // console.log("toDOM", node)
        return ["div", 0]
    },

    parseMarkdown: {
        match: (node) => {
            const {type, name} = node
            // console.log("parseMarkdown-match", node)
            return type === "textDirective" && name === "file"
        },
        runner: (state, node, type) => {
            // console.log("parseMarkdown-runner", node)
            if (type.name === fileCustomId) {
                state
                    .openNode(type, {...(node.attributes as Attrs)})
                    .next(node.children)
                    .closeNode()
            }
        }
    },

    toMarkdown: {
        match: (node) => {
            // console.log("toMarkdown-match", node)
            return node.type.name === fileCustomId
        },
        runner: (state, node) => {
            // console.log("toMarkdown-runner", node)
            state
                .openNode("textDirective", undefined, {
                    name: "file",
                    attributes: {
                        fileId: node.attrs.fileId
                    }
                })
                .next(node.content)
                .closeNode()
        }
    },
    attrs: {
        fileId: {default: "0"},
        path: {default: ""}
    }
}))

export const fileCommand = $command(`command-${fileCustomId}`, (ctx) => (props) => (state, dispatch) => {
    const {selection, tr} = state
    if (!(selection instanceof TextSelection)) return false

    const {from, to} = selection
    const fragment = state.doc.slice(from, to).content // 获取 Fragment
    dispatch?.(
        tr
            .setMeta(fileCustomId, true)
            .replaceSelectionWith(fileCustomSchema.type(ctx).create(props as Attrs, fragment))
            .scrollIntoView()
    )
    return true
})

export const uploadCustomPlugin = () => {
    return [fileCustomAttr, fileCustomSchema.node, fileCustomSchema.ctx, fileCommand]
}
