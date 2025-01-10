import {Plugin, PluginKey} from "prosemirror-state"
import {$prose} from "@milkdown/kit/utils"
import {MilkdownCatalogueProps} from "@/pages/notepadManage/modifyNotepad/ModifyNotepadType"

const getHeading = (view) => {
    const {state} = view
    const {doc} = state
    const headings: MilkdownCatalogueProps[] = []
    // 遍历文档节点，提取标题（heading）
    doc.descendants((node) => {
        if (node.type.name === state.schema.nodes.heading.name && node.content.size > 0) {
            const {attrs} = node
            headings.push({
                id: attrs.id,
                title: node.textContent, // 标题文本
                key: "",
                level: attrs.level, // 标题级别,
                children: []
            })
        }
    })
    return headings
}

// 自定义插件：用于生成目录
export const cataloguePlugin = (callback) =>
    $prose((ctx) => {
        return new Plugin({
            key: new PluginKey("MILKDOWN_PLUGIN_CATALOGUE"),
            view: (editorView) => {
                // 初始化目录
                const initHeadings = getHeading(editorView)
                callback(initHeadings)

                return {
                    update: (view) => {
                        const composing = view.composing
                        if (composing) {
                            // 跳过输入中文拼音的中间状态
                            return
                        }
                        const {selection} = view.state
                        const $from = selection.$from
                        const node = $from.node()
                        if (node && node.type === view.state.schema.nodes.heading) {
                            const headings = getHeading(view)
                            // 内容变化时更新目录
                            callback(headings)
                        }
                    }
                }
            }
        })
    })
