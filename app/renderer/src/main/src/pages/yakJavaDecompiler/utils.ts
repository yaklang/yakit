import {failed, yakitNotify} from "@/utils/notification"
import {openABSFileLocated} from "@/utils/openWebsite"
import {RequestYakURLResponse} from "../yakURLTree/data"
import {FileNodeMapProps, FileNodeProps} from "./FileTree/FileTreeType"
import {FileDefault, FileSuffix, FolderDefault} from "../yakRunner/FileTree/icon"
import {AreaInfoProps, TabFileProps, YakJavaDecompilerHistoryProps} from "./YakJavaDecompilerType"
import cloneDeep from "lodash/cloneDeep"
import {FileDetailInfo, OptionalFileDetailInfo} from "./RunnerTabs/RunnerTabsType"
import {v4 as uuidv4} from "uuid"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import emiter from "@/utils/eventBus/eventBus"

const {ipcRenderer} = window.require("electron")

const initJavaDecompilerFileTreeData = (list: RequestYakURLResponse, path) => {
    return list.Resources.filter((item) => {
        // 如果存在hide属性，则跳过
        for (let i = 0; i < item.Extra.length; i++) {
            const key = item.Extra[i].Key
            if (key === "hide" && item.Extra[i].Value === "true") {
                return false
            }
        }
        return true
    }).map((item) => {
        let isFolder = item.HaveChildrenNodes
        const fileSuffix = item.ResourceName.split(".").pop() || ""
        let icon = isFolder ? FolderDefault : FileDefault

        // 为文件设置图标
        if (!isFolder && fileSuffix && FileSuffix[fileSuffix]) {
            icon = FileSuffix[fileSuffix]
        }
        let isLeaf = !isFolder

        if (fileSuffix === "jar") {
            isLeaf = false
            isFolder = true
        }

        return {
            parent: path,
            name: item.VerboseName,
            path: item.Path,
            isFolder,
            icon,
            isLeaf,
            data: item // 存储原始数据
        }
    })
}

/**
 * @name 文件树获取
 */
export const grpcFetchJavaDecompilerFileTree: (obj: {
    jarPath: string
    innerPath: string
}) => Promise<FileNodeMapProps[]> = ({jarPath, innerPath}) => {
    return new Promise(async (resolve, reject) => {
        // local
        const params = {
            Method: "GET",
            Url: {
                FromRaw: "",
                Schema: "javadec",
                User: "",
                Pass: "",
                Location: "",
                Path: "/jar-aifix",
                Query: [
                    {Key: "jar", Value: jarPath},
                    {Key: "dir", Value: innerPath}
                ]
            }
        }

        try {
            const res: RequestYakURLResponse = await ipcRenderer.invoke("RequestYakURL", params)
            const data: FileNodeMapProps[] = initJavaDecompilerFileTreeData(res, innerPath)
            // console.log("文件树获取---", path, res)
            resolve(data)
        } catch (error) {
            reject(error)
        }
    })
}

/**
 * @name 根据文件path获取其内容
 */
export const getJavaDecompilerCodeByPath = (path: string): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        // local
        const params = {
            Method: "GET",
            Url: {
                FromRaw: path,
                Schema: "",
                User: "",
                Pass: "",
                Location: "",
                Path: "",
                Query: []
            }
        }

        try {
            const res: RequestYakURLResponse = await ipcRenderer.invoke("RequestYakURL", params)
            if (res.Resources && res.Resources.length > 0) {
                const decompiled = res.Resources[0].Extra.find((kv) => kv.Key === "content")
                if (decompiled) {
                    try {
                        const content = Buffer.from(decompiled.Value, "hex")
                        const contentStr = content.toString("utf8")
                        resolve(contentStr)
                    } catch (err) {
                        resolve(`// 解析 class 内容错误: ${err}`)
                    }
                } else {
                    resolve("// 没有可用的反编译内容")
                }
            } else {
                resolve("// 没有可用的反编译内容")
            }
        } catch (error) {
            failed(`反编译 class 失败: ${error}`)
            resolve(`// 错误: ${error}`)
        }
    })
}

/**
 * @name 导出反编译ZIP文件
 */
