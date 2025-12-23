import {yakitNotify} from "@/utils/notification"
import type {HistoryItem} from "../components/aiFileSystemList/type"

const {ipcRenderer} = window.require("electron")

const fetchIsFolderByPath = (path: string): Promise<boolean> => {
    return ipcRenderer.invoke("fetch-file-is-dir-by-path", path)
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
