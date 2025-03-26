import {MilkdownPlugin} from "@milkdown/kit/ctx"
import type {EditorView} from "@milkdown/prose/view"
import {Plugin, PluginKey} from "prosemirror-state"
import {$prose} from "@milkdown/kit/utils"
import {TextSelection} from "@milkdown/kit/prose/state"

// 插件 Key
export const jumpToLinePluginKey = new PluginKey("jump-to-line")

// 行号跳转插件
export const jumpToLinePlugin = (line: number): MilkdownPlugin =>
    $prose((ctx) => {
        // 跳转到指定行的逻辑
        const jumpToLine = (view: EditorView, lineNumber: number) => {
            if (!lineNumber) return
            const doc = view.state.doc
            let currentLine = 1 // 当前行号（从 1 开始）
            let targetPos = 0 // 目标行的起始位置

            // 遍历文档节点，计算行号
            doc.descendants((node, pos) => {
                if (currentLine > lineNumber) return false // 提前终止遍历
                if (node.isText) {
                    const text = node.text || ""
                    const lines = text.split("\n")
                    for (let i = 0; i < lines.length; i++) {
                        if (currentLine === lineNumber) {
                            targetPos = pos + lines.slice(0, i).join("\n").length
                            if (i > 0) targetPos += 1 // 跳过换行符
                            return false // 找到目标行，终止遍历
                        }
                        currentLine++
                    }
                } else if (node.isBlock) {
                    // 块级节点（如段落、标题）默认占一行
                    if (currentLine === lineNumber) {
                        targetPos = pos + 1 // 跳过节点开始位置
                        return false
                    }
                    currentLine++
                }
                return true // 继续遍历子节点
            })

            // 设置光标位置
            if (targetPos > 0 && targetPos <= doc.content.size) {
                const tr = view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(targetPos)))
                view.dispatch(tr)
                view.focus()
                // 滚动到目标位置
                view.dom.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                })
            }
        }
        // ProseMirror 插件
        const plugin = new Plugin({
            key: jumpToLinePluginKey,
            view: (view) => {
                // jumpToLine(view, line)
                return {
                    update: (view, prevState) => {
                        jumpToLine(view, line)
                    }
                }
            }
        })

        return plugin
    })
