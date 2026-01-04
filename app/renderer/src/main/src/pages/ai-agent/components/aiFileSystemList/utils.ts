import {HistoryItem, PathIncludeResult} from "./type"

const {ipcRenderer} = window.require("electron")

/**
 * @returns 0：相等；1：A包含B；2：B包含A；3：无包含关系；4：异常
 */
export const isPathIncluded = async (pathA: string, pathB: string): Promise<PathIncludeResult> => {
    return await ipcRenderer.invoke("fetch-path-contains-relation", {
        pathA,
        pathB
    })
}

export const mergeOnePath = async (origin: HistoryItem[], incoming: HistoryItem): Promise<HistoryItem[]> => {
    const result: HistoryItem[] = []
    let shouldAddIncoming = true

    for (const item of origin) {
        const relation = await isPathIncluded(item.path, incoming.path)

        if (relation === 0) {
            // 相等
            shouldAddIncoming = false
            result.push(item)
            continue
        }

        if (relation === 1) {
            // item 包含 incoming
            shouldAddIncoming = false
            result.push(item)
            continue
        }

        if (relation === 2) {
            // incoming 包含 item
            continue
        }

        if (relation === 3 || relation === 4) {
            result.push(item)
            continue
        }
    }

    if (shouldAddIncoming) {
        result.push(incoming)
    }

    return result
}

export const mergePathArray = async (origin: HistoryItem[], incomingList: HistoryItem[]): Promise<HistoryItem[]> => {
    let result: HistoryItem[] = [...origin]

    for (const incoming of incomingList) {
        result = await mergeOnePath(result, incoming)
    }

    return result
}

export const checkPathIncludeRelation = async (
    origin: HistoryItem[],
    incoming: HistoryItem
): Promise<PathIncludeResult> => {
    let hasIncomingContains = false
    for (const item of origin) {
        const relation = await isPathIncluded(item.path, incoming.path)
        if (relation === PathIncludeResult.Error) {
            return PathIncludeResult.Error
        }
        if (relation === PathIncludeResult.Equal) {
            return PathIncludeResult.Equal
        }

        if (relation === PathIncludeResult.OriginContains) {
            return PathIncludeResult.OriginContains
        }
        if (relation === PathIncludeResult.IncomingContains) {
            hasIncomingContains = true
        }
    }
    if (hasIncomingContains) {
        return PathIncludeResult.IncomingContains
    }

    return PathIncludeResult.None
}
