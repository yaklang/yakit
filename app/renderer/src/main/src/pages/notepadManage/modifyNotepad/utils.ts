import type {DataNode} from "antd/es/tree"
import {MilkdownCatalogueProps} from "./ModifyNotepadType"

// 构建树形结构
export const buildTOCTree = (headings) => {
    const root: MilkdownCatalogueProps[] = []
    const stack: MilkdownCatalogueProps[] = []
    const keys: string[] = []

    headings.forEach((heading, index) => {
        const {title, level, id} = heading

        const node: MilkdownCatalogueProps = {
            id,
            title,
            key: `${index}-${level}`,
            children: [],
            level
        }

        // 如果堆栈为空，直接加入根节点
        if (stack.length === 0) {
            root.push({...node})
            stack.push({...node} as MilkdownCatalogueProps)
        } else {
            // 检查堆栈顶的节点的级别是否小于当前节点的级别
            while (stack.length && stack[stack.length - 1].level >= level) {
                stack.pop() // 将级别大于或等于当前的节点移出栈
            }

            // 如果堆栈为空，将当前节点作为根节点加入
            if (stack.length === 0) {
                root.push(node)
            } else {
                // 否则将当前节点作为堆栈顶节点的子节点
                stack[stack.length - 1].children?.push({...node} as MilkdownCatalogueProps)
            }
            // 将当前节点压入堆栈
            stack.push({...node} as MilkdownCatalogueProps)
        }
        keys.push(node.key as string)
    })

    return {treeData: root, keys}
}