export const downloadAsZip = (path: string, projectName: string): Promise<null> => {
    return new Promise(async (resolve, reject) => {
        const params = {
            Method: "GET",
            Url: {
                FromRaw: path,
                Schema: "",
                User: "",
                Pass: "",
                Location: "",
                Path: "",
                Query: []
            }
        }

        try {
            yakitNotify("info", "正在后台导出，请等待")
            const res: RequestYakURLResponse = await ipcRenderer.invoke("RequestYakURL", params)
            if (!res.Resources || res.Resources.length === 0) {
                failed("导出内容不可用")
                reject("no resources")
                return
            }

            const first = res.Resources[0]
            const zipPath =
                first.Path || first.Extra.find((e) => e.Key === "path")?.Value

            if (!zipPath) {
                failed("导出ZIP文件路径不可用")
                reject("no zip path")
                return
            }

            try {
                const exists: boolean = await ipcRenderer.invoke("is-file-exists", zipPath)
                if (!exists) {
                    failed("导出的ZIP文件不存在")
                    reject("zip not exists")
                    return
                }

                yakitNotify("success", "导出成功，正在打开文件位置")
                openABSFileLocated(zipPath)
                resolve(null)
            } catch (err) {
                failed(`打开ZIP文件失败: ${err}`)
                reject(err)
            }
        } catch (error) {
            reject(error)
        }
    })
}

/**
 * @name 判断分栏数据里是否存在某个节点file数据
 */
export const judgeJavaDecompilerAreaExistFilePath = (
    areaInfo: AreaInfoProps[],
    path: string
): Promise<FileDetailInfo | null> => {
    return new Promise(async (resolve, reject) => {
        const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
        newAreaInfo.forEach((item, index) => {
            item.elements.forEach((itemIn, indexIn) => {
                itemIn.files.forEach((file, fileIndex) => {
                    if (file.path === path) {
                        resolve(file)
                    }
                })
            })
        })
        resolve(null)
    })
}

/**
 * @name 更新分栏数据里某个节点的file数据
 */
// 根据path更新指定内容
export const updateJavaDecompilerAreaFileInfo = (
    areaInfo: AreaInfoProps[],
    data: OptionalFileDetailInfo,
    path: string
) => {
    const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
    newAreaInfo.forEach((item, index) => {
        item.elements.forEach((itemIn, indexIn) => {
            itemIn.files.forEach((file, fileIndex) => {
                if (file.path === path) {
                    newAreaInfo[index].elements[indexIn].files[fileIndex] = {
                        ...newAreaInfo[index].elements[indexIn].files[fileIndex],
                        ...data
                    }
                }
            })
        })
    })
    return newAreaInfo
}

/**
 * @name 删除分栏数据里某个节点的file数据
 */
export const removeJavaDecompilerAreaFileInfo = (areaInfo: AreaInfoProps[], info: FileDetailInfo) => {
    const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
    let newActiveFile: FileDetailInfo | undefined = undefined
    let activeFileArr: FileDetailInfo[] = []
    newAreaInfo.forEach((item, idx) => {
        item.elements.forEach((itemIn, idxin) => {
            itemIn.files.forEach((file, fileIndex) => {
                if (file.isActive) {
                    activeFileArr.push(file)
                }
                if (file.path === info.path) {
                    // 如若仅存在一项 则删除此大项并更新布局
                    if (item.elements.length > 1 && itemIn.files.length === 1) {
                        newAreaInfo[idx].elements = newAreaInfo[idx].elements.filter(
                            (item) => !item.files.map((item) => item.path).includes(info.path)
                        )
                    } else if (item.elements.length <= 1 && itemIn.files.length === 1) {
                        newAreaInfo.splice(idx, 1)
                    }
                    // 存在多项则只移除删除项
                    else {
                        newAreaInfo[idx].elements[idxin].files = newAreaInfo[idx].elements[idxin].files.filter(
                            (item) => item.path !== info.path
                        )
                        // 重新激活未选中项目（因删除后当前tabs无选中项）
                        if (info.isActive) {
                            newAreaInfo[idx].elements[idxin].files[fileIndex - 1 < 0 ? 0 : fileIndex - 1].isActive =
                                true
                            newActiveFile =
                                newAreaInfo[idx].elements[idxin].files[fileIndex - 1 < 0 ? 0 : fileIndex - 1]
                        }
                    }
                }
            })
        })
    })
    if (!newActiveFile && activeFileArr.length > 0) {
        let delIndex = activeFileArr.findIndex((item) => item.path === info.path)
        if (delIndex > -1) {
            newActiveFile = activeFileArr[delIndex - 1 < 0 ? 0 : delIndex - 1]
        }
    }
    return {newAreaInfo, newActiveFile}
}

/**
 * @name 更改分栏数据里某个节点的isActive活动数据
 */
export const setJavaDecompilerAreaFileActive = (areaInfo: AreaInfoProps[], path: string) => {
    const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
    newAreaInfo.forEach((item, index) => {
        item.elements.forEach((itemIn, indexIn) => {
            itemIn.files.forEach((file, fileIndex) => {
                if (file.path === path) {
                    newAreaInfo[index].elements[indexIn].files = newAreaInfo[index].elements[indexIn].files.map(
                        (item) => ({...item, isActive: false})
                    )
                    newAreaInfo[index].elements[indexIn].files[fileIndex].isActive = true
                }
            })
        })
    })
    return newAreaInfo
}

