import {$command, $nodeSchema, $nodeAttr} from "@milkdown/utils"
import {setBlockType, wrapIn} from "@milkdown/kit/prose/commands"
import {$inputRule, $remark} from "@milkdown/kit/utils"
import {wrappingInputRule} from "@milkdown/prose/inputrules"
import directive from "remark-directive"
import {Attrs, MarkType} from "@milkdown/kit/prose/model"
import {Selection, TextSelection} from "@milkdown/kit/prose/state"
import {nodeViewCtx} from "@milkdown/kit/core"
import {setWrapInBlockType} from "../Tooltip/utils"
import {headingSchema} from "@milkdown/kit/preset/commonmark"

const commentCustomId = "comment-custom"
const commentCustomAttr = $nodeAttr("comment-custom", () => ({"data-type": commentCustomId}))

const commentCustomSchema = $nodeSchema(commentCustomId, (ctx) => ({
    inline: true,
    group: "inline",
    content: 'text*',
    atom: true,
    // 从 DOM 中解析节点，动态设置属性
    parseDOM: [
        {
            tag: `span[data-type='${commentCustomId}']`,
            getAttrs: (dom) => {
                return {commentId: dom.getAttribute("data-comment-id")}
            }
        }
    ],

    // 将节点转为 DOM 结构，动态设置样式
    toDOM: (node) => {
        const id = node.attrs.commentId
        const className = `comment-custom`
        return [
            "span",
            {
                ...ctx.get(commentCustomAttr.key)(node),
                class: className,
                "data-comment-id": id
            },
            0
        ]
    },

    parseMarkdown: {
        match: (node) => {
            const {type, name} = node
            return type === "textDirective" && name === "comment"
        },
        runner: (state, node, type) => {
            if (type.name === commentCustomId) {
                state
                    .openNode(type, {...(node.attributes as Attrs)})
                    .next(node.children)
                    .closeNode()
            }
        }
    },

    toMarkdown: {
        match: (node) => {
            return node.type.name === commentCustomId
        },
        runner: (state, node) => {
            state
                .openNode("textDirective", undefined, {
                    name: "comment",
                    attributes: {
                        commentId: node.attrs.commentId
                    }
                })
                .next(node.content)
                .closeNode()
        }
    },
    attrs: {
        commentId: {default: "0"}
    }
}))

export const commentCommand = $command(`command-${commentCustomId}`, (ctx) => (id) => (state, dispatch) => {
    const {selection, tr} = state
    if (!(selection instanceof TextSelection)) return false

    const {from, to} = selection
    const fragment = state.doc.slice(from, to).content // 获取 Fragment
    dispatch?.(
        tr
            .setMeta(commentCustomId, true)
            .replaceSelectionWith(commentCustomSchema.type(ctx).create({commentId: id}, fragment))
            .scrollIntoView()
    )
    return true
})

export const commentPlugin = () => {
    return [commentCustomAttr, commentCustomSchema.node, commentCustomSchema.ctx, commentCommand]
}
