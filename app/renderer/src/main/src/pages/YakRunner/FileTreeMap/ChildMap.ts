// Map存储文件夹结构详情
export const foldersMap: Map<string, string[]> = new Map()

export const setMapFolderDetail = (path: string, info: string[]) => {
    foldersMap.set(path, info)
}

export const getMapFolderDetail = (path: string) => {
    return foldersMap.get(path)||[]
    
}

export const clearMapFolderDetail = () => {
    foldersMap.clear()
}