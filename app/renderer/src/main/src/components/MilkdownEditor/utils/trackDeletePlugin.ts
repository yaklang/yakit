import {Plugin, PluginKey} from "@milkdown/kit/prose/state"
import {$prose} from "@milkdown/kit/utils"
import {fileCustomId} from "./uploadPlugin"
import {createSlice} from "@milkdown/kit/ctx"
import moment from "moment"
import {DeleteOSSFileItem} from "../MilkdownEditorType"

export const getFileNameByUrl = (url) => {
    if (!url) return ""
    const [name, path] = url.split("?")[0].split("/").reverse()
    if (!name || !path) {
        return ""
    }
    // const fileName = `${path}/${name}`
    // return fileName
    // 重要！！！ 此处后端已处理，后续简化此逻辑
    return url
}

/**
 * 从 doc 中收集所有 OSS 文件
 */
const collectOSSFiles = (doc, schema): Set<string> => {
    const set = new Set<string>()

    doc.descendants((node) => {
        let url = ""
        switch (node.type.name) {
            case fileCustomId:
                url = node.attrs?.fileId !== "0" ? node.attrs?.fileId : ""
                break

            case schema.nodes.image?.name:
            case schema.nodes["image-block"]?.name:
                url = node.attrs?.src
                break

            default:
                break
        }

        const fileName = getFileNameByUrl(url)
        if (fileName) {
            set.add(fileName)
        }
    })

    return set
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
                 // 唯一正确的判断
                if (oldState.doc === newState.doc) return null

                // 核心：语义 diff
                const oldFiles = collectOSSFiles(oldState.doc, oldState.schema)
                const newFiles = collectOSSFiles(newState.doc, newState.schema)

                // 真正删除的文件
                const deletedFiles = [...oldFiles].filter((f) => !newFiles.has(f))

                // 被恢复的文件（undo）
                const restoredFiles = [...newFiles].filter((f) => !oldFiles.has(f))

                // =====================
                // 删除
                // =====================
                if (deletedFiles.length > 0) {
                    ctx.update(deletedFileUrlsCtx, (prev) => {
                        const exist = new Set(prev.map((i) => i.fileName))

                        const next = deletedFiles
                            .filter((f) => !exist.has(f))
                            .map((fileName) => ({
                                fileName,
                                time: moment().valueOf()
                            }))

                        return [...prev, ...next]
                    })
                }
                // =====================
                // 撤销恢复
                // =====================
                if (restoredFiles.length > 0) {
                    ctx.update(deletedFileUrlsCtx, (prev) =>
                        prev.filter((item) => !restoredFiles.includes(item.fileName))
                    )
                }
                return null
            }
        })
    })
