import {FileNodeMapProps} from "../FileTree/FileTreeType"
import {v4 as uuidv4} from "uuid"
export const filesDetail: Map<string, FileNodeMapProps> = new Map()

export const setFileDetail = (path: string, info: FileNodeMapProps) => {
    filesDetail.set(path, info)

    // if (filesDetail.has(path)) {
    //     const item = fileDetail.get(path)
    //     item?.push(info)
    // } else {
    //     filesDetail.set(path, info)
    // }
}

export const getFileDetail = (path: string) => {
    return (
        filesDetail.get(path) || {
            name: "读取失败文件",
            isFolder: false,
            isLeaf: true,
            path: `${uuidv4()}-fail`,
            icon: "_f_yak"
        }
    )
}

export const getAllFileValue = () => {
    return Array.from(filesDetail.values())
}

export const clearFileDetail = () => {
    filesDetail.clear()
}

export const removeFileDetail = (path: string) => {
    filesDetail.delete(path)
}
