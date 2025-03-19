import {APIFunc, APIOptionalFunc} from "@/apiUtils/type"
import {getTypeAndNameByPath} from "@/components/MilkdownEditor/CustomFile/CustomFile"
import {defaultNoteFilter} from "@/defaultConstants/ModifyNotepad"
import {genDefaultPagination} from "@/pages/invoker/schema"
import {DbOperateMessage} from "@/pages/layout/mainOperatorContent/utils"
import {PluginListPageMeta, PluginSearchParams} from "@/pages/plugins/baseTemplateType"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import emiter from "@/utils/eventBus/eventBus"
import {yakitNotify} from "@/utils/notification"
import {openABSFileLocated} from "@/utils/openWebsite"
import {Paging} from "@/utils/yakQueryHTTPFlow"
import cloneDeep from "lodash/cloneDeep"
import {v4 as uuidv4} from "uuid"

const {ipcRenderer} = window.require("electron")

export interface SearchParamsProps extends PluginSearchParams {}
export interface NotepadQuery {
    keyWords: string
    user: string
}

/**
 * /notepad  post 将前端定义类型转换为后端接受的定义类型
 * @param {NotepadQuery} query
 * @param {PluginListPageMeta} pageParams
 * @returns {GetNotepadRequestProps}
 */
export const convertGetNotepadRequest = (
    search: SearchParamsProps,
    pageParams?: PluginListPageMeta
): GetNotepadRequestProps => {
    const data: GetNotepadRequestProps = {
        page: pageParams?.page || 1,
        limit: pageParams?.limit || 20,
        order: pageParams?.order || "desc",
        order_by: pageParams?.order_by || "",
        // search
        keywords: search.type === "keyword" ? search.keyword : "",
        user: search.type === "userName" ? search.userName : ""
    }
    return data
}

export interface GetNotepadRequestProps extends API.GetNotepadRequest, PluginListPageMeta {}
/**
 * @description 获取记事本列表
 * @param query
 * @param hiddenError
 * @returns
 */
export const apiGetNotepadList: APIFunc<GetNotepadRequestProps, API.GetNotepadResponse> = (query, hiddenError) => {
    return new Promise((resolve, reject) => {
        NetWorkApi<GetNotepadRequestProps, API.GetNotepadResponse>({
            method: "get",
            url: "notepad",
            params: {
                page: query.page || 1,
                limit: query.limit || 20,
                order: query.order || "desc",
                order_by: query.order_by || "updated_at"
            },
            data: {...query}
        })
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "获取记事本列表失败:" + err)
                reject(err)
            })
    })
}
/**
 * @description 保存/新建记事本
 * @param params
 * @param hiddenError
 * @returns
 */
export const apiSaveNotepad: APIFunc<API.PostNotepadRequest, string> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        NetWorkApi<API.PostNotepadRequest, string>({
            method: "post",
            url: "notepad",
            data: params
        })
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "保存/新建记事本失败:" + err)
                reject(err)
            })
    })
}

interface NotepadDetailRequest {
    hash: string
}
/**
 * @description 获取记事本详情
 * @param hash
 * @param hiddenError
 * @returns
 */
export const apiGetNotepadDetail: APIFunc<string, API.GetNotepadList> = (hash, hiddenError) => {
    return new Promise((resolve, reject) => {
        NetWorkApi<NotepadDetailRequest, API.GetNotepadList>({
            method: "get",
            url: "notepad/detail",
            params: {
                hash
            }
        })
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "获取记事本详情失败:" + err)
                reject(err)
            })
    })
}

/**
 * @description 删除记事本
 * @param params
 * @param hiddenNotify
 * @returns
 */
export const apiDeleteNotepadDetail: APIFunc<API.DeleteNotepadRequest, API.ActionFailed> = (params, hiddenNotify) => {
    return new Promise((resolve, reject) => {
        NetWorkApi<API.DeleteNotepadRequest, API.ActionFailed>({
            method: "delete",
            url: "notepad",
            data: params
        })
            .then((res) => {
                // 后端返回的结构API.ActionFailed，根据ok判断失败还是成功
                if (res.ok) {
                    if (!hiddenNotify) yakitNotify("success", res.reason)
                } else {
                    if (!hiddenNotify) yakitNotify("error", res.from)
                }
                resolve(res)
            })
            .catch((err) => {
                if (!hiddenNotify) yakitNotify("error", "删除记事本失败:" + err)
                reject(err)
            })
    })
}

