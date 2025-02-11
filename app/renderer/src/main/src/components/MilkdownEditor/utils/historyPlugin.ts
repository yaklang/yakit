import {$markSchema} from "@milkdown/kit/utils"

/**
 * @param {any} ychange
 * @returns
 */
const calcYChangeStyle = (ychange) => {
    switch (ychange.type) {
        case "removed":
            return `color:${ychange.color.dark}`
        case "added":
            return `background-color:${ychange.color.light}`
        case null:
            return ""
    }
}

/**
 * @param {any} ychange
 * @param {Array<any>}
 */
const hoverWrapper = (ychange, els) =>
    ychange === null
        ? els
        : [
              [
                  "span",
                  {class: "ychange-hover", style: `background-color:${ychange.color.dark}`},
                  ychange.user || "Unknown"
              ],
              ["span", ...els]
          ]

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
                style: calcYChangeStyle(node.attrs),
                ychange_color: node.attrs.color.light
            },
            ...hoverWrapper(node.attrs, [0])
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

export const historyCustomPlugin = () => {
    return [ychangeSchema]
}
