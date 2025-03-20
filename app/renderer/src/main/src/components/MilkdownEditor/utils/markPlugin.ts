import {randomString} from "@/utils/randomUtil"
import {$markAttr, $markSchema} from "@milkdown/kit/utils"

const markId = "mark-height-text"
const markMarkAttr = $markAttr(markId)

const markSchema = $markSchema(markId, (ctx) => ({
    parseDOM: [
        {
            tag: `mark[data-markjs=true]`,
            getAttrs: (dom) => {
                return dom.nodeName === "MARK"
                    ? {
                          class: dom.getAttribute("class"),
                          id: randomString(4)
                      }
                    : {
                          id: randomString(4)
                      }
            }
        }
    ],
    attrs: {
        "data-markjs": {default: "true"},
        class: {default: ""},
        id: {default: ""}
    },
    toDOM: (mark) => {
        return ["mark", {...ctx.get(markMarkAttr.key)(mark), ...mark.attrs}]
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
