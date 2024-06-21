import {failed, warn, yakitNotify} from "@/utils/notification"
import {CodeScoreSmokingEvaluateResponseProps} from "../plugins/funcTemplateType"
import {RequestYakURLResponse} from "../yakURLTree/data"
import {FileNodeMapProps, FileNodeProps, FileTreeListProps} from "./FileTree/FileTreeType"
import {FileDefault, FileSuffix, FolderDefault} from "./FileTree/icon"
import {StringToUint8Array} from "@/utils/str"
import {
    ConvertYakStaticAnalyzeErrorToMarker,
    IMonacoEditorMarker,
    YakStaticAnalyzeErrorResult
} from "@/utils/editorMarkers"
import {AreaInfoProps, TabFileProps, YakRunnerHistoryProps} from "./YakRunnerType"
import cloneDeep from "lodash/cloneDeep"
import {FileDetailInfo, OptionalFileDetailInfo} from "./RunnerTabs/RunnerTabsType"
import {v4 as uuidv4} from "uuid"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import emiter from "@/utils/eventBus/eventBus"

const {ipcRenderer} = window.require("electron")

export const grpcFetchFileTree: (path: string) => Promise<FileNodeMapProps[]> = (path) => {
    return new Promise(async (resolve, reject) => {
        const params = {
            Method: "GET",
            Url: {Schema: "file", Query: [{Key: "op", Value: "list"}], Path: path}
        }

        try {
            const list: RequestYakURLResponse = await ipcRenderer.invoke("RequestYakURL", params)

            const data: FileNodeMapProps[] = list.Resources.map((item) => {
                const isFile = !item.ResourceType
                const isFolder = item.ResourceType === "dir"
                const suffix = isFile && item.ResourceName.indexOf(".") > -1 ? item.ResourceName.split(".").pop() : ""
                const isLeaf = isFile || !item.HaveChildrenNodes
                return {
                    parent: path,
                    name: item.ResourceName,
                    path: item.Path,
                    isFolder: isFolder,
                    icon: isFolder ? FolderDefault : suffix ? FileSuffix[suffix] || FileDefault : FileDefault,
                    isLeaf: isLeaf
                }
            })

            resolve(data)
        } catch (error) {
            reject(error)
        }
    })
}

/**
 * @name 更新树数据里某个节点的children数据
 */
export const updateFileTree: (oldFileTree: FileTreeListProps[], path: string, updateData: FileTreeListProps[]) => FileTreeListProps[] = (
    oldFileTree,
    path,
    updateData
) => {
    if (!path) return oldFileTree

    const isValid = updateData && updateData.length > 0

    return oldFileTree.map((node) => {
        if (node.path === path) {
            return {...node, children: isValid ? updateData : undefined}
        }
        if (node.children && node.children.length > 0) {
            return {
                ...node,
                children: updateFileTree(node.children, path, updateData)
            }
        }
        return node
    })
}

/**
 * @name 语法检查
 */
export const onSyntaxCheck = (code: string) => {
    return new Promise(async (resolve, reject) => {
        // StaticAnalyzeError
        ipcRenderer
            .invoke("StaticAnalyzeError", {Code: StringToUint8Array(code), PluginType: "yak"})
            .then((e: {Result: YakStaticAnalyzeErrorResult[]}) => {
                if (e && e.Result.length > 0) {
                    const markers = e.Result.map(ConvertYakStaticAnalyzeErrorToMarker)
                    // monaco.editor.setModelMarkers(model, "owner", markers)
                    resolve(markers)
                } else {
                    resolve([])
                }
            })
            .catch(() => {
                resolve([])
            })
    })
}

/**
 * @name 判断分栏数据里是否存在某个节点file数据
 */
