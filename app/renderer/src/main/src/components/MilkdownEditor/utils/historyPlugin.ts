import {$markSchema} from "@milkdown/kit/utils"
import {imageBlockSchema, IMAGE_DATA_TYPE} from "@milkdown/kit/component/image-block"
import {YChangeProps} from "../YChange/YChangeType"
import {codeBlockSchema, listItemSchema, hrSchema} from "@milkdown/kit/preset/commonmark"
import {expectDomTypeError} from "@milkdown/exception"
import {randomString} from "@/utils/randomUtil"
import {strikethroughSchema, strikethroughAttr} from "@milkdown/kit/preset/gfm"
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

    toDOM: (node) => {
        console.log("ychangeSchema-node", node)
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
                ychange: {default: null},
                uploadUserId: {default: 0},
                path: {default: ""}
            }
        }
    }
})
const customCodeBlockSchema = codeBlockSchema.extendSchema((prev) => {
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

const customListItemSchema = listItemSchema.extendSchema((prev) => {
    return (ctx) => {
        const baseSchema = prev(ctx)
        return {
            ...baseSchema,
            attrs: {
                ...baseSchema.attrs,
                ychange: {default: null},
                checked: {default: null},
                yjsId: {default: null}
            },
            parseDOM: [
                {
                    tag: 'li[data-item-type="task"]',
                    getAttrs: (dom) => {
                        if (!(dom instanceof HTMLElement)) throw expectDomTypeError(dom)

                        return {
                            label: dom.dataset.label,
                            listType: dom.dataset.listType,
                            spread: dom.dataset.spread,
                            checked: dom.dataset.checked ? dom.dataset.checked === "true" : null
                        }
                    }
                },
                ...(baseSchema?.parseDOM || [])
            ],
            toDOM: (node) => {
                console.log("customListItemSchema-node", node)
                if (baseSchema.toDOM && node.attrs.checked == null) return baseSchema.toDOM(node)

                return [
                    "li",
                    {
                        "data-item-type": "task",
                        "data-label": node.attrs.label,
                        "data-list-type": node.attrs.listType,
                        "data-spread": node.attrs.spread,
                        "data-checked": node.attrs.checked
                    },
                    0
                ]
            },
            parseMarkdown: {
                match: ({type}) => type === "listItem",
                runner: (state, node, type) => {
                    console.log("customListItemSchema-parseMarkdown-node", node)
                    if (node.checked == null) {
                        baseSchema.parseMarkdown.runner(state, node, type)
                        return
                    }
                    const label = node.label != null ? `${node.label}.` : "•"
                    const listType = node.label != null ? "ordered" : "bullet"
                    const spread = node.spread != null ? `${node.spread}` : "true"
                    const checked = node.checked != null ? Boolean(node.checked) : null
                    const yjsId = randomString(8)

                    state.openNode(type, {label, listType, spread, checked, yjsId})
                    state.next(node.children)
                    state.closeNode()
                }
            },
            toMarkdown: {
                match: (node) => node.type.name === "list_item",
                runner: (state, node) => {
                    console.log("customListItemSchema-toMarkdown-node", node)
                    if (node.attrs.checked == null) {
                        baseSchema.toMarkdown.runner(state, node)
                        return
                    }
                    const label = node.attrs.label
                    const listType = node.attrs.listType
                    const spread = node.attrs.spread === "true"
                    const checked = node.attrs.checked

                    state.openNode("listItem", undefined, {
                        label,
                        listType,
                        spread,
                        checked
                    })
                    state.next(node.content)
                    state.closeNode()
                }
            }
        }
    }
})
const customHrSchema = hrSchema.extendSchema((prev) => {
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

export const historyCustomPlugin = () => {
    return [customHrSchema, customListItemSchema, customCodeBlockSchema, customImageBlockSchema, ychangeSchema]
}
