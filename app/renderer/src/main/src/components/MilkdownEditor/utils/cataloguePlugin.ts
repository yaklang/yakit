import {Editor} from "@milkdown/core"
import {commonmark} from "@milkdown/preset-commonmark"
import {Plugin, PluginKey} from "prosemirror-state"
import {schemaCtx} from "@milkdown/core"
import {$prose} from "@milkdown/kit/utils"

// 自定义插件：用于生成目录
export const cataloguePlugin = (callback) =>
    $prose((ctx) => {
        return new Plugin({
            key: new PluginKey("MILKDOWN_PLUGIN_CATALOGUE"),
            view: (editorView) => {
                // 初始化或更新目录
                callback(editorView)

                return {
                    update: (view) => {
                        // 每次内容变化时更新目录
                        callback(view)
                    }
                }
            }
        })
    })
