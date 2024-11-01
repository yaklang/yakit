
import {v4 as uuidv4} from "uuid"
import { FileNodeMapProps } from "../FileTree/FileTreeType"
export const filesMap: Map<string, FileNodeMapProps> = new Map()

export const setMapFileDetail = (path: string, info: FileNodeMapProps) => {
    filesMap.set(path, info)
}

export const getMapFileDetail = (path: string) => {
    return (
        filesMap.get(path) || {
            parent: null,
            name: "读取文件失败",
            isFolder: false,
            isLeaf: true,
            path: `${uuidv4()}-fail`,
            icon: "_f_yak",
            isReadFail: true
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