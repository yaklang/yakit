import {failed, warn, yakitNotify} from "@/utils/notification"
import {CodeScoreSmokingEvaluateResponseProps} from "../plugins/funcTemplateType"
import {RequestYakURLResponse} from "../yakURLTree/data"
import {FileNodeMapProps, FileNodeProps, FileTreeListProps} from "./FileTree/FileTreeType"
import {FileDefault, FileSuffix, FolderDefault} from "./FileTree/icon"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import {
    ConvertYakStaticAnalyzeErrorToMarker,
    IMonacoEditorMarker,
    YakStaticAnalyzeErrorResult
} from "@/utils/editorMarkers"
import {AreaInfoProps, TabFileProps, YakJavaDecompilerHistoryProps} from "./YakJavaDecompilerType"
import cloneDeep from "lodash/cloneDeep"
import {FileDetailInfo, OptionalFileDetailInfo} from "./RunnerTabs/RunnerTabsType"
import {v4 as uuidv4} from "uuid"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import emiter from "@/utils/eventBus/eventBus"
import {setMapFileDetail} from "./FileTreeMap/FileMap"
import {setMapFolderDetail} from "./FileTreeMap/ChildMap"
import {YaklangMonacoSpec} from "@/utils/monacoSpec/yakEditor"
import {SyntaxFlowMonacoSpec} from "@/utils/monacoSpec/syntaxflowEditor"

const {ipcRenderer} = window.require("electron")

const initFileTreeData = (list: RequestYakURLResponse, path) => {
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
            path: `${path.replace(/\/+$/, "")}\\${item.VerboseName}`,
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
export const grpcFetchFileTree: (path: string) => Promise<FileNodeMapProps[]> = (path) => {
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
            const data: FileNodeMapProps[] = initFileTreeData(res, path)
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
export const getCodeByPath = (path: string): Promise<string> => {
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
                const exportHex = res.Resources[0].Extra.find((kv) => kv.Key === "content")
                if (exportHex) {
                    try {
                        const content = Buffer.from(exportHex.Value, "hex")

                        // 创建并下载ZIP文件
                        const fileName = projectName.split("/").pop() || "decompiled.zip"
                        const a = document.createElement("a")
                        const blob = new Blob([content], {type: "application/zip"})
                        a.href = URL.createObjectURL(blob)
                        a.download = `${fileName.replace(/\.(jar|war|ear)$/, "")}_decompiled.zip`
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)

                        yakitNotify("success", "已导出反编译ZIP文件")
                        resolve(null)
                    } catch (err) {
                        failed(`导出ZIP文件失败: ${err}`)
                        reject(err)
                    }
                } else {
                    failed("导出内容不可用")
                    reject("导出内容不可用")
                }
            } else {
                failed("导出内容不可用")
                reject("导出内容不可用")
            }
        } catch (error) {
            reject(error)
        }
    })
}

/**
 * @name 更新树数据里某个节点的children数据
 */
