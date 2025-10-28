import {CursorPosition} from "./RunnerTabsType"

export const cursorPositionMap: Map<string, CursorPosition> = new Map()
export const setMapCursorPosition = (path: string, info: CursorPosition) => {
    cursorPositionMap.set(path, info)
}

export const getMapCursorPosition = (path: string) => {
    return (
        cursorPositionMap.get(path) || {
            lineNumber: 1,
            column: 1
        }
    )
}

export const clearMapCursorPosition = () => {
    cursorPositionMap.clear()
}
