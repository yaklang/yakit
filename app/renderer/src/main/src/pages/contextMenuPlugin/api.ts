import { yakitNotify } from '@/utils/notification'
import type {
  ContextMenuAction,
  ExecuteContextMenuActionRequest,
  QueryContextMenuActionsRequest,
  QueryContextMenuActionsResponse,
  SetContextMenuActionBindingRequest,
} from './types'

const { ipcRenderer } = window.require('electron')

export const queryContextMenuActions = async (
  request: QueryContextMenuActionsRequest = {},
): Promise<QueryContextMenuActionsResponse> => {
  const response = (await ipcRenderer.invoke('QueryContextMenuActions', request)) as QueryContextMenuActionsResponse
  return {
    Actions: response?.Actions || [],
    EnabledCustomPluginCount: Number(response?.EnabledCustomPluginCount || 0),
    MaxCustomPluginCount: Number(response?.MaxCustomPluginCount || 15),
  }
}

export const setContextMenuActionBinding = async (
  request: SetContextMenuActionBindingRequest,
): Promise<ContextMenuAction> => {
  return ipcRenderer.invoke('SetContextMenuActionBinding', request)
}

export const executeContextMenuAction = async (request: ExecuteContextMenuActionRequest, token: string) => {
  return ipcRenderer.invoke('ExecuteContextMenuAction', request, token)
}

export const cancelContextMenuAction = async (token: string) => {
  return ipcRenderer.invoke('cancel-ExecuteContextMenuAction', token).catch((error) => {
    yakitNotify('error', `取消右键插件失败: ${error}`)
  })
}
