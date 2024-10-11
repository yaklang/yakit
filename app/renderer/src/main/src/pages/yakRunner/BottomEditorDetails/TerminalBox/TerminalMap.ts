export interface TerminalDetailsProps {
    id: string
    path:string
    content: string
    title: string
}

export const terminalMap:Map<string, string> = new Map()

export const setTerminalMap = (id: string, info: string) => {
    terminalMap.set(id, info)
}

export const getTerminalMap = (id: string) => {
    return (
        terminalMap.get(id) || ""
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

export const removeTerminalMap = (id: string) => {
    terminalMap.delete(id)
}

