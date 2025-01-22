import {Plugin, PluginKey} from "@milkdown/kit/prose/state"
import {$prose} from "@milkdown/kit/utils"
import {fileCustomId} from "./uploadPlugin"
import {createSlice} from "@milkdown/kit/ctx"
import moment from "moment"
import {DeleteOSSFileItem} from "../MilkdownEditorType"
import {ReplaceStep} from "@milkdown/kit/prose/transform"

export const getFileNameByUrl = (url) => {
    if (!url) return ""
    const [name, path] = url.split("?")[0].split("/").reverse()
    if (!name || !path) {
        return ""
    }
    const fileName = `${path}/${name}`
    return fileName
}
const findOSSResource = (node, schema) => {
    const deletedFileNames: DeleteOSSFileItem[] = []
    const traverse = (currentNode) => {
        // 如果节点有子节点，递归遍历
        if (currentNode.content && currentNode.content.length > 0) {
            currentNode.content.forEach((child) => {
                traverse(child)
            })
        } else {
            const {attrs} = currentNode
            let fileName = ""
            switch (currentNode.type.name) {
                case fileCustomId:
                    const fileUrl = attrs.fileId !== "0" ? attrs.fileId : ""
                    fileName = getFileNameByUrl(fileUrl)
                    break
                case schema.nodes.image.name:
                case schema.nodes["image-block"].name:
                    fileName = getFileNameByUrl(attrs.src || "")
                    break
                default:
                    break
            }
            if (fileName)
                deletedFileNames.push({
                    fileName,
                    time: moment().valueOf()
                })
        }
    }

    traverse(node)

    return deletedFileNames
}
export const deletedFileUrlsCtx = createSlice<DeleteOSSFileItem[]>([], "deletedFileUrlsCtx")
// 自定义插件：查找删除的文件和图片的url
export const trackDeletePlugin = () =>
    $prose((ctx) => {
        ctx.inject(deletedFileUrlsCtx) // 注入上下文
        // 在插件初始化时设置值
        ctx.set(deletedFileUrlsCtx, [])
        return new Plugin({
            key: new PluginKey("MILKDOWN_PLUGIN_TRACK_DELETE"),
            appendTransaction: (transactions, oldState, newState) => {
                const oldStateSize = oldState.doc.content.size
                const newStateSize = newState.doc.content.size
                if (oldStateSize === newStateSize) return null
                if (oldStateSize > newStateSize) {
                    // 删除
                    let deletedFileUrls: DeleteOSSFileItem[] = []
                    transactions.forEach((transaction) => {
                        if (transaction.docChanged) {
                            transaction.steps.forEach((step) => {
                                if (step instanceof ReplaceStep) {
                                    const {from, to} = step
                                    if (from !== to) {
                                        // 批量选中删除
                                        const oldSlice = oldState.doc.slice(from, to)
                                        const deleteDoc = oldSlice.content
                                        const urls = findOSSResource(deleteDoc, oldState.schema) || []
                                        deletedFileUrls = [...deletedFileUrls, ...urls]
                                    }
                                }
                            })
                        }
                    })
                    if (deletedFileUrls.length > 0) {
                        // 可以动态更新值
                        ctx.update(deletedFileUrlsCtx, (prev) => [...prev, ...deletedFileUrls])
                    }
                } else {
                    // ctrl+z恢复
                    let addFileUrls: DeleteOSSFileItem[] = []
                    transactions.forEach((transaction) => {
                        if (transaction.docChanged) {
                            transaction.steps.forEach((step) => {
                                if (step instanceof ReplaceStep) {
                                    const content = step.slice.content
                                    if (content.size > 0) {
                                        const urls = findOSSResource(content, oldState.schema) || []
                                        addFileUrls = [...addFileUrls, ...urls]
                                    }
                                }
                            })
                        }
                    })
                    if (addFileUrls.length > 0) {
                        const addUrl = addFileUrls.map((ele) => ele.fileName)
                        // 可以动态更新值
                        ctx.update(deletedFileUrlsCtx, (prev) => prev.filter((ele) => !addUrl.includes(ele.fileName)))
                    }
                }
                return null
            }
        })
    })
