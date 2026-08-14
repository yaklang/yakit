import type { APIFunc } from '@/apiUtils/type'
import { yakitNotify } from '@/utils/notification'
import type { Paging } from '@/utils/yakQueryHTTPFlow'

const { ipcRenderer } = window.require('electron')

export interface SaveFuzzerConfigRequest {
  Data: FuzzerConfig[]
}

export interface QueryFuzzerConfigRequest {
  PageId?: string[]
  Pagination: Paging
}

export interface QueryFuzzerConfigResponse {
  Data: FuzzerConfig[]
}

export interface FuzzerConfig {
  PageId: string
  Type: 'page' | 'pageGroup'
  Config: string
}

/**
 * 服务端推送的 Web Fuzzer 标签控制载荷。
 * 与后端 WebFuzzerTabPush 对齐，支持 create/update/delete 三种动作：
 *  - create：使用 data 字段批量新建标签/分组；
 *  - update：使用 changedData 字段更新已有节点；
 *  - delete：使用 pageIds 字段删除指定节点。
 * openFlag 控制变更后是否将 Web Fuzzer 切换为当前顶层页，以及是否聚焦到变更的子标签。
 */
export interface WebFuzzerTabPush {
  action?: 'create' | 'update' | 'delete'
  openFlag?: boolean
  data?: FuzzerConfig[]
  changedData?: FuzzerConfig[]
  pageIds?: string[]
}

export interface DbOperateMessage {
  //表名 数据源
  TableName: string
  //操作 (增删改查)
  Operation: string
  //影响行数
  EffectRows: string
  //额外信息
  ExtraMessage: string
}
export const apiSaveFuzzerConfig: APIFunc<SaveFuzzerConfigRequest, DbOperateMessage> = (params, hiddenError) => {
  return new Promise(async (resolve, reject) => {
    ipcRenderer
      .invoke('SaveFuzzerConfig', params)
      .then(resolve)
      .catch((e) => {
        if (!hiddenError) yakitNotify('error', '保存fuzzer历史失败:' + e)
        reject(e)
      })
  })
}

export const apiQueryFuzzerConfig: APIFunc<QueryFuzzerConfigRequest, QueryFuzzerConfigResponse> = (
  params,
  hiddenError,
) => {
  return new Promise(async (resolve, reject) => {
    ipcRenderer
      .invoke('QueryFuzzerConfig', params)
      .then(resolve)
      .catch((e) => {
        if (!hiddenError) yakitNotify('error', '查询fuzzer历史失败:' + e)
        reject(e)
      })
  })
}

export interface DeleteFuzzerConfigRequest {
  PageId: string[]
  DeleteAll: boolean
}
export const apiDeleteFuzzerConfig: APIFunc<DeleteFuzzerConfigRequest, DbOperateMessage> = (params, hiddenError) => {
  return new Promise(async (resolve, reject) => {
    ipcRenderer
      .invoke('DeleteFuzzerConfig', params)
      .then(resolve)
      .catch((e) => {
        if (!hiddenError) yakitNotify('error', '删除fuzzer历史失败:' + e)
        reject(e)
      })
  })
}
