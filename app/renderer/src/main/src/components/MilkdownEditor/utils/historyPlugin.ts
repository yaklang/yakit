import {$markSchema} from "@milkdown/kit/utils"
import {imageBlockSchema} from "@milkdown/kit/component/image-block"
import {codeBlockSchema} from "@milkdown/kit/preset/commonmark"
import {YChangeProps} from "../YChange/YChangeType"

/**
 * @param {YChangeProps} ychange
 * @returns
 */
export const calcYChangeStyle = (ychange: YChangeProps) => {
    if (!ychange.color) return ""
    switch (ychange.type) {
        case "removed":
            return `color:${ychange.color.dark}`
        case "added":
            return `background-color:${ychange.color.light}`
        default:
            return ""
    }
}

export const getYChangeType = (type: YChangeProps["type"]) => {
    switch (type) {
        case "removed":
            return "删除"
        case "added":
            return "添加"
        default:
            return ""
    }
}

/**
 * @param {YChangeProps} ychange
 * @param {Array<any>}
 */
export const hoverWrapper = (ychange: YChangeProps, els) => {
    const type = ychange ? getYChangeType(ychange.type) : ""
    return ychange === null
        ? els
        : [
              [
                  "span",
                  {class: "ychange-hover", style: `background-color:${ychange.color?.dark}`},
                  type ? `${ychange.user}  ${type}` : `${ychange.user}` || "Unknown"
              ],
              ["span", ...els]
          ]
}

const ychangeSchema = $markSchema("ychange", (ctx) => ({
    attrs: {
        user: {default: null},
        type: {default: null},
        color: {default: null}
    },
    inclusive: false,
    parseDOM: [
        {
            tag: `ychange`
        }
    ],

    toDOM(node) {
        return [
            "ychange",
            {
                ychange_user: node.attrs.user,
                ychange_type: node.attrs.type,
                style: calcYChangeStyle(node.attrs as YChangeProps),
                ychange_color: node.attrs.color.light
            },
            ...hoverWrapper(node.attrs as YChangeProps, [0])
        ]
    },
    parseMarkdown: {
        match: (node) => {
            return false
        },
        runner: (state, node, markType) => {}
    },

    toMarkdown: {
        match: (mark) => {
            return false
        },
        runner: (state, mark) => {}
    }
}))

export const calcYchangeDomAttrs = (attrs, domAttrs) => {
    domAttrs = Object.assign(
        {
            ychange_user: "",
            ychange_type: "",
            ychange_color: "",
            style: {}
        },
        domAttrs || {}
    )
    if (attrs.ychange !== null) {
        domAttrs.ychange_user = attrs.ychange.user
        domAttrs.ychange_type = attrs.ychange.type
        domAttrs.ychange_color = attrs.ychange.color.light
        domAttrs.style = calcYChangeStyle(attrs.ychange)
    }
    return domAttrs
}

const customImageBlockSchema = imageBlockSchema.extendSchema((prev) => {
    return (ctx) => {
        const baseSchema = prev(ctx)
        return {
            ...baseSchema,
            attrs: {
                ...baseSchema.attrs,
                ychange: {default: null}
            }
        }
    }
})
const customCodeBlock = codeBlockSchema.extendSchema((prev) => {
    return (ctx) => {
        const baseSchema = prev(ctx)
        return {
            ...baseSchema,
            marks: "_",
            attrs: {
                ...baseSchema.attrs,
                ychange: {default: null}
            }
        }
    }
})

export const historyCustomPlugin = () => {
    return [customCodeBlock, customImageBlockSchema, ychangeSchema]
}
