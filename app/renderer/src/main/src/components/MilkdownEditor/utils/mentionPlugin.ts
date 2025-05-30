import {$command, $nodeSchema, $nodeAttr} from "@milkdown/utils"
import {Attrs} from "@milkdown/kit/prose/model"
import {TextSelection} from "@milkdown/kit/prose/state"
import {v4 as uuidv4} from "uuid"
import moment from "moment"

export const mentionCustomId = "mention-custom"

const mentionCustomAttr = $nodeAttr("mention-custom", () => ({"data-type": mentionCustomId, "data-user-name": ""}))

export const mentionCustomSchema = $nodeSchema(mentionCustomId, (ctx) => ({
    inline: true,
    group: "inline",
    content: "text*",
    atom: true,
    // 从 DOM 中解析节点，动态设置属性
    parseDOM: [
        {
            tag: `div[data-type='${mentionCustomId}']`,
            getAttrs: (dom) => {
                return {
                    mentionId: dom.getAttribute("data-mention-id"),
                    userName: dom.getAttribute("data-user-name"),
                    userId: dom.getAttribute("data-user-id")
                }
            }
        }
    ],

    // 将节点转为 DOM 结构，动态设置样式
    toDOM: (node) => {
        const className = `mention-custom`
        return [
            "div",
            {
                ...ctx.get(mentionCustomAttr.key)(node),
                class: className,
                "data-mention-id": getMentionId(),
                "data-user-name": node.attrs.userName,
                "data-user-id": node.attrs.userId
            },
            0
        ]
    },

    parseMarkdown: {
        match: (node) => {
            const {type, name} = node
            return type === "textDirective" && name === "mention"
        },
        runner: (state, node, type) => {
            if (type.name === mentionCustomId) {
                state
                    .openNode(type, {...(node.attributes as Attrs)})
                    .next(node.children)
                    .closeNode()
            }
        }
    },

    toMarkdown: {
        match: (node) => {
            return node.type.name === mentionCustomId
        },
        runner: (state, node) => {
            state
                .openNode("textDirective", undefined, {
                    name: "mention",
                    attributes: {
                        mentionId: node.attrs.mentionId,
                        userName: node.attrs.userName,
                        userId: node.attrs.userId
                    }
                })
                .next(node.content)
                .closeNode()
        }
    },
    attrs: {
        mentionId: {default: "0"},
        userName: {default: ""},
        userId: {default: ""}
    }
}))

/**生成提及单个组件id，用于跳转 */
export const getMentionId = () => {
    return `mention-${uuidv4()}-${moment().valueOf()}`
}
export const mentionCommand = $command(`command-${mentionCustomId}`, (ctx) => (params) => (state, dispatch) => {
    const {selection, tr} = state
    if (!(selection instanceof TextSelection)) return false
    const {userName, userId, mentionId} = params as {userName: string; userId: string; mentionId?: string}
    const {from} = selection
    tr.deleteRange(from - 1, from)
    const fragment = state.schema.text(`@${userName}`)
    dispatch?.(
        tr
            .setMeta(mentionCustomId, true)
            .replaceSelectionWith(
                mentionCustomSchema
                    .type(ctx)
                    .create({mentionId: mentionId || getMentionId(), userName, userId}, fragment)
            )
            .scrollIntoView()
    )
    return true
})

export const mentionCustomPlugin = () => {
    return [mentionCustomAttr, mentionCustomSchema.node, mentionCustomSchema.ctx, mentionCommand]
}
