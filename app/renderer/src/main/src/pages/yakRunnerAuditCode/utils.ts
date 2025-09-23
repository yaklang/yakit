import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RequestYakURLResponse, YakURLResource} from "../yakURLTree/data"
import {FileDefault, FileSuffix, FolderDefault} from "../yakRunner/FileTree/icon"
import {AuditDetailItemProps, AuditYakUrlProps} from "./AuditCode/AuditCodeType"

import emiter from "@/utils/eventBus/eventBus"
import {failed, warn} from "@/utils/notification"
import {AreaInfoProps, OpenFileByPathProps, TabFileProps, YakRunnerHistoryProps} from "./YakRunnerAuditCodeType"
import cloneDeep from "lodash/cloneDeep"
import {randomString} from "@/utils/randomUtil"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import {FileDetailInfo, OptionalFileDetailInfo, Selection} from "./RunnerTabs/RunnerTabsType"
import {v4 as uuidv4} from "uuid"
import {FileNodeMapProps, FileNodeProps} from "./FileTree/FileTreeType"
import {QuerySSARisksResponse, SSARisk} from "../yakRunnerAuditHole/YakitAuditHoleTable/YakitAuditHoleTableType"
import {SeverityMapTag} from "../risks/YakitRiskTable/YakitRiskTable"
import {CodeRangeProps} from "./RightAuditDetail/RightAuditDetail"
import {
    QuerySyntaxFlowScanTaskRequest,
    QuerySyntaxFlowScanTaskResponse
} from "../yakRunnerCodeScan/CodeScanTaskListDrawer/CodeScanTaskListDrawer"
import {genDefaultPagination} from "../invoker/schema"
import {APIFunc} from "@/apiUtils/type"
import {JumpToAuditEditorProps} from "./BottomEditorDetails/BottomEditorDetailsType"
import {getNameByPath, initFileTreeData} from "../yakRunner/utils"
const {ipcRenderer} = window.require("electron")

const getLineFun = (info: YakURLResource) => {
    try {
        if (info.ResourceType === "risk") {
            const result = info.Extra.find((item) => item.Key === "code_range")?.Value
            if (result) {
                const item: CodeRangeProps = JSON.parse(result)
                const {start_line} = item
                return start_line
            }
        }
        return undefined
    } catch (error) {}
}

const initRiskOrRuleTreeData = (list: RequestYakURLResponse, path) => {
    return list.Resources.sort((a, b) => {
        // 将 ResourceType 为 'program'与'source' 的对象排在前面
        if (["program", "source"].includes(a.ResourceType) && !["program", "source"].includes(b.ResourceType)) {
            return -1 // a排在b前面
        } else if (!["program", "source"].includes(a.ResourceType) && ["program", "source"].includes(b.ResourceType)) {
            return 1 // b排在a前面
        } else {
            return 0 // 保持原有顺序
        }
    }).map((item) => {
        const isFile = !item.HaveChildrenNodes
        const isFolder = item.HaveChildrenNodes
        let suffix = isFile && item.ResourceName.indexOf(".") > -1 ? item.ResourceName.split(".").pop() : ""
        const count = item.Extra.find((item) => item.Key === "count")?.Value
        const name = item.ResourceName.split("/").pop() || ""
        const severity = item.Extra.find((item) => item.Key === "severity")?.Value
        const severityValue = SeverityMapTag.find((item) => item.key.includes(severity || ""))?.value
        let folderIcon = FolderDefault
        let description: string | undefined = undefined
        let line: number | undefined = undefined
        if (item.ResourceType === "source") {
            folderIcon = FileSuffix[item.ResourceName.split(".").pop() || ""]
            description = path ? item.Path.replace(path, "") : item.Path
        }
        if (item.ResourceType === "function") {
            folderIcon = FileSuffix["function"]
        }
        if (item.ResourceType === "risk") {
            line = getLineFun(item)
        }
        if (item.ResourceType === "risk" && severityValue) {
            suffix = severityValue
        }
        return {
            parent: path || null,
            name,
            path: item.Path,
            isFolder,
            icon: isFolder ? folderIcon : suffix ? FileSuffix[suffix] || FileDefault : FileDefault,
            isLeaf: isFile,
            count,
            description,
            line,
            data: item
        }
    })
}

/**
 * @name 审计完整树获取
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
            const data: FileNodeMapProps[] = initFileTreeData(res, path)
            resolve({res, data})
        } catch (error) {
            reject(error)
        }
    })
}

/**
 * @name 漏洞文件/规则汇总树获取
 */
