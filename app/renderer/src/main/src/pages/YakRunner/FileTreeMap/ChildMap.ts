// Map存储文件夹结构详情
export const foldersMap: Map<string, string[]> = new Map()

export const setMapFolderDetail = (path: string, info: string[]) => {
    foldersMap.set(path, info)
}

export const getMapFolderDetail = (path: string) => {
    return foldersMap.get(path)||[]
}

export const getMapAllFolderValue = () => {
    return Array.from(foldersMap.values())
}

export const getMapAllFolderKey = () => {
    return Array.from(foldersMap.keys())
}

export const clearMapFolderDetail = () => {
    foldersMap.clear()
}

export const removeMapFolderDetail = (path: string) => {
    foldersMap.delete(path)
}

export const hasMapFolderDetail = (path) => {
    return foldersMap.has(path);
}