export const apiDownloadNotepad: APIFunc<API.NotepadDownloadRequest, string> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        NetWorkApi<API.NotepadDownloadRequest, string>({
            method: "post",
            url: "notepad/download",
            data: params
        })
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "下载记事本失败:" + err)
                reject(err)
            })
    })
}

export const onBaseNotepadDown: APIFunc<API.NotepadDownloadRequest, SaveDialogResponse> = (value) => {
    return new Promise((resolve, reject) => {
        const params: API.NotepadDownloadRequest = {
            ...value
        }
        apiDownloadNotepad(params)
            .then((res) => {
                saveDialogAndGetLocalFileInfo((res as string) || "")
                    .then(resolve)
                    .catch(reject)
            })
            .catch(reject)
    })
}

export interface SaveDialogResponse {
    /**线上链接 */
    url: string
    /**本地保存地址 */
    path: string
    /** 文件名 */
    fileName: string
}

/**
 * @description 打开保存文件框，返回保存信息(路径和文件名)
 * @param url
 * @param hiddenError
 * @returns {url:线上链接;filePath:保存的本地路径;fileName:保存后的最新文件名}
 */
export const saveDialogAndGetLocalFileInfo: APIFunc<string, SaveDialogResponse> = (url, hiddenError) => {
    return new Promise((resolve, reject) => {
        if (!url) {
            if (!hiddenError) yakitNotify("error", "下载链接为空")
            reject("下载链接为空")
            return
        }
        const fileName = getTypeAndNameByPath(url).fileName
        showSaveDialog(fileName).then((res) => {
            const {filePath, name} = res
            if (filePath) {
                const v = {
                    url: url,
                    path: filePath,
                    fileName: name
                }
                resolve(v)
            } else {
                reject("获取保存文件路径错误")
            }
        })
    })
}

export const onOpenLocalFileByPath: APIFunc<string, boolean> = (path, hiddenError) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("is-file-exists", path)
            .then((flag: boolean) => {
                if (flag) {
                    openABSFileLocated(path)
                } else {
                    if (!hiddenError) yakitNotify("error", `目标文件已不存在`)
                }
                resolve(flag)
            })
            .catch((error) => {
                if (!hiddenError) yakitNotify("error", `目标文件已不存在${error}`)
                reject(error)
            })
    })
}

export interface CreateNoteRequest {
    Title: string
    Content: string
}
export interface CreateNoteResponse {
    Message: DbOperateMessage
    NoteId: number
}
/**
 * @description 新建笔记本
 */
export const grpcCreateNote: APIFunc<CreateNoteRequest, CreateNoteResponse> = (params, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("CreateNote", params)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "CreateNote fail:" + e)
                reject(e)
            })
    })
}

export interface UpdateNoteRequest {
    Filter: NoteFilter
    UpdateTitle: boolean
    Title: string
    UpdateContent: boolean
    Content: string
}
/**
 * @description 更新笔记本
 */
export const grpcUpdateNote: APIFunc<UpdateNoteRequest, DbOperateMessage> = (params, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("UpdateNote", params)
            .then((res: DbOperateMessage) => {
                if (res.EffectRows === "0") {
                    // 等于0，更新失败(数据被删除)
                    const message = res.ExtraMessage || "更新失败/数据不存在"
                    emiter.emit("localDataError", JSON.stringify({message, noteId: params?.Filter?.Id[0]}))
                    reject(message)
                } else {
                    resolve(res)
                }
            })
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "UpdateNote fail:" + e)
                reject(e)
            })
    })
}

export interface DeleteNoteRequest {
    Filter: NoteFilter
}
/**
 * @description 删除笔记本
 */
export const grpcDeleteNote: APIFunc<DeleteNoteRequest, DbOperateMessage> = (params, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("DeleteNote", params)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "DeleteNote fail:" + e)
                reject(e)
            })
    })
}