export const updateFileTree: (
    oldFileTree: FileTreeListProps[],
    path: string,
    updateData: FileTreeListProps[]
) => FileTreeListProps[] = (oldFileTree, path, updateData) => {
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
export const onSyntaxCheck = (code: string, type: string) => {
    return new Promise(async (resolve, reject) => {
        // StaticAnalyzeError
        ipcRenderer
            .invoke("StaticAnalyzeError", {Code: StringToUint8Array(code), PluginType: type})
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
 * @name 判断分栏数据里是否存在未保存文件
 */
export const judgeAreaExistFileUnSave = (areaInfo: AreaInfoProps[]): Promise<string[]> => {
    return new Promise(async (resolve, reject) => {
        let unSaveArr: string[] = []
        const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
        newAreaInfo.forEach((item, index) => {
            item.elements.forEach((itemIn, indexIn) => {
                itemIn.files.forEach((file, fileIndex) => {
                    if (file.isUnSave) {
                        unSaveArr.push(file.path)
                    }
                })
            })
        })
        resolve(unSaveArr)
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
 * @name 判断分栏数据里是否存在某些节点file数据
 */
export const judgeAreaExistFilesPath = (areaInfo: AreaInfoProps[], pathArr: string[]): Promise<FileDetailInfo[]> => {
    return new Promise(async (resolve, reject) => {
        const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
        let hasArr: FileDetailInfo[] = []
        newAreaInfo.forEach((item, index) => {
            item.elements.forEach((itemIn, indexIn) => {
                itemIn.files.forEach((file, fileIndex) => {
                    if (pathArr.includes(file.path)) {
                        hasArr.push(file)
                    }
                })
            })
        })
        resolve(hasArr)
    })
}

/**
 * @name 更新分栏数据里某个节点的file数据
 */
// 根据path更新指定内容
export const updateAreaFileInfo = (areaInfo: AreaInfoProps[], data: OptionalFileDetailInfo, path: string) => {
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
 * @name 更新分栏数据里某些节点file数据为被删除待保存状态
 */
export const updateAreaFileInfoToDelete = (areaInfo: AreaInfoProps[], path?: string) => {
    const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
    newAreaInfo.forEach((item, index) => {
        item.elements.forEach((itemIn, indexIn) => {
            itemIn.files.forEach((file, fileIndex) => {
                if (path && (file.path === path || file.path.startsWith(path))) {
                    newAreaInfo[index].elements[indexIn].files[fileIndex] = {
                        ...newAreaInfo[index].elements[indexIn].files[fileIndex],
                        isDelete: true,
                        isUnSave: true,
                        path: `${uuidv4()}-Delete`
                    }
                }
            })
        })
    })
    return newAreaInfo
}

/**
 * @name 更新分栏数据里所选节点的path与parent信息(重命名文件夹导致其内部文件path与parent发生变化)
 */
export const updateAreaFilesPathInfo = (
    areaInfo: AreaInfoProps[],
    path: string[],
    oldPath: string,
    newPath: string
) => {
    const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
    newAreaInfo.forEach((item, index) => {
        item.elements.forEach((itemIn, indexIn) => {
            itemIn.files.forEach((file, fileIndex) => {
                if (path.includes(file.path)) {
                    newAreaInfo[index].elements[indexIn].files[fileIndex] = {
                        ...newAreaInfo[index].elements[indexIn].files[fileIndex],
                        path: file.path.replace(oldPath, newPath),
                        parent: file.parent ? file.parent.replace(oldPath, newPath) : null
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
                    // 存在多项则只移除删除项
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
 * @name 删除分栏数据里多个节点的file数据并重新布局
 */
export const removeAreaFilesInfo = (areaInfo: AreaInfoProps[], removePath: string[]) => {
    // 如若有为空项则删除
    const buildAreaInfo = (areaInfo) => {
        const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
        // 移除elements中的files层
        newAreaInfo.forEach((item, idx) => {
            item.elements.forEach((itemIn, idxin) => {
                if (itemIn.files.length === 0) {
                    newAreaInfo[idx].elements = newAreaInfo[idx].elements.filter((item) => item.id !== itemIn.id)
                }
            })
        })
        // 移除elements层
        let indexArr: number[] = [] // 还有数据的项目
        newAreaInfo.forEach((item, idx) => {
            if (item.elements.length !== 0) {
                indexArr.push(idx)
            }
        })
        let resultAreaInfo: AreaInfoProps[] = []
        indexArr.forEach((index) => {
            resultAreaInfo.push(newAreaInfo[index])
        })
        return resultAreaInfo
    }

    const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
    newAreaInfo.forEach((item, idx) => {
        item.elements.forEach((itemIn, idxin) => {
            itemIn.files.forEach((file, fileIndex) => {
                if (removePath.includes(file.path)) {
                    newAreaInfo[idx].elements[idxin].files = itemIn.files.filter((item) => item.path !== file.path)
                }
            })
        })
    })
    return buildAreaInfo(newAreaInfo)
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
 * @name 更改激活展示文件
 */
export const updateActiveFile = (activeFile: FileDetailInfo, data: OptionalFileDetailInfo, path?: string) => {
    let newActiveFile: FileDetailInfo = cloneDeep(activeFile)
    newActiveFile = {...newActiveFile, ...data}
    return newActiveFile
}

/**
 * @name 更改项是否包含激活展示文件，包含则取消激活
 */
export const isResetActiveFile = (
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
 * @name 获取打开文件的path与name
 */
export const getOpenFileInfo = (): Promise<{path: string; name: string} | null> => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("openDialog", {
                title: "请选择文件",
                properties: ["openFile"]
            })
            .then(async (data: {filePaths: string[]}) => {
                const filesLength = data.filePaths.length
                if (filesLength === 1) {
                    const path: string = data.filePaths[0].replace(/\\/g, "\\")
                    const name: string = await getNameByPath(path)
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

const YakDecompilerOpenHistory = "YakDecompilerOpenHistory"
const YakDecompilerLastFolderExpanded = "YakDecompilerLastFolderExpanded"

/**
 * @name 更改YakRunner历史记录
 */
export const setYakRunnerHistory = (newHistory: YakJavaDecompilerHistoryProps) => {
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
 * @name 获取YakRunner历史记录
 */
export const getYakRunnerHistory = (): Promise<YakJavaDecompilerHistoryProps[]> => {
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
export const setYakRunnerLastFolderExpanded = (cache: YakRunnerLastFolderExpandedProps) => {
    const newCache = JSON.stringify(cache)
    setRemoteValue(YakDecompilerLastFolderExpanded, newCache)
}

/**
 * @name 获取上次打开的文件夹及其展开项
 */
export const getYakRunnerLastFolderExpanded = (): Promise<YakRunnerLastFolderExpandedProps | null> => {
    return new Promise(async (resolve, reject) => {
        getRemoteValue(YakDecompilerLastFolderExpanded).then((data) => {
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
 * @name 获取上一级的路径（兼容多系统）
 */
export const getPathParent = (filePath: string): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("pathParent", {
                filePath
            })
            .then((currentPath: string) => {
                resolve(currentPath)
            })
            .catch(() => {
                resolve("")
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

/**
 * @name 获取相对路径（兼容多系统）
 */
export const getRelativePath = (basePath: string, filePath: string): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("relativePathByBase", {
                basePath,
                filePath
            })
            .then((relativePath: string) => {
                resolve(relativePath)
            })
            .catch(() => {
                resolve("")
            })
    })
}

/**
 * @name 编辑器代码类型判断
 */
export const monacaLanguageType = (suffix?: string) => {
    switch (suffix) {
        case "yak":
            return YaklangMonacoSpec
        case "sf":
            return SyntaxFlowMonacoSpec
        default:
            return undefined
    }
}
