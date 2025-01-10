import {$command, $nodeSchema, $nodeAttr, $remark} from "@milkdown/utils"

import {wrappingInputRule} from "@milkdown/prose/inputrules"
import {$inputRule} from "@milkdown/kit/utils"
import {wrapIn} from "@milkdown/kit/prose/commands"
import directive from "remark-directive"
import {Node} from "@milkdown/kit/prose/model"

const alterCustomId = "alter-custom"
const alterCustomAttr = $nodeAttr("alter-custom", () => ({"data-type": alterCustomId}))
const customTypes = ["danger", "success", "tip", "note", "warning", "caution"]

// warning caution
// danger
// success tip
// note
const rule = /:::(danger|success|tip|note|warning|caution)(\s|\n)/

export const alterCustomSchema = $nodeSchema(alterCustomId, (ctx) => ({
    group: "block",
    content: `block*`,
    atom: true,
    // 从 DOM 中解析节点，动态设置属性
    parseDOM: [
        {
            tag: `div[data-type='${alterCustomId}']`,
            getAttrs: (dom) => {
                return {type: dom.getAttribute("data-custom-type")}
            }
        }
    ],

    // 将节点转为 DOM 结构，动态设置样式
    toDOM: (node) => {
        const type = node.attrs.type
        const className = `alter-custom alter-custom-${type}`
        return ["div", {...ctx.get(alterCustomAttr.key)(node), class: className, "data-custom-type": type}, 0] // 0表示内嵌内容节点
    },

    parseMarkdown: {
        match: (node) => {
            const {type, name} = node
            return type === "containerDirective" && customTypes.includes(name as string)
        },
        runner: (state, node, type) => {
            if (type.name === alterCustomId) {
                state.openNode(type, {type: node.name}).next(node.children).closeNode()
            }
        }
    },
    toMarkdown: {
        match: (node) => node.type.name === alterCustomId,
        runner: (state, node) => {
            const type = node.attrs.type
            state
                .openNode("containerDirective", undefined, {
                    name: `${type}`
                })
                .next(node.content)
                .closeNode()
        }
    },
    attrs: {
        type: {default: "tip"}
    }
}))

const alterInputRule = $inputRule((ctx) => {
    return wrappingInputRule(rule, alterCustomSchema.type(ctx), (match) => ({type: match[1]}))
})

export const alterCommand = $command(
    `command-${alterCustomId}`,
    (ctx) => (type) =>
        wrapIn(alterCustomSchema.type(ctx), {
            type
        })
)

export const alterToParagraphCommand = $command(`alterToParagraphCommand`, (ctx) => () => {
    return (state, dispatch) => {
        const {from, to} = state.selection
        // 检查选区是否有效
        if (from === to) {
            return false // 没有选中任何内容
        }
        // 获取当前选中的节点
        const selectedNode = state.doc.nodeAt(from)
        if (selectedNode && selectedNode.type.name === alterCustomId) {
            // 创建新的内容节点，将子节点放入新的结构中
            const content = selectedNode.content as any as Node
            const transaction = state.tr.replaceRangeWith(from, to, content)
            if (dispatch) dispatch(transaction)
            return true // 命令成功执行
        }

        return false // 命令未成功执行
    }
})

const remarkDirective = $remark(`remark-directive`, () => directive)

export const alterCustomPlugin = () => {
    return [
        ...remarkDirective,
        alterCustomAttr,
        alterCustomSchema.node,
        alterCustomSchema.ctx,
        alterInputRule,
        alterCommand,
        alterToParagraphCommand
    ]
}
