import { NetWorkApi } from '@/services/fetch'
import type { API } from '@/services/swagger/resposeType'

export interface MessageQueryParamsProps {
  page: number
  limit: number
}

export interface MessageQueryDataProps {
  afterId?: number
  beforeId?: number
  isRead?: string
  logType?: string
  status?: number
}

interface MessageQueryProps {}

/** 获取消息中心数据 */
export const apiFetchQueryMessage: (
  params: MessageQueryParamsProps,
  data?: MessageQueryDataProps,
) => Promise<API.MessageLogResponse> = (params, data) => {
  return new Promise((resolve, reject) => {
    NetWorkApi<MessageQueryProps, API.MessageLogResponse>({
      method: 'get',
      url: 'message/log',
      params,
      data,
    })
      .then((res) => {
        resolve(res)
      })
      .catch((err) => {
        reject(err)
      })
      .finally(() => {})
  })
}
interface MessageQueryReadProps {
  isAll: boolean
  hash: string
  excludeHash?: string
}
/** 消息中心已读操作 */
export const apiFetchMessageRead: (data: MessageQueryReadProps) => Promise<boolean> = (data) => {
  return new Promise((resolve, reject) => {
    NetWorkApi<MessageQueryProps, API.ActionSucceeded>({
      method: 'post',
      url: 'message/log',
      data,
    })
      .then((res) => {
        resolve(res.ok)
      })
      .catch((err) => {
        reject(err)
      })
      .finally(() => {})
  })
}

/** 消息中心删除操作 */
export const apiFetchMessageClear: (data: MessageQueryReadProps) => Promise<boolean> = (data) => {
  return new Promise((resolve, reject) => {
    NetWorkApi<MessageQueryProps, API.ActionSucceeded>({
      method: 'delete',
      url: 'message/log',
      data,
    })
      .then((res) => {
        resolve(res.ok)
      })
      .catch((err) => {
        reject(err)
      })
      .finally(() => {})
  })
}

/** 获取需要通知的所有任务（未读的） */
export const apiFetchQueryAllTask: () => Promise<API.MessageLogResponse> = () => {
  return new Promise((resolve, reject) => {
    NetWorkApi<MessageQueryProps, API.MessageLogResponse>({
      method: 'get',
      url: 'message/log',
      params: {
        page: 1,
        limit: -1,
      },
      data: {
        isRead: 'false',
        logType: 'task',
      },
    })
      .then((res) => {
        resolve(res)
      })
      .catch((err) => {
        reject(err)
      })
      .finally(() => {})
  })
}

export type WebMessageSyncType = 'flow' | 'risk'

export interface WebMessageSyncProgress {
  percent: number
}

/** Web 端通知列表 xxx--- 等待后端联调 */
export const apiFetchQueryWebMessage: (
  params: MessageQueryParamsProps,
  data?: MessageQueryDataProps,
) => Promise<API.MessageLogResponse> = (params, data) => {
  return new Promise((resolve, reject) => {
    NetWorkApi<MessageQueryProps, API.MessageLogResponse>({
      method: 'get',
      url: 'message/web/log',
      params,
      data,
    })
      .then((res) => {
        resolve(res)
      })
      .catch((err) => {
        reject(err)
      })
  })
}

/** Web 端通知已读 xxx--- 等待后端联调 */
export const apiFetchWebMessageRead: (data: MessageQueryReadProps) => Promise<boolean> = (data) => {
  return new Promise((resolve, reject) => {
    NetWorkApi<MessageQueryProps, API.ActionSucceeded>({
      method: 'post',
      url: 'message/web/log',
      data,
    })
      .then((res) => {
        resolve(res.ok)
      })
      .catch((err) => {
        reject(err)
      })
  })
}

/** Web 端通知清空 xxx--- 等待后端联调 */
export const apiFetchWebMessageClear: (data: MessageQueryReadProps) => Promise<boolean> = (data) => {
  return new Promise((resolve, reject) => {
    NetWorkApi<MessageQueryProps, API.ActionSucceeded>({
      method: 'delete',
      url: 'message/web/log',
      data,
    })
      .then((res) => {
        resolve(res.ok)
      })
      .catch((err) => {
        reject(err)
      })
  })
}

/** 更新流量 / 漏洞 xxx--- 等待后端联调 */
export const apiFetchWebMessageSync: (data: { type: WebMessageSyncType }) => Promise<API.ActionSucceeded> = (data) => {
  return new Promise((resolve, reject) => {
    NetWorkApi<{ type: WebMessageSyncType }, API.ActionSucceeded>({
      method: 'post',
      url: 'message/web/sync',
      data,
    })
      .then((res) => {
        resolve(res)
      })
      .catch((err) => {
        reject(err)
      })
  })
}

/** 更新流量 / 漏洞进度 xxx--- 等待后端联调 */
export const apiFetchWebMessageSyncProgress: (type: WebMessageSyncType) => Promise<WebMessageSyncProgress> = (type) => {
  return new Promise((resolve, reject) => {
    NetWorkApi<{ type: WebMessageSyncType }, WebMessageSyncProgress>({
      method: 'get',
      url: 'message/web/sync/progress',
      params: { type },
    })
      .then((res) => {
        resolve(res)
      })
      .catch((err) => {
        reject(err)
      })
  })
}
