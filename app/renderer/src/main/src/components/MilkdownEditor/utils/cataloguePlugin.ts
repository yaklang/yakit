import {Plugin, PluginKey} from "@milkdown/kit/prose/state"
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
            key: new PluginKey("CUSTOM_MILKDOWN_PLUGIN_CATALOGUE"),
            view: (editorView) => {
                // 初始化目录
                const initHeadings = getHeading(editorView)
                callback(initHeadings)

                return {
                    update: (view, prevState) => {
                        if (view.state.doc.eq(prevState.doc)) return
                        const headings = getHeading(view)
                        // 内容变化时更新目录
                        callback(headings)
                    }
                }
            }
        })
    })