export const judgeAreaExistFilePath = (areaInfo: AreaInfoProps[], path: string): Promise<FileDetailInfo | null> => {
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
export const updateAreaFileInfo = (areaInfo: AreaInfoProps[], data: OptionalFileDetailInfo, path?: string) => {
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
export const removeAreaFileInfo = (areaInfo: AreaInfoProps[], info: FileDetailInfo) => {
    const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
    newAreaInfo.forEach((item, idx) => {
        item.elements.forEach((itemIn, idxin) => {
            itemIn.files.forEach((file, fileIndex) => {
                if (file.path === info.path) {
                    // 如若仅存在一项 则删除此大项并更新布局
                    if (item.elements.length > 1 && itemIn.files.length === 1) {
                        newAreaInfo[idx].elements = newAreaInfo[idx].elements.filter(
                            (item) => !item.files.map((item) => item.path).includes(info.path)
                        )
                    } else if (item.elements.length <= 1 && itemIn.files.length === 1) {
                        newAreaInfo.splice(idx, 1)
                    }
                    // 存在多项则移除删除项
                    else {
                        newAreaInfo[idx].elements[idxin].files = newAreaInfo[idx].elements[idxin].files.filter(
                            (item) => item.path !== info.path
                        )
                        // 重新激活未选中项目（因删除后当前tabs无选中项）
                        if (info.isActive) {
                            newAreaInfo[idx].elements[idxin].files[fileIndex - 1 < 0 ? 0 : fileIndex - 1].isActive =
                                true
                        }
                    }
                }
            })
        })
    })
    return newAreaInfo
}

/**
 * @name 更改分栏数据里某个节点的isActive活动数据
 */
export const setAreaFileActive = (areaInfo: AreaInfoProps[], path: string) => {
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
 * @name 新增分栏数据里某个节点的file数据
 */
export const addAreaFileInfo = (areaInfo: AreaInfoProps[], info: FileDetailInfo, activeFile?: FileDetailInfo) => {
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

/**
 * @name 注入语法检查结果
 */
export const getDefaultActiveFile = async (info: FileDetailInfo) => {
    let newActiveFile = info
    // 注入语法检查结果
    if (newActiveFile.language === "yak") {
        const syntaxCheck = (await onSyntaxCheck(newActiveFile.code)) as IMonacoEditorMarker[]
        if (syntaxCheck) {
            newActiveFile = {...newActiveFile, syntaxCheck}
        }
    }
    return newActiveFile
}

/**
 * @name 获取打开文件的path与name
 */
export const getOpenFileInfo = (): Promise<{path: string; name: string} | null> => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("openDialog", {
                title: "请选择文件",
                properties: ["openFile"]
            })
            .then((data: {filePaths: string[]}) => {
                const filesLength = data.filePaths.length
                if (filesLength === 1) {
                    const path: string = data.filePaths[0].replace(/\\/g, "\\")
                    const name: string = path.split(/[\\/]/).pop() || ""
                    console.log("fileInfo---", path, name)
                    resolve({
                        path,
                        name
                    })
                } else if (filesLength > 1) {
                    warn("只支持单选文件")
                }
                resolve(null)
            })
            .catch(() => {
                reject()
            })
    })
}

/**
 * @name 根据文件path获取其内容
 */
export const getCodeByPath = (path: string): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("fetch-file-content", path)
            .then((res) => {
                resolve(res)
            })
            .catch(() => {
                failed("无法获取该文件内容，请检查后后重试！")
                reject()
            })
    })
}

const YakRunnerOpenHistory = "YakRunnerOpenHistory"

/**
 * @name 更改YakRunner历史记录
 */
export const setYakRunnerHistory = (newHistory: YakRunnerHistoryProps) => {
    getRemoteValue(YakRunnerOpenHistory).then((data) => {
        try {
            if (!data) {
                setRemoteValue(YakRunnerOpenHistory, JSON.stringify([newHistory]))
                emiter.emit("onRefreshRunnerHistory", JSON.stringify([newHistory]))
                return
            }
            const historyData: YakRunnerHistoryProps[] = JSON.parse(data)
            const newHistoryData: YakRunnerHistoryProps[] = [
                newHistory,
                ...historyData.filter((item) => item.path !== newHistory.path)
            ].slice(0, 10)
            setRemoteValue(YakRunnerOpenHistory, JSON.stringify(newHistoryData))
            emiter.emit("onRefreshRunnerHistory", JSON.stringify(newHistoryData))
        } catch (error) {}
    })
}

/**
 * @name 获取YakRunner历史记录
 */
export const getYakRunnerHistory = (): Promise<YakRunnerHistoryProps[]> => {
    return new Promise(async (resolve, reject) => {
        getRemoteValue(YakRunnerOpenHistory).then((data) => {
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

/**
 * @name 保存文件
 */
export const saveCodeByFile = (file: FileDetailInfo): Promise<null> => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("write-file", {
                route: file.path,
                data: file.code
            })
            .then(() => {
                resolve(null)
            })
            .catch(() => {
                reject()
            })
    })
}

/**
 * @name 更改名称
 */

export const renameByFile = (file: FileDetailInfo,newName:string): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        const oldPath = file.path
        const newPath = file.path.replace(file.name,newName)
        console.log("xxx",oldPath,newPath);
        
        ipcRenderer
            .invoke("rename-file", {old: oldPath, new: newPath})
            .then(() => {
                resolve(newPath)
            })
            .catch(() => {
                reject()
            })
    })
}
