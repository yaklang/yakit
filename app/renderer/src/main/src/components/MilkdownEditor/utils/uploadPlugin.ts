import {$command, $nodeSchema, $nodeAttr} from "@milkdown/utils"
import {Attrs} from "@milkdown/kit/prose/model"
import {TextSelection} from "@milkdown/kit/prose/state"

export const fileCustomId = "file-custom"
export const fileCustomAttr = $nodeAttr("file-custom", () => ({
    "data-type": fileCustomId,
    contenteditable: "false"
}))

export const fileCustomSchema = $nodeSchema(fileCustomId, (ctx) => ({
    group: "block",
    content: "",
    atom: true,
    draggable: false,
    isolating: true, // 阻止其他节点进入这个节点,
    // 从 DOM 中解析节点，动态设置属性
    parseDOM: [
        {
            tag: `div[data-type='${fileCustomId}']`,
            getAttrs: (dom) => {
                return {
                    fileId: dom.getAttribute("data-file-id"),
                    path: dom.getAttribute("data-path"),
                    notepadHash: dom.getAttribute("data-notepad-hash"),
                    uploadUserId: dom.getAttribute("data-upload-user-id") || 0
                }
            }
        }
    ],

    // 将节点转为 DOM 结构，动态设置样式
    toDOM: (node) => {
        const attrs = {
            ...ctx.get(fileCustomAttr.key)(node),
            "data-file-id": node.attrs.fileId,
            "data-path": node.attrs.path,
            "data-notepad-hash": node.attrs.notepadHash,
            "data-upload-user-id": node.attrs.uploadUserId
        }
        return ["div", {...attrs}]
    },

    parseMarkdown: {
        match: (node) => {
            const {type, name} = node
            return type === "containerDirective" && name === "file"
        },
        runner: (state, node, type) => {
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
            return node.type.name === fileCustomId
        },
        runner: (state, node) => {
            if (node.attrs.fileId) {
                state
                    .openNode("containerDirective", undefined, {
                        name: "file",
                        attributes: {
                            fileId: node.attrs.fileId,
                            notepadHash: node.attrs.notepadHash,
                            path: node.attrs.path,
                            uploadUserId: node.attrs.uploadUserId
                        }
                    })
                    .next(node.content)
                    .closeNode()
            }
        }
    },
    attrs: {
        fileId: {default: "0"},
        path: {default: ""},
        notepadHash: {default: ""},
        uploadUserId: {default: 0}
    }
}))

export const fileCommand = $command(`command-${fileCustomId}`, (ctx) => (props: any) => (state, dispatch) => {
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