/**
 * @name 更改项是否包含激活展示文件，包含则取消激活
 */
export const isResetJavaDecompilerActiveFile = (
    files: FileDetailInfo[] | FileNodeProps[],
    activeFile: FileDetailInfo | undefined
) => {
    let newActiveFile = activeFile
    files.forEach((file) => {
        if (file.path === activeFile?.path) {
            newActiveFile = undefined
        }
    })
    return newActiveFile
}

/**
 * @name 新增分栏数据里某个节点的file数据
 */
export const addJavaDecompilerAreaFileInfo = (
    areaInfo: AreaInfoProps[],
    info: FileDetailInfo,
    activeFile?: FileDetailInfo
) => {
    let newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
    let newActiveFile: FileDetailInfo = info
    try {
        // 如若存在激活项则向激活项后添加新增项并重新指定激活项目
        if (newAreaInfo.length > 0 && activeFile) {
            newAreaInfo.forEach((item, index) => {
                item.elements.forEach((itemIn, indexIn) => {
                    itemIn.files.forEach((file, fileIndex) => {
                        //
                        if (file.path === activeFile.path) {
                            newAreaInfo[index].elements[indexIn].files = newAreaInfo[index].elements[indexIn].files.map(
                                (item) => ({
                                    ...item,
                                    isActive: false
                                })
                            )
                            newAreaInfo[index].elements[indexIn].files.splice(fileIndex + 1, 0, info)
                        }
                    })
                })
            })
        } else {
            if (newAreaInfo.length === 0) {
                const newElements: TabFileProps[] = [
                    {
                        id: uuidv4(),
                        files: [info]
                    }
                ]
                newAreaInfo = [{elements: newElements}]
            } else {
                newAreaInfo[0].elements[0].files = newAreaInfo[0].elements[0].files.map((item) => ({
                    ...item,
                    isActive: false
                }))
                newAreaInfo[0].elements[0].files = [...newAreaInfo[0].elements[0].files, info]
            }
        }
        return {
            newAreaInfo,
            newActiveFile
        }
    } catch (error) {
        return {
            newAreaInfo,
            newActiveFile
        }
    }
}

const YakDecompilerOpenHistory = "YakDecompilerOpenHistory"
const YakDecompilerLastFolderExpanded = "YakDecompilerLastFolderExpanded"

/**
 * @name 更改YakRunner历史记录
 */
export const setYakJavaDecompilerHistory = (newHistory: YakJavaDecompilerHistoryProps) => {
    getRemoteValue(YakDecompilerOpenHistory).then((data) => {
        try {
            if (!data) {
                setRemoteValue(YakDecompilerOpenHistory, JSON.stringify([newHistory]))
                emiter.emit("onRefreshDecompilerHistory", JSON.stringify([newHistory]))
                return
            }
            const historyData: YakJavaDecompilerHistoryProps[] = JSON.parse(data)
            const newHistoryData: YakJavaDecompilerHistoryProps[] = [
                newHistory,
                ...historyData.filter((item) => item.path !== newHistory.path)
            ].slice(0, 10)
            setRemoteValue(YakDecompilerOpenHistory, JSON.stringify(newHistoryData))
            emiter.emit("onRefreshDecompilerHistory", JSON.stringify(newHistoryData))
        } catch (error) {
            failed(`历史记录异常，重置历史 ${error}`)
            setRemoteValue(YakDecompilerOpenHistory, JSON.stringify([]))
        }
    })
}

/**
 * @name 获取YakJavaDecompiler历史记录
 */
export const getYakJavaDecompilerHistory = (): Promise<YakJavaDecompilerHistoryProps[]> => {
    return new Promise(async (resolve, reject) => {
        getRemoteValue(YakDecompilerOpenHistory).then((data) => {
            try {
                if (!data) {
                    resolve([])
                    return
                }
                const historyData: YakJavaDecompilerHistoryProps[] = JSON.parse(data)
                resolve(historyData)
            } catch (error) {
                resolve([])
            }
        })
    })
}

interface YakRunnerLastFolderExpandedProps {
    folderPath: string
    expandedKeys: string[]
}

/**
 * @name 更改打开的文件夹及其展开项
 */
export const setYakDecompilerLastFolderExpanded = (cache: YakRunnerLastFolderExpandedProps) => {
    const newCache = JSON.stringify(cache)
    setRemoteValue(YakDecompilerLastFolderExpanded, newCache)
}
