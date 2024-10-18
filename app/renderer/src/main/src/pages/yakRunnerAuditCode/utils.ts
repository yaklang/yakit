import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RequestYakURLResponse} from "../yakURLTree/data"
import {FileDefault, FileSuffix, FolderDefault} from "../yakRunner/FileTree/icon"
import {FileNodeMapProps} from "../yakRunner/FileTree/FileTreeType"
import {AuditYakUrlProps} from "./AuditCode/AuditCodeType"
import {YakRunnerHistoryProps} from "../yakRunner/YakRunnerType"
import emiter from "@/utils/eventBus/eventBus"
import {failed} from "@/utils/notification"

const {ipcRenderer} = window.require("electron")

const initFileTreeData = (list, path) => {
    return list.Resources.sort((a, b) => {
        // 将 ResourceType 为 'dir' 的对象排在前面
        if (a.ResourceType === "dir" && b.ResourceType !== "dir") {
            return -1 // a排在b前面
        } else if (a.ResourceType !== "dir" && b.ResourceType === "dir") {
            return 1 // b排在a前面
        } else {
            return 0 // 保持原有顺序
        }
    }).map((item) => {
        const isFile = !item.ResourceType
        const isFolder = item.ResourceType === "dir"
        const suffix = isFile && item.ResourceName.indexOf(".") > -1 ? item.ResourceName.split(".").pop() : ""
        const isLeaf = isFile || !item.HaveChildrenNodes
        return {
            parent: path || null,
            name: item.ResourceName,
            path: item.Path,
            isFolder: isFolder,
            icon: isFolder ? FolderDefault : suffix ? FileSuffix[suffix] || FileDefault : FileDefault,
            isLeaf: isLeaf
        }
    })
}

/**
 * @name 审计树获取
 */
export const grpcFetchAuditTree: (path: string) => Promise<{res: RequestYakURLResponse; data: FileNodeMapProps[]}> = (
    path
) => {
    return new Promise(async (resolve, reject) => {
        // ssadb path为/时 展示最近编译
        const params = {
            Method: "GET",
            Url: {Schema: "ssadb", Query: [{Key: "op", Value: "list"}], Path: path}
        }
        try {
            const res: RequestYakURLResponse = await ipcRenderer.invoke("RequestYakURL", params)
            // console.log("审计树获取---", params, res)
            const data: FileNodeMapProps[] = initFileTreeData(res, path)
            resolve({res, data})
        } catch (error) {
            reject(error)
        }
    })
}

/**
 * @name 删除已编译项目
 */
export const grpcFetchDeleteAudit: (path: string) => Promise<FileNodeMapProps[]> = (path) => {
    return new Promise(async (resolve, reject) => {
        const params = {
            Method: "DELETE",
            Url: {
                Schema: "ssadb",
                Path: path,
                Query: [{Key: "trash", Value: "true"}]
            }
        }
        try {
            const list: RequestYakURLResponse = await ipcRenderer.invoke("RequestYakURL", params)
            // console.log("删除已编译项目", params, list)
            const data: FileNodeMapProps[] = initFileTreeData(list, path)
            resolve(data)
        } catch (error) {
            reject(error)
        }
    })
}

interface YakRunnerLastFolderExpandedProps {
    folderPath: string
    expandedKeys: string[]
}

const YakRunnerLastAuditFolderExpanded = "YakRunnerLastAuditFolderExpanded"

/**
 * @name 更改打开的文件夹及其展开项
 */
export const setYakRunnerLastFolderExpanded = (cache: YakRunnerLastFolderExpandedProps) => {
    const newCache = JSON.stringify(cache)
    setRemoteValue(YakRunnerLastAuditFolderExpanded, newCache)
}

/**
 * @name 获取上次打开的文件夹及其展开项
 */
export const getYakRunnerLastFolderExpanded = (): Promise<YakRunnerLastFolderExpandedProps | null> => {
    return new Promise(async (resolve, reject) => {
        getRemoteValue(YakRunnerLastAuditFolderExpanded).then((data) => {
            try {
                if (!data) {
                    resolve(null)
                    return
                }
                const historyData: YakRunnerLastFolderExpandedProps = JSON.parse(data)
                resolve(historyData)
            } catch (error) {
                resolve(null)
            }
        })
    })
}

/**
 * @name 代码审计
 */
export const loadAuditFromYakURLRaw = (
    params: AuditYakUrlProps,
    body?: Buffer
): Promise<RequestYakURLResponse | null> => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("RequestYakURL", {
                Method: "GET",
                Url: params,
                Body: body
            })
            .then((rsp: RequestYakURLResponse) => {
                resolve(rsp)
            })
            .catch((e) => {
                reject(e)
            })
    })
}

/**
 * @name 获取路径上的(文件/文件夹)名（兼容多系统）
 */
export const getNameByPath = (filePath: string): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("pathFileName", {
                filePath
            })
            .then((currentName: string) => {
                resolve(currentName)
            })
            .catch(() => {
                resolve("")
            })
    })
}

const YakRunnerAuditOpenHistory = "YakRunnerAuditOpenHistory"

/**
 * @name 更改Audit历史记录
 */
export const setYakRunnerHistory = (newHistory: YakRunnerHistoryProps) => {
    getRemoteValue(YakRunnerAuditOpenHistory).then((data) => {
        try {
            if (!data) {
                setRemoteValue(YakRunnerAuditOpenHistory, JSON.stringify([newHistory]))
                emiter.emit("onRefreshRunnerHistory", JSON.stringify([newHistory]))
                return
            }
            const historyData: YakRunnerHistoryProps[] = JSON.parse(data)
            const newHistoryData: YakRunnerHistoryProps[] = [
                newHistory,
                ...historyData.filter((item) => item.path !== newHistory.path)
            ].slice(0, 10)
            setRemoteValue(YakRunnerAuditOpenHistory, JSON.stringify(newHistoryData))
            emiter.emit("onRefreshRunnerHistory", JSON.stringify(newHistoryData))
        } catch (error) {
            failed(`历史记录异常，重置历史 ${error}`)
            setRemoteValue(YakRunnerAuditOpenHistory, JSON.stringify([]))
        }
    })
}

/**
 * @name 获取Audit历史记录
 */
export const getYakRunnerHistory = (): Promise<YakRunnerHistoryProps[]> => {
    return new Promise(async (resolve, reject) => {
        getRemoteValue(YakRunnerAuditOpenHistory).then((data) => {
            try {
                if (!data) {
                    resolve([])
                    return
                }
                const historyData: YakRunnerHistoryProps[] = JSON.parse(data)
                resolve(historyData)
            } catch (error) {
                resolve([])
            }
        })
    })
}
