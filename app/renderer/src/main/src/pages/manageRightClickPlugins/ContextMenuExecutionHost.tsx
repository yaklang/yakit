import React, { useEffect, useRef, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import { PluginHasParamsModal } from '@/components/pluginHasParamsDrawer/PluginHasParamsDrawer'
import { YakitRoute } from '@/enums/yakitRoute'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { YakExecutorParam } from '@/pages/invoker/YakExecutorParams'
import type { YakParamProps } from '@/pages/plugins/pluginsType'
import type {
  CustomPluginExecuteFormValue,
  YakExtraParamProps,
} from '@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType'
import { getValueByType, ParamsToGroupByGroupName } from '@/pages/plugins/editDetails/utils'
import emiter from '@/utils/eventBus/eventBus'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import { yakitNotify } from '@/utils/notification'
import { registerContextMenuExecution } from './executionRegistry'
import type { RunContextMenuActionOptions } from './types'

interface ParamsModalValue {
  /** 表单初始值（key = 参数 Field，value = 默认值或缓存值） */
  initFormValue: CustomPluginExecuteFormValue
  /** 必填参数定义列表 */
  requiredParams: YakParamProps[]
  /** 选填参数定义列表（按 Group 分组） */
  groupParams: YakExtraParamProps[]
}

const emptyParamsModalValue: ParamsModalValue = {
  initFormValue: {},
  requiredParams: [],
  groupParams: [],
}

/**
 * 生成参数缓存的 kv key
 * 按 (PluginUUID, ActionID) 粒度缓存
 */
const getParamsCacheKey = (options: RunContextMenuActionOptions) =>
  `context-menu-params:${options.action.PluginUUID}:${options.action.ActionID}`

/**
 * 构建参数弹窗初始值：先用各参数的 DefaultValue 生成表单默认值，再用缓存值覆盖
 * @param params 插件声明的参数定义列表
 * @param cache kv 缓存的上次保存的参数值
 */
const getParamsModalValue = (params: YakParamProps[], cache: YakExecutorParam[] = []): ParamsModalValue => {
  const initFormValue: CustomPluginExecuteFormValue = {}
  params.forEach((item) => {
    initFormValue[item.Field] = getValueByType(item.DefaultValue, item.TypeVerbose)
  })
  cache.forEach((item) => {
    if (Object.prototype.hasOwnProperty.call(initFormValue, item.Key)) {
      initFormValue[item.Key] = item.Value
    }
  })

  return {
    initFormValue,
    requiredParams: params.filter((item) => item.Required),
    groupParams: ParamsToGroupByGroupName(params.filter((item) => !item.Required)),
  }
}

const parseCachedParams = (value: string): YakExecutorParam[] => {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** 判断参数值是否有效（非 undefined/null/空字符串） */
const hasParamValue = (value: unknown) => value !== undefined && value !== null && `${value}`.length > 0

/**
 * 检查必填参数是否缺失（既无缓存值也无默认值）
 * 只要有一个必填参数两头都空，就返回 true——这是"是否强制弹框"的判断依据
 */
const isRequiredParamMissing = (params: YakParamProps[], values: YakExecutorParam[]) => {
  const valueMap = new Map(values.map((item) => [item.Key, item.Value]))
  return params.some(
    (item) => item.Required && !hasParamValue(valueMap.get(item.Field)) && !hasParamValue(item.DefaultValue),
  )
}

/**
 * 职责：接收 runContextMenuAction 事件 → 决定是否弹参数框 → 注册执行并打开结果页
 */
export const ContextMenuExecutionHost: React.FC = React.memo(() => {
  const { t } = useI18nNamespaces(['manageRightClickPlugins'])
  const pendingRef = useRef<RunContextMenuActionOptions>()
  const loadingRef = useRef<boolean>(false)
  const [paramsVisible, setParamsVisible] = useState(false)
  const [paramsModalValue, setParamsModalValue] = useState<ParamsModalValue>(emptyParamsModalValue)

  /**
   * 启动执行：注册到 executionRegistry 拿 executionID，然后新开「右键插件结果」Tab
   * 本期统一以新开 Tab 展示执行结果（含 Auto/Dialog/Drawer，均降级为 Tab）
   * TODO: dialog
   * TODO: drawer
   */
  const launch = useMemoizedFn((options: RunContextMenuActionOptions, params: YakExecutorParam[] = []) => {
    const executionID = registerContextMenuExecution({ ...options, params })
    emiter.emit(
      'openPage',
      JSON.stringify({
        route: YakitRoute.ContextMenuResult,
        params: {
          executionID,
          pluginName: options.action.PluginName,
        },
      }),
    )
  })

  const loadCachedParams = async (options: RunContextMenuActionOptions): Promise<YakExecutorParam[]> => {
    const raw = (await getRemoteValue(getParamsCacheKey(options))) || ''
    return parseCachedParams(raw)
  }

  /**
   * 弹出参数弹窗：暂存 options 到 pendingRef，读取 kv 缓存构建弹窗初始值
   * 读缓存失败时降级为无缓存初始值，弹窗仍正常弹出
   */
  const openParams = useMemoizedFn(async (options: RunContextMenuActionOptions) => {
    pendingRef.current = options
    try {
      const cache = await loadCachedParams(options)
      setParamsModalValue(getParamsModalValue(options.action.Params || [], cache))
    } catch {
      setParamsModalValue(getParamsModalValue(options.action.Params || [], []))
    }
    setParamsVisible(true)
  })

  /**
   * 收到 runContextMenuAction 事件后的参数决策链：
   * ① 有参数定义 且 (AskBeforeRun=true 或 用户点了"设置参数") → 弹框
   * ② 有参数定义 → 读 kv 缓存 → 必填缺失则弹框，否则用缓存静默执行
   * ③ 无参数定义 → 直接执行
   */
  const onRun = useMemoizedFn(async (options: RunContextMenuActionOptions) => {
    try {
      const params = options.action.Params || []
      if (params.length && (options.action.AskBeforeRun || options.configureParams)) {
        await openParams(options)
        return
      }
      if (params.length) {
        const cache = await loadCachedParams(options)
        if (isRequiredParamMissing(params, cache)) {
          await openParams(options)
          return
        }
        launch(options, cache)
        return
      }
      launch(options, [])
    } catch (error) {
      yakitNotify('error', t('ContextMenuExecutionHost.executeFailed', { error: `${error}` }))
    }
  })

  useEffect(() => {
    emiter.on('runContextMenuAction', onRun)
    return () => emiter.off('runContextMenuAction', onRun)
  }, [])

  /**
   * 参数弹窗确定回调：
   * save=true → 写入 kv 缓存（下次静默执行时直接用）
   * exec=true → 立即 launch 执行
   * 两个选项独立，可只保存不执行、也可保存并执行
   */
  const onOkParamsModal = useMemoizedFn((save: boolean, exec: boolean, params: YakExecutorParam[]) => {
    if (loadingRef.current) return
    const pending = pendingRef.current
    if (!pending) {
      setParamsVisible(false)
      return
    }
    loadingRef.current = true
    try {
      if (save) {
        setRemoteValue(getParamsCacheKey(pending), JSON.stringify(params)).catch((error) => {
          yakitNotify('error', t('ContextMenuExecutionHost.saveParamsFailed', { error: `${error}` }))
        })
      }
      if (exec) launch(pending, params)
    } catch (error) {
      yakitNotify('error', t('ContextMenuExecutionHost.executeFailed', { error: `${error}` }))
    } finally {
      loadingRef.current = false
    }
    pendingRef.current = undefined
    setParamsVisible(false)
  })

  return (
    <PluginHasParamsModal
      visible={paramsVisible}
      pluginType="context-menu"
      scriptName={pendingRef.current?.action.PluginName || t('ContextMenuExecutionHost.paramsModalTitle')}
      onCloseParamsModal={(visible) => {
        setParamsVisible(visible)
        if (!visible) pendingRef.current = undefined
      }}
      onOkParamsModal={onOkParamsModal}
      {...paramsModalValue}
    />
  )
})