export interface Note {
    Id: number
    Title: string
    Content: string
    CreateAt: number
    UpdateAt: number
}
export interface NoteFilter {
    Id: number[]
    Title: string[]
    Keyword: string[]
}
export interface QueryNoteRequest {
    Filter: NoteFilter
    Pagination: Paging
}
export interface QueryNoteResponse {
    Pagination: Paging
    Data: Note[]
    Total: number
}
/**
 * @description 查询笔记本
 */
export const grpcQueryNote: APIFunc<QueryNoteRequest, QueryNoteResponse> = (params, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("QueryNote", params)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "QueryNote fail:" + e)
                reject(e)
            })
    })
}

/**
 * @description 查询笔记本
 */
export const grpcQueryNoteById: APIFunc<number, Note> = (id, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        const data: QueryNoteRequest = {
            Filter: {
                ...cloneDeep(defaultNoteFilter),
                Id: [id]
            },
            Pagination: genDefaultPagination(1)
        }
        grpcQueryNote(data)
            .then((res) => {
                if (res.Data.length > 0) {
                    resolve(res.Data[0])
                } else {
                    const message = "No data found"
                    emiter.emit("localDataError", JSON.stringify({message, noteId: id}))
                    reject(message)
                }
            })
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "QueryNote fail:" + e)
                reject(e)
            })
    })
}

export interface NoteContent {
    Id: string
    Note: Note
    Index: number
    Length: number
    LineContent: string
}
export interface SearchNoteContentRequest {
    Keyword: string
    // Pagination: Paging
}

export interface SearchNoteContentResponse {
    Pagination: Paging
    Data: NoteContent[]
    Total: number
}
export interface SearchNoteContentTree {
    key: string
    title: string
    children: NoteContent[]
}
export interface SearchNoteContentTreeResponse {
    /**所有的节点key值，树形节点展开/收起 */
    keys: React.Key[]
    Data: SearchNoteContentTree[]
    Total: number
}
/**
 * @description 分享笔记本
 */
export const grpcSearchNoteContent: APIFunc<SearchNoteContentRequest, SearchNoteContentTreeResponse> = (
    params,
    hiddenError
) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("SearchNoteContent", params)
            .then((res: SearchNoteContentResponse) => {
                const data = SearchNoteContentGroupById(res.Data)
                const respose: SearchNoteContentTreeResponse = {
                    Data: data.treeData,
                    Total: res.Total,
                    keys: data.keys
                }
                resolve(respose)
            })
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "SearchNoteContent fail:" + e)
                reject(e)
            })
    })
}
/**
 * @description 根据id进行分组，构建树形结构
 */
const SearchNoteContentGroupById = (arr: NoteContent[]) => {
    let map = {}
    const keys: string[] = []
    let groupList: SearchNoteContentTree[] = []
    const length = arr.length
    for (var i = 0; i < length; i++) {
        var ai = arr[i]
        if (!map[ai.Note.Id]) {
            const id = `${ai.Note.Id}-${uuidv4()}`
            groupList.push({
                key: `${ai.Note.Id}`,
                title: ai.Note.Title,
                children: [{...ai, Id: id}]
            })
            keys.push(`${ai.Note.Id}`)
            map[ai.Note.Id] = ai
        } else {
            for (var j = 0; j < groupList.length; j++) {
                var dj = groupList[j]
                if (dj.key === `${ai.Note.Id}`) {
                    const id = `${ai.Note.Id}-${uuidv4()}`
                    dj.children.push({...ai, Id: id})
                    break
                }
            }
        }
    }
    return {
        treeData: groupList || [],
        keys
    }
}
interface ShowSaveDialogResponse {
    filePath: string
    name: string
}
export const showSaveDialog: APIOptionalFunc<string, ShowSaveDialogResponse> = (fileName, hiddenError) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("show-save-dialog", fileName)
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", `获取保存文件路径错误${err}`)
                reject(err)
            })
    })
}

export interface OpenDialogRequest {
    title?: string
    properties?: string[]
    defaultPath?: string
}
export interface OpenDialogResponse {
    canceled: boolean
    filePaths: string[]
    bookmarks?: string[]
}
export const openDialog: APIOptionalFunc<OpenDialogRequest, OpenDialogResponse> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("openDialog", params)
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", `获取保存文件路径错误${err}`)
                reject(err)
            })
    })
}
