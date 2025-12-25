import {yakitNotify} from "@/utils/notification"
import type {HistoryItem} from "../components/aiFileSystemList/type"

const {ipcRenderer} = window.require("electron")

const guessIsFolderByPath = (path: string): boolean => {
    const normalized = path.replace(/\\/g, "/")

    // 1. 以 / 结尾
    if (normalized.endsWith("/")) return true

    const lastSegment = normalized.split("/").pop()
    if (!lastSegment) return false

    // 2. 没有扩展名（没有 .）
    if (!lastSegment.includes(".")) return true

    return false
}

const fetchIsFolderByPath =async (path: string): Promise<boolean> => {
    try {
        return await ipcRenderer.invoke("fetch-file-is-dir-by-path", path)
    } catch (err) {
        console.error("IPC failed, fallback to path guess:", err)
        return guessIsFolderByPath(path)
    }
}

export const handleOnFiles = async (files: File[]): Promise<HistoryItem[]> => {
   if (files.length === 0) return []
    if (files.length > 10) {
        yakitNotify("error", "文件数量不能超过10个")
        return []
    }

    const results: HistoryItem[] = []

    for (const file of files) {
        if (!("path" in file)) continue

        const fileWithPath = file as File & {path: string}
        const fullPath: string = fileWithPath.path

        const isFolder: boolean = await fetchIsFolderByPath(fullPath)

        results.push({
            path: fullPath,
            isFolder
        })
    }

    return results
}
