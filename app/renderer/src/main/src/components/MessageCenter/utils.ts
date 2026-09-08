import { NetWorkApi } from '@/services/fetch'
import type { API } from '@/services/swagger/resposeType'

const { ipcRenderer } = window.require('electron')

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

export interface FromOnlineProgress {
  Progress?: number
  Log?: string
}

/** Progress 归一化为 0–100 */
export const normalizeFromOnlinePercent = (progress?: number): number => {
  const raw = Number(progress) || 0
  const percent = raw <= 1 ? raw * 100 : raw
  return Math.max(0, Math.min(100, percent))
}

export interface FromOnlineStreamHandlers {
  onProgress: (percent: number, log?: string) => void
  onError: (error: unknown) => void
  onEnd: () => void
}

const startFromOnlineStream = (
  channel: 'HTTPFlowsFromOnline' | 'RisksFromOnline',
  cancelChannel: 'cancel-HTTPFlowsFromOnline' | 'cancel-RisksFromOnline',
  loginToken: string,
  streamToken: string,
  handlers: FromOnlineStreamHandlers,
) => {
  const onData = (_: unknown, data: FromOnlineProgress) => {
    handlers.onProgress(normalizeFromOnlinePercent(data?.Progress), data?.Log)
  }
  const onError = (_: unknown, error: unknown) => {
    handlers.onError(error)
  }
  const onEnd = () => {
    handlers.onEnd()
  }

  ipcRenderer.on(`${streamToken}-data`, onData)
  ipcRenderer.on(`${streamToken}-error`, onError)
  ipcRenderer.on(`${streamToken}-end`, onEnd)

  ipcRenderer.invoke(channel, { Token: loginToken }, streamToken).catch((err) => {
    handlers.onError(err)
  })

  return () => {
    ipcRenderer.invoke(cancelChannel, streamToken).catch(() => {})
    ipcRenderer.removeListener(`${streamToken}-data`, onData)
    ipcRenderer.removeListener(`${streamToken}-error`, onError)
    ipcRenderer.removeListener(`${streamToken}-end`, onEnd)
  }
}

/** 消息中心更新流量：HTTPFlowsFromOnline */
export const apiHTTPFlowsFromOnline = (
  loginToken: string,
  streamToken: string,
  handlers: FromOnlineStreamHandlers,
) => {
  return startFromOnlineStream(
    'HTTPFlowsFromOnline',
    'cancel-HTTPFlowsFromOnline',
    loginToken,
    streamToken,
    handlers,
  )
}

/** 消息中心更新漏洞：RisksFromOnline */
export const apiRisksFromOnline = (
  loginToken: string,
  streamToken: string,
  handlers: FromOnlineStreamHandlers,
) => {
  return startFromOnlineStream('RisksFromOnline', 'cancel-RisksFromOnline', loginToken, streamToken, handlers)
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