export const grpcFetchRiskOrRuleTree: (
    path: string,
    Query: {
        program: string
        type: "risk" | "file" | "rule"
        search?: string
        task_id?: string
        result_id?: string
        increment?: boolean
    }
) => Promise<{res: RequestYakURLResponse; data: FileNodeMapProps[]}> = (
    path,
    {program, type, search, task_id, result_id, increment}
) => {
    return new Promise(async (resolve, reject) => {
        // ssadb path为/时 展示最近编译
        const params = {
            Method: "GET",
            Url: {
                Schema: "ssarisk",
                Path: path,
                Query: [
                    {
                        Key: "type",
                        Value: type
                    },
                    {
                        Key: "program",
                        Value: type !== "risk" ? program : ""
                    },
                    {
                        Key: "search",
                        Value: search
                    },
                    {
                        Key: "task_id",
                        Value: task_id
                    },
                    {
                        Key: "result_id",
                        Value: result_id
                    },
                ]
            }
        }
        if(increment){
            params.Url.Query.push({
                Key: "increment",
                Value: "true"
            })
        }
        try {
            const res: RequestYakURLResponse = await ipcRenderer.invoke("RequestYakURL", params)
            const data: FileNodeMapProps[] = initRiskOrRuleTreeData(res, path === "/" ? program : path)
            resolve({res, data})
        } catch (error) {
            reject(error)
        }
    })
}

/**
 * @name 漏洞文件/规则汇树筛选列表获取
 */
export const grpcFetchAuditCodeRiskOrRuleList: (Programs: string) => Promise<QuerySyntaxFlowScanTaskResponse> = (
    Programs
) => {
    return new Promise(async (resolve, reject) => {
        const params: QuerySyntaxFlowScanTaskRequest = {
            Pagination: genDefaultPagination(100, 1),
            Filter: {
                Programs: [Programs],
                HaveRisk: true
            }
        }
        try {
            const res: QuerySyntaxFlowScanTaskResponse = await ipcRenderer.invoke("QuerySyntaxFlowScanTask", params)
            resolve(res)
        } catch (error) {
            reject(error)
        }
    })
}

/**
 * @name 代码审计
 */
export const loadAuditFromYakURLRaw = (
    params: AuditYakUrlProps,
    body?: Buffer,
    Page?: number,
    PageSize?: number
): Promise<RequestYakURLResponse | null> => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("RequestYakURL", {
                Method: "GET",
                Url: params,
                Body: body,
                Page,
                PageSize
            })
            .then((rsp: RequestYakURLResponse) => {
                resolve(rsp)
            })
            .catch((e) => {
                reject(e)
            })
    })
}

const YakRunnerAuditOpenHistory = "YakRunnerAuditOpenHistory"

/**
 * @name 更改Audit历史记录
 */
export const setAuditCodeHistory = (newHistory: YakRunnerHistoryProps) => {
    getRemoteValue(YakRunnerAuditOpenHistory).then((data) => {
        try {
            if (!data) {
                setRemoteValue(YakRunnerAuditOpenHistory, JSON.stringify([newHistory]))
                emiter.emit("onCodeAuditRefreshAduitHistory", JSON.stringify([newHistory]))
                return
            }
            const historyData: YakRunnerHistoryProps[] = JSON.parse(data)
            const newHistoryData: YakRunnerHistoryProps[] = [
                newHistory,
                ...historyData.filter((item) => item.path !== newHistory.path)
            ].slice(0, 10)
            setRemoteValue(YakRunnerAuditOpenHistory, JSON.stringify(newHistoryData))
            emiter.emit("onCodeAuditRefreshAduitHistory", JSON.stringify(newHistoryData))
        } catch (error) {
            failed(`历史记录异常，重置历史 ${error}`)
            setRemoteValue(YakRunnerAuditOpenHistory, JSON.stringify([]))
        }
    })
}

/**
 * @name 获取Audit历史记录
 */
