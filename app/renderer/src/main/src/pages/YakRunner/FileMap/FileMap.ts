import {FileNodeMapProps} from "../FileTree/FileTreeType"
import {v4 as uuidv4} from "uuid"
export const filesMap: Map<string, FileNodeMapProps> = new Map()

export const setMapFileDetail = (path: string, info: FileNodeMapProps) => {
    filesMap.set(path, info)
}

export const getMapFileDetail = (path: string) => {
    return (
        filesMap.get(path) || {
            name: "读取失败文件",
            isFolder: false,
            isLeaf: true,
            path: `${uuidv4()}-fail`,
            icon: "_f_yak"
        }
    )
}

export const getMapAllFileValue = () => {
    return Array.from(filesMap.values())
}

export const getMapAllFileKey = () => {
    return Array.from(filesMap.keys())
}

export const getMapAllFileSize = () => {
    return filesMap.size
}

export const clearMapFileDetail = () => {
    filesMap.clear()
}

export const removeMapFileDetail = (path: string) => {
    filesMap.delete(path)
}


// myMap.forEach((value, key) => {
//   console.log(`${key} = ${value}`);
// });