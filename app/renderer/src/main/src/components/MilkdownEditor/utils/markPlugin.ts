import {$markAttr, $markSchema, $nodeSchema, $nodeAttr} from "@milkdown/kit/utils"
import {v4 as uuidv4} from "uuid"

const markId = "mark-height-text"
const markMarkAttr = $markAttr(markId)

const markSchema = $markSchema(markId, (ctx) => ({
    parseDOM: [
        {
            tag: `mark[data-markjs=true]`,
            getAttrs: (dom) => {
                const id = uuidv4()
                const attr = {
                    id: dom.getAttribute("id") || id,
                    class: dom.getAttribute("class")
                }
                return dom.nodeName === "MARK"
                    ? {
                          ...attr
                      }
                    : {}
            }
        }
    ],
    attrs: {
        "data-markjs": {default: "true"},
        class: {default: ""},
        id: {default: ""}
    },
    toDOM: (mark) => {
        let attrs = {
            ...mark.attrs
        }
        const target = document.getElementById(mark.attrs.id!)!
        if (target) {
            attrs = {
                ...attrs,
                class: target.getAttribute("class")
            }
        }
        return ["mark", {...ctx.get(markMarkAttr.key)(mark), ...attrs}]
    },
    parseMarkdown: {
        match: (node) => {
            return node.type === "textDirective" && node.name === "mark"
        },
        runner: (state, node, markType) => {
            if (markType.name === markId) {
                state.addText("")
            }
        }
    },

    toMarkdown: {
        match: (mark) => {
            return mark.type.name === markId
        },
        runner: (state, mark, node) => {
            state.addNode("text", undefined, "")
        }
    }
}))

export const markCustomPlugin = () => [markMarkAttr, markSchema.mark, markSchema.ctx]
