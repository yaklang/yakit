import {yakitNotify} from "@/utils/notification"
import {Ctx} from "@milkdown/kit/ctx"
import {
    blockquoteSchema,
    bulletListSchema,
    codeBlockSchema,
    headingSchema,
    hrSchema,
    listItemSchema,
    orderedListSchema,
    paragraphSchema
} from "@milkdown/kit/preset/commonmark"
import {NodeType, Attrs} from "@milkdown/kit/prose/model"
import {Command, Transaction} from "@milkdown/kit/prose/state"
import {findWrapping} from "@milkdown/kit/prose/transform"
import {EditorView} from "@milkdown/kit/prose/view"
import {alterCustomSchema} from "./alertPlugin"
import {getLocalFileLinkInfo} from "../CustomFile/utils"
import {ImgMaxSize} from "@/pages/pluginEditor/pluginImageTextarea/PluginImageTextarea"
import {HttpUploadImgBaseRequest, httpUploadImgPath} from "@/apiUtils/http"
import {callCommand} from "@milkdown/kit/utils"
import {insertImageBlockCommand} from "./imageBlock"
import {fileCommand} from "./uploadPlugin"

const {ipcRenderer} = window.require("electron")

export const clearContentAndSetBlockType = (nodeType: NodeType, attrs: Attrs | null = null): Command => {
    return (state, dispatch) => {
        if (dispatch) {
            const tr = setBlockTypeCustom(clearRange(state.tr), nodeType, attrs)
            dispatch(tr.scrollIntoView())
        }
        return true
    }
}

const setBlockTypeCustom = (tr: Transaction, nodeType: NodeType, attrs: Attrs | null = null) => {
    const {from, to} = tr.selection
    return tr.setBlockType(from, to, nodeType, attrs)
}

const clearRange = (tr: Transaction) => {
    const {$from, $to} = tr.selection
    const {pos: from} = $from
    const {pos: to} = $to
    tr = tr.deleteRange(from - $from.node().content.size, to)
    return tr
}

export const clearContentAndAddBlockType = (nodeType: NodeType, attrs: Attrs | null = null): Command => {
    return (state, dispatch) => {
        const tr = addBlockType(clearRange(state.tr), nodeType, attrs)
        if (!tr) return false

        if (dispatch) dispatch(tr.scrollIntoView())

        return true
    }
}

export const addBlockType = (tr: Transaction, nodeType: NodeType, attrs: Attrs | null = null) => {
    const node = nodeType.createAndFill(attrs)
    if (!node) return null

    return tr.replaceSelectionWith(node)
}

export const setWrapInBlockType = (nodeType: NodeType, attrs: Attrs | null = null): Command => {
    return (state, dispatch) => {
        const tr = wrapInBlockType(state.tr, nodeType, attrs)
        if (!tr) return false

        if (dispatch) dispatch(tr.scrollIntoView())

        return true
    }
}

const wrapInBlockType = (tr: Transaction, nodeType: NodeType, attrs: Attrs | null = null) => {
    const {$from, $to} = tr.selection

    const range = $from.blockRange($to)
    const wrapping = range && findWrapping(range, nodeType, attrs)
    if (!wrapping) return null

    return tr.wrap(range, wrapping)
}

export const clearContentAndWrapInBlockType = (nodeType: NodeType, attrs: Attrs | null = null): Command => {
    return (state, dispatch) => {
        const tr = wrapInBlockType(clearRange(state.tr), nodeType, attrs)
        if (!tr) return false

        if (dispatch) dispatch(tr.scrollIntoView())

        return true
    }
}

/**
 * @description 将选区转换为指定节点类型,未做更多的适配
 * @param nodeType
 * @param attrs
 * @returns {boolean}
 */
export const convertSelectionByNode = (nodeType: NodeType, attrs: Attrs | null = null): Command => {
    return (state, dispatch) => {
        try {
            const {$from, from, to} = state.selection
            // 检查选区是否有效
            if (from === to) {
                return false // 没有选中任何内容
            }
            // 获取父节点类型
            const parentNode = $from.node(-1) // 使用 -1 获取上一级节点

            if (parentNode && parentNode.type.name === state.schema.nodes.list_item.name) {
                let textNode = state.schema.text(parentNode.textContent)
                if (parentNode.attrs?.listType === "ordered" && nodeType.name === state.schema.nodes.heading.name) {
                    // 有序列表转为标题的时候需要把序号带上
                    textNode = state.schema.text(`${parentNode.attrs.label || ""}${parentNode.textContent}`)
                }

                // 创建新的节点，并用它替换列表项
                const node = state.schema.nodes[nodeType.name].create(
                    attrs, // attrs属性
                    textNode // 使用列表项的内容填充
                )

                // 使用 transaction 将列表项替换为
                const tr = state.tr.replaceRangeWith($from.before(-1), $from.after(-1), node)

                if (dispatch) dispatch(tr)

                return true
            }
            return false
        } catch (error) {
            yakitNotify("error", `[${nodeType.name}]convertSelectionByNode执行失败:${error}`)
            return false
        }
    }
}

