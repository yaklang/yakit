import {Plugin, PluginKey} from "prosemirror-state"
import {$prose} from "@milkdown/kit/utils"

import {ReplaceStep} from "prosemirror-transform"
import {fileCustomId} from "./uploadPlugin"
import {httpDeleteOSSResource} from "@/apiUtils/http"

export const getFileNameByUrl = (url) => {
    const [name, path] = url.split("/").reverse()
    if (!name || !path) {
        return ""
    }
    const fileName = `${path}/${name}`
    return fileName
}
const findDeleteOSSResource = (node, schema) => {
    const deletedFileNames: string[] = []
    const traverse = (currentNode) => {
        // 如果节点有子节点，递归遍历
        if (currentNode.content && currentNode.content.length > 0) {
            currentNode.content.forEach((child) => {
                traverse(child)
            })
        } else {
            const {attrs} = currentNode
            let fileName = ""
            switch (currentNode.type) {
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
            if (fileName) deletedFileNames.push(fileName)
        }
    }

    traverse(node)

    return deletedFileNames
}
// 自定义插件：查找删除的文件和图片的url
export const trackDeletePlugin = () =>
    $prose((ctx) => {
        return new Plugin({
            key: new PluginKey("MILKDOWN_PLUGIN_TRACK_DELETE"),
            appendTransaction: (transactions, oldState, newState) => {
                if (oldState.doc.content.size === newState.doc.content.size) return null
                let deletedFileUrls: string[] = []
                transactions.forEach((transaction) => {
                    if (transaction.docChanged) {
                        transaction.steps.forEach((step) => {
                            if (step instanceof ReplaceStep) {
                                const {from, to} = step
                                if (from !== to) {
                                    // 批量选中删除
                                    const oldSlice = oldState.doc.slice(from, to)
                                    const deleteDoc = oldSlice.toJSON()
                                    const urls = findDeleteOSSResource(deleteDoc, oldState.schema) || []
                                    deletedFileUrls = [...deletedFileUrls, ...urls]
                                }
                            }
                        })
                    }
                })
                console.log("deletedFileUrls", deletedFileUrls)
                if (deletedFileUrls.length > 0) {
                    httpDeleteOSSResource({file_name: deletedFileUrls})
                }
                return null
            }
        })
    })
