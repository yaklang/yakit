import {$markSchema, $command} from "@milkdown/utils"
import {toggleMark} from "@milkdown/prose/commands"
import {$inputRule, $markAttr, $nodeAttr, $nodeSchema, $remark} from "@milkdown/kit/utils"
import directive from "remark-directive"
import {remarkStringifyOptionsCtx} from "@milkdown/kit/core"
import {markRule} from "@milkdown/kit/prose"

const underlineId = "underline"
const underlineMarkAttr = $markAttr(underlineId)

const underlineSchema = $markSchema(underlineId, (ctx) => ({
    parseDOM: [
        {
            tag: `u`,
            getAttrs: (dom) => {
                // 确保从 DOM 中提取属性并且解析 <u> 标签为 underline mark
                return dom.nodeName === "U" ? {} : false
            }
        }
    ],

    toDOM: (mark) => {
        return ["u", {...ctx.get(underlineMarkAttr.key)(mark), ...mark.attrs}]
    },
    parseMarkdown: {
        match: (node) => {
            return node.type === "textDirective" && node.name === "u"
        },
        runner: (state, node, markType) => {
            if (markType.name === underlineId) {
                state.openMark(markType).next(node.children).closeMark(markType)
            }
        }
    },

    toMarkdown: {
        match: (mark) => {
            return mark.type.name === underlineId
        },
        runner: (state, mark) => {
            state.withMark(mark, "textDirective", undefined, {
                name: "u",
                attributes: {
                    marker: mark.attrs.marker
                }
            })
        }
    }
}))
//  /(<u>(.*?)<\/u>|:u\[(.+?)\])/   /<u>(.*?)<\/u>/
const underlineInputRule = $inputRule((ctx) => {
    return markRule(/:u\[(.+?)\]/, underlineSchema.type(ctx))
})

export const underlineCommand = $command("toggleUnderlineCommand", (ctx) => () => toggleMark(underlineSchema.type(ctx)))
export const underlineCustomPlugin = () => [
    underlineMarkAttr,
    underlineSchema.mark,
    underlineSchema.ctx,
    underlineCommand,
    underlineInputRule
]
