import { grpcFetchLocalYakVersion } from '@/apiUtils/grpc'
import { yakitFailed } from '@/utils/notification'
import i18n from '@/i18n/i18n'
import { grpcQueryContextMenuActions } from './api'
import { getSceneByTabKey } from './constants'
import type { ContextMenuAction } from './types'
import { SystemInfo } from '@/constants/hardware'

const tOriginal = i18n.getFixedT(null, 'manageRightClickPlugins')

/**
 * 版本号比较（numeric 逐段比较，支持 beta 后缀数字）
 * @param a 当前版本
 * @param b 比较版本
 * @returns a > b 时为 true（等于 b 视为不满足）
 */
function compare(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }) > 0
}

/**
 * 检查引擎版本是否满足右键插件功能要求（跳转管理页前调用）
 */
export const checkContextMenuVersion = (hide?: boolean): Promise<boolean> => {
  return grpcFetchLocalYakVersion(true)
    .then((localVersion) => {
      const isValid = compare(localVersion, '1.4.8-beta14')
      if (!localVersion.includes('dev') && SystemInfo.mode === 'local' && !isValid) {
        !hide && yakitFailed(tOriginal('utils.engineVersionTooLow', { version: '1.4.8-beta14' }))
        return false
      }
      return true
    })
    .catch(() => {
      return true
    })
}

export const fetchSceneActions = async (tabKey: string): Promise<ContextMenuAction[]> => {
  const scene = getSceneByTabKey(tabKey)
  if (!scene) return []
  const response = await grpcQueryContextMenuActions({ Scene: scene, IncludeDisabled: true })
  return response.Actions
}

/** 动作唯一标识是否相同 */
export const isSameAction = (
  a: Pick<ContextMenuAction, 'PluginUUID' | 'ActionID'>,
  b: Pick<ContextMenuAction, 'PluginUUID' | 'ActionID'>,
) => a.PluginUUID === b.PluginUUID && a.ActionID === b.ActionID

/** 按唯一标识给列表项打补丁（无匹配则原样返回） */
export const patchAction = (
  list: ContextMenuAction[],
  target: Pick<ContextMenuAction, 'PluginUUID' | 'ActionID'>,
  patch: Partial<ContextMenuAction>,
) => list.map((i) => (isSameAction(i, target) ? { ...i, ...patch } : i))

export const getSceneTabActions = async (tabKey: string): Promise<{ list: ContextMenuAction[]; noData: boolean }> => {
  const scene = getSceneByTabKey(tabKey)
  if (!scene) return { list: [], noData: true }
  try {
    const response = await grpcQueryContextMenuActions({ Scene: scene, IncludeDisabled: true }, true)
    return {
      list: response.Actions.filter((action) => action.Enabled),
      noData: response.Actions.length === 0,
    }
  } catch {
    return { list: [], noData: true }
  }
}
