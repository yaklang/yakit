import {KnowledgeBaseItem} from "@/pages/KnowledgeBase/hooks/useKnowledgeBase"

/**
 * 对比两个知识库数组，判断新增或删除
 * @param prev 上一次的数据
 * @param next 当前的数据
 */
const compareKnowledgeBaseChange = (
    prev: KnowledgeBaseItem[] | null | undefined,
    next: KnowledgeBaseItem[] | null | undefined
): {delete: KnowledgeBaseItem | null; increase: KnowledgeBaseItem | null} | true | number => {
    // 如果任意一方为空，则无法比较，直接返回 true（表示无变化或无法判断）
    if (!Array.isArray(prev) || !Array.isArray(next)) return true

    const prevMap = new Map(prev.map((item) => [item.ID, item]))
    const nextMap = new Map(next.map((item) => [item.ID, item]))

    // 查找被删除的对象
    const deleted = prev.find((item) => !nextMap.has(item.ID))
    if (deleted) return {delete: deleted, increase: null}

    // 查找新增的对象
    const increased = next.find((item) => !prevMap.has(item.ID))
    if (increased) return {delete: null, increase: increased}

    // 没有变化
    return 1
}

export {compareKnowledgeBaseChange}
