import { mcpServerForUI, mcpToolForUI, mcpHistoryForUI, grpcPagingToUI, int64ToSafeNumber } from '../grpcAdapters'
import { ipc } from '@/services/ipc'
import type { APIFunc } from '@/apiUtils/type'
import { yakitNotify } from '@/utils/notification'
import type {
  AddMCPServerRequest,
  DeleteMCPToolCallHistoryRequest,
  DeleteMCPServerRequest,
  GetAllMCPServersRequest,
  GetAllMCPServersResponse,
  GetMCPToolCallHistoryDetailRequest,
  GetMCPToolListRequest,
  GetMCPToolListResponse,
  MCPServer,
  MCPToolCallHistory,
  QueryMCPToolCallHistoryRequest,
  QueryMCPToolCallHistoryResponse,
  SetMCPToolEnabledRequest,
  UpdateMCPServerRequest,
} from '../type/aiMCP'
import type { GeneralResponse } from '../type/aiModel'
import { normalizeGetMCPToolListResponse, normalizeMCPServer } from './mcpToolNormalize'

export {
  normalizeGetMCPToolListResponse,
  normalizeMCPToolConfig,
  normalizeMCPToolParam,
  normalizeMCPToolParams,
  resolveMCPToolDescriptionLabel,
} from './mcpToolNormalize'

export const grpcGetAllMCPServers: APIFunc<GetAllMCPServersRequest, GetAllMCPServersResponse> = (
  params,
  hiddenError,
) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'GetAllMCPServers', params)
      .then((res) =>
        resolve({
          ...res,
          MCPServers: res.MCPServers.map(mcpServerForUI),
          Pagination: grpcPagingToUI(res.Pagination),
          Total: int64ToSafeNumber(res.Total),
        }),
      )
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcGetAllMCPServers 失败:' + err)
        reject(err)
      })
  })
}

export const getMCPServersById: APIFunc<string | number, MCPServer> = (id, hiddenError) => {
  return new Promise((resolve, reject) => {
    const newQuery: GetAllMCPServersRequest = {
      Keyword: '',
      Pagination: {
        OrderBy: 'created_at',
        Order: 'desc',
        Page: 1,
        Limit: 1,
      },
      IsShowToolList: true,
      ID: id,
    }
    grpcGetAllMCPServers(newQuery, hiddenError)
      .then((res) => {
        if (res.MCPServers && res.MCPServers.length > 0) {
          resolve(normalizeMCPServer(res.MCPServers[0]))
        } else {
          reject('not found')
        }
      })
      .catch(reject)
  })
}
export const grpcAddMCPServer: APIFunc<AddMCPServerRequest, GeneralResponse> = (params, hiddenError) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'AddMCPServer', params)
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcAddMCPServer 失败:' + err)
        reject(err)
      })
  })
}

export const grpcDeleteMCPServer: APIFunc<DeleteMCPServerRequest, GeneralResponse> = (params, hiddenError) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'DeleteMCPServer', params)
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcDeleteMCPServer 失败:' + err)
        reject(err)
      })
  })
}

export const grpcUpdateMCPServer: APIFunc<UpdateMCPServerRequest, GeneralResponse> = (params, hiddenError) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'UpdateMCPServer', params)
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcUpdateMCPServer 失败:' + err)
        reject(err)
      })
  })
}

export const grpcGetMCPToolList: APIFunc<GetMCPToolListRequest, GetMCPToolListResponse> = (params, hiddenError) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'GetMCPToolList', {
        ...params,
        Source: Array.isArray(params.Source) ? params.Source.join(',') : params.Source,
      })
      .then((res) => {
        resolve(
          normalizeGetMCPToolListResponse({
            ...res,
            Tools: res.Tools.map(mcpToolForUI),
            Pagination: grpcPagingToUI(res.Pagination),
            Total: int64ToSafeNumber(res.Total),
          }),
        )
      })
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcGetMCPToolList 失败:' + err)
        reject(err)
      })
  })
}

export const grpcSetMCPToolEnabled: APIFunc<SetMCPToolEnabledRequest, GeneralResponse> = (params, hiddenError) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'SetMCPToolEnabled', params)
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcSetMCPToolEnabled 失败:' + err)
        reject(err)
      })
  })
}

export const grpcQueryMCPToolCallHistory: APIFunc<QueryMCPToolCallHistoryRequest, QueryMCPToolCallHistoryResponse> = (
  params,
  hiddenError,
) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'QueryMCPToolCallHistory', params)
      .then((res) => {
        resolve({
          ...res,
          Histories: res.Histories.map(mcpHistoryForUI),
          Pagination: grpcPagingToUI(res.Pagination),
          Total: int64ToSafeNumber(res.Total),
        })
      })
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcQueryMCPToolCallHistory 失败:' + err)
        reject(err)
      })
  })
}

export const grpcGetMCPToolCallHistoryDetail: APIFunc<GetMCPToolCallHistoryDetailRequest, MCPToolCallHistory> = (
  params,
  hiddenError,
) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'GetMCPToolCallHistoryDetail', params)
      .then((res) => resolve({ ...res, ...mcpHistoryForUI(res) }))
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcGetMCPToolCallHistoryDetail 失败:' + err)
        reject(err)
      })
  })
}

export const grpcDeleteMCPToolCallHistory: APIFunc<DeleteMCPToolCallHistoryRequest, Record<string, never>> = (
  params,
  hiddenError,
) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'DeleteMCPToolCallHistory', params)
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcDeleteMCPToolCallHistory 失败:' + err)
        reject(err)
      })
  })
}
