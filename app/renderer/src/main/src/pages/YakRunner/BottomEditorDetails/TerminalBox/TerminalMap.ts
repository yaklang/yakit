export const terminalMap:Map<string, string> = new Map()

export const setTerminalMap = (path: string, info: string) => {
    terminalMap.set(path, info)
}

export const getTerminalMap = (path: string) => {
    return (
        terminalMap.get(path) || ""
    )
}

export const getMapAllTerminalValue = () => {
    return Array.from(terminalMap.values())
}

export const getMapAllTerminalKey = () => {
    return Array.from(terminalMap.keys())
}

export const clearTerminalMap = () => {
    terminalMap.clear()
}

export const removeTerminalMap = (path: string) => {
    terminalMap.delete(path)
}