/**生成空白 正文 */
export const createBlankText = (action: (fn: (ctx: Ctx) => void) => void, view: EditorView) => {
    const {dispatch, state} = view
    action((ctx) => {
        const command = clearContentAndSetBlockType(paragraphSchema.type(ctx))
        command(state, dispatch)
    })
}

/**生成空白 一级标题 */
export const createBlankHeading1 = (action: (fn: (ctx: Ctx) => void) => void, view: EditorView) => {
    const {dispatch, state} = view
    action((ctx) => {
        const command = clearContentAndSetBlockType(headingSchema.type(ctx), {level: 1})
        command(state, dispatch)
    })
}

/**生成空白 二级标题 */
export const createBlankHeading2 = (action: (fn: (ctx: Ctx) => void) => void, view: EditorView) => {
    const {dispatch, state} = view
    action((ctx) => {
        const command = clearContentAndSetBlockType(headingSchema.type(ctx), {level: 2})
        command(state, dispatch)
    })
}

/**生成空白 三级标题 */
export const createBlankHeading3 = (action: (fn: (ctx: Ctx) => void) => void, view: EditorView) => {
    const {dispatch, state} = view
    action((ctx) => {
        const command = clearContentAndSetBlockType(headingSchema.type(ctx), {level: 3})
        command(state, dispatch)
    })
}

/**生成空白 有序列表 */
export const createBlankOrderedList = (action: (fn: (ctx: Ctx) => void) => void, view: EditorView) => {
    const {dispatch, state} = view
    action((ctx) => {
        const command = clearContentAndWrapInBlockType(orderedListSchema.type(ctx))
        command(state, dispatch)
    })
}

/**生成空白 无序列表 */
export const createBlankUnorderedList = (action: (fn: (ctx: Ctx) => void) => void, view: EditorView) => {
    const {dispatch, state} = view
    action((ctx) => {
        const command = clearContentAndWrapInBlockType(bulletListSchema.type(ctx))
        command(state, dispatch)
    })
}

/**生成空白 任务/可勾选框列表 */
export const createBlankTask = (action: (fn: (ctx: Ctx) => void) => void, view: EditorView) => {
    const {dispatch, state} = view
    action((ctx) => {
        const command = clearContentAndWrapInBlockType(listItemSchema.type(ctx), {checked: false})
        command(state, dispatch)
    })
}

/**生成空白 代码块 */
export const createBlankCodeBlock = (action: (fn: (ctx: Ctx) => void) => void, view: EditorView) => {
    const {dispatch, state} = view
    action((ctx) => {
        const command = clearContentAndAddBlockType(codeBlockSchema.type(ctx))
        command(state, dispatch)
    })
}

/**生成空白 引用 */
export const createBlankQuote = (action: (fn: (ctx: Ctx) => void) => void, view: EditorView) => {
    const {dispatch, state} = view
    action((ctx) => {
        const command = clearContentAndWrapInBlockType(blockquoteSchema.type(ctx))
        command(state, dispatch)
    })
}

/**生成空白 高亮 */
export const createBlankHighLight = (action: (fn: (ctx: Ctx) => void) => void, view: EditorView) => {
    const {dispatch, state} = view
    action((ctx) => {
        const command = clearContentAndWrapInBlockType(alterCustomSchema.type(ctx))
        command(state, dispatch)
    })
}

/**生成 分割线 */
export const createDivider = (action: (fn: (ctx: Ctx) => void) => void, view: EditorView) => {
    const {dispatch, state} = view
    action((ctx) => {
        const command = clearContentAndAddBlockType(hrSchema.type(ctx))
        command(state, dispatch)
    })
}

const FileMaxSize = 1024 * 1024 * 1024
const imgTypes = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".tif", ".webp", ".svg"]

/**上传图片和文件 */
export const uploadFileInMilkdown = (
    action: (fn: (ctx: Ctx) => void) => void,
    option: {type: HttpUploadImgBaseRequest["type"]; notepadHash: string; userId: number}
) => {
    const {type, notepadHash, userId} = option
    ipcRenderer
        .invoke("openDialog", {
            title: "请选择文件",
            properties: ["openFile"]
        })
        .then((data: {filePaths: string[]}) => {
            const filesLength = data.filePaths.length
            if (filesLength) {
                const path = data.filePaths[0].replace(/\\/g, "\\")
                getLocalFileLinkInfo(path).then((res) => {
                    if (res.size > FileMaxSize) {
                        yakitNotify("error", "文件大小不能超过1G")
                        return
                    }
                    const index = path.lastIndexOf(".")
                    const fileType = path.substring(index, path.length)
                    if (imgTypes.includes(fileType)) {
                        if (res.size > ImgMaxSize) {
                            yakitNotify("error", "图片大小不能超过1M")
                            return
                        }
                        httpUploadImgPath({path, type, filedHash: notepadHash})
                            .then((src) => {
                                action(
                                    callCommand(insertImageBlockCommand.key, {
                                        src,
                                        alt: path,
                                        title: ""
                                    })
                                )
                            })
                            .catch((e) => {
                                yakitNotify("error", `上传图片失败:${e}`)
                            })
                    } else {
                        action(
                            callCommand(fileCommand.key, {
                                fileId: "0",
                                path,
                                notepadHash,
                                uploadUserId: userId
                            })
                        )
                    }
                })
            }
        })
}