export const getAuditCodeHistory = (): Promise<YakRunnerHistoryProps[]> => {
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

/**
 * @name 判断分栏数据里是否存在审计代码框
 */
export const judgeAreaExistAuditPath = (areaInfo: AreaInfoProps[]): Promise<string[]> => {
    return new Promise(async (resolve, reject) => {
        const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
        let hasPath: string[] = []
        newAreaInfo.forEach((item, index) => {
            item.elements.forEach((itemIn, indexIn) => {
                itemIn.files.forEach((file, fileIndex) => {
                    if (file.fileSourceType === "audit") {
                        hasPath.push(file.path)
                    }
                })
            })
        })
        resolve(hasPath)
    })
}

/**
 * @name 删除分栏数据里多个节点的file数据并重新布局
 */
export const removeAuditCodeAreaFilesInfo = (areaInfo: AreaInfoProps[], removePath: string[]) => {
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
export const setAuditCodeAreaFileActive = (areaInfo: AreaInfoProps[], path: string) => {
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
 * @name 更新分栏数据里某个节点的file数据
 */
// 根据path更新指定内容
export const updateAuditCodeAreaFileInfo = (areaInfo: AreaInfoProps[], data: OptionalFileDetailInfo, path: string) => {
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
 * @name 判断分栏数据里是否存在某个节点file数据
 */
export const judgeAuditCodeAreaExistFilePath = (
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
 * @name 新增分栏数据里某个节点的file数据
 */
export const addAuditCodeAreaFileInfo = (
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

/**
 * @name 删除分栏数据里某个节点的file数据
 */
export const removeAuditCodeAreaFileInfo = (areaInfo: AreaInfoProps[], info: FileDetailInfo) => {
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
 * @name 漏洞汇总
 */
export const onSyntaxRisk = ({ProgramName, CodeSourceUrl, RuntimeID}) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("QuerySSARisks", {
                Filter: {
                    ProgramName,
                    CodeSourceUrl,
                    RuntimeID
                }
            })
            .then((res: QuerySSARisksResponse) => {
                const {Data} = res
                resolve(Data)
            })
            .catch(() => {
                resolve([])
            })
    })
}

/**
 * @name 注入漏洞汇总结果
 */
export const getAuditCodeDefaultActiveFile = async (
    info: FileDetailInfo,
    ProgramName: string[],
    CodeSourceUrl: string[],
    RuntimeID: string[]
) => {
    // if (info.syntaxCheck) {
    //     return info
    // }
    let newActiveFile = info
    try {
        if (CodeSourceUrl.length > 0) {
            // 注入漏洞汇总结果
            const syntaxCheck = (await onSyntaxRisk({ProgramName, CodeSourceUrl, RuntimeID})) as SSARisk[]
            if (syntaxCheck) {
                newActiveFile = {...newActiveFile, syntaxCheck}
            }
        }
    } catch (error) {}
    return newActiveFile
}

/**
 * @name 更改项是否包含激活展示文件，包含则取消激活
 */
export const isResetAuditCodeActiveFile = (
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
 * @name 文件树重命名
 */
export const grpcFetchAuditCodeRenameFileTree: (
    path: string,
    newName: string,
    parentPath: string | null
) => Promise<FileNodeMapProps[]> = (path, newName, parentPath) => {
    return new Promise(async (resolve, reject) => {
        const params = {
            Method: "POST",
            Url: {
                Schema: "file",
                Query: [
                    {Key: "op", Value: "rename"},
                    {
                        Key: "newname",
                        Value: newName
                    }
                ],
                Path: path
            }
        }
        try {
            const list: RequestYakURLResponse = await ipcRenderer.invoke("RequestYakURL", params)
            // console.log("文件树重命名", params, list)
            const data: FileNodeMapProps[] = initFileTreeData(list, parentPath)
            resolve(data)
        } catch (error) {
            reject(error)
        }
    })
}

/**Extra找到code_range，根据其进行跳转到文件对应的位置 */
export const onJumpByCodeRange: APIFunc<AuditDetailItemProps, null> = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            const arr = data.Extra.filter((item) => item.Key === "code_range")
            if (arr.length > 0) {
                const item: CodeRangeProps = JSON.parse(arr[0].Value)
                const {url, start_line, start_column, end_line, end_column} = item
                const name = await getNameByPath(url)
                // console.log("monaca跳转", item, name)
                const highLightRange: Selection = {
                    startLineNumber: start_line,
                    startColumn: start_column,
                    endLineNumber: end_line,
                    endColumn: end_column
                }
                const OpenFileByPathParams: OpenFileByPathProps = {
                    params: {
                        path: url,
                        name,
                        highLightRange
                    }
                }
                emiter.emit("onCodeAuditOpenFileByPath", JSON.stringify(OpenFileByPathParams))
                // 纯跳转行号
                setTimeout(() => {
                    const obj: JumpToAuditEditorProps = {
                        selections: highLightRange,
                        path: url,
                        isSelect: false
                    }
                    emiter.emit("onCodeAuditJumpEditorDetail", JSON.stringify(obj))
                }, 100)
                resolve(null)
            } else {
                reject("未找到code_range字段,无法跳转")
            }
        } catch (error) {
            reject(error)
        }
    })
}
