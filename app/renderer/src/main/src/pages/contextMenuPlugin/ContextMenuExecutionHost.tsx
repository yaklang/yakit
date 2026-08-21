import React, { useEffect, useRef, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import { showYakitDrawer } from '@/components/yakitUI/YakitDrawer/YakitDrawer'
import { showYakitModal } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { PluginHasParamsModal } from '@/components/pluginHasParamsDrawer/PluginHasParamsDrawer'
import { YakitRoute } from '@/enums/yakitRoute'
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
import { ContextMenuActionExecution } from './ContextMenuActionExecution'
import { registerContextMenuExecution } from './executionRegistry'
import { ContextMenuResultMode, type RunContextMenuActionOptions } from './types'
import styles from './ContextMenuExecutionHost.module.scss'

interface ParamsModalValue {
  initFormValue: CustomPluginExecuteFormValue
  requiredParams: YakParamProps[]
  groupParams: YakExtraParamProps[]
}

const emptyParamsModalValue: ParamsModalValue = {
  initFormValue: {},
  requiredParams: [],
  groupParams: [],
}

const getParamsCacheKey = (options: RunContextMenuActionOptions) =>
  `context-menu-params:${options.action.PluginUUID}:${options.action.ActionID}`

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

const hasParamValue = (value: unknown) => value !== undefined && value !== null && `${value}`.length > 0

const isRequiredParamMissing = (params: YakParamProps[], values: YakExecutorParam[]) => {
  const valueMap = new Map(values.map((item) => [item.Key, item.Value]))
  return params.some(
    (item) => item.Required && !hasParamValue(valueMap.get(item.Field)) && !hasParamValue(item.DefaultValue),
  )
}

export const runContextMenuAction = (options: RunContextMenuActionOptions) => {
  emiter.emit('runContextMenuAction', options)
}

export const ContextMenuExecutionHost: React.FC = React.memo(() => {
  const pendingRef = useRef<RunContextMenuActionOptions>()
  const [paramsVisible, setParamsVisible] = useState(false)
  const [paramsModalValue, setParamsModalValue] = useState<ParamsModalValue>(emptyParamsModalValue)

  const launch = useMemoizedFn((options: RunContextMenuActionOptions, params: YakExecutorParam[] = []) => {
    const executionID = registerContextMenuExecution({ ...options, params })
    const resultMode =
      options.action.ResultMode === ContextMenuResultMode.Auto
        ? ContextMenuResultMode.Dialog
        : options.action.ResultMode
    const title = `${options.action.PluginName} · ${options.action.HookName}`

    if (resultMode === ContextMenuResultMode.Tab) {
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
      return
    }

    const content = (
      <div className={styles['execution-container']}>
        <ContextMenuActionExecution executionID={executionID} mode={resultMode} />
      </div>
    )
    if (resultMode === ContextMenuResultMode.Drawer) {
      showYakitDrawer({
        title,
        width: '76%',
        placement: 'right',
        content,
      })
      return
    }

    showYakitModal({
      title,
      width: '76%',
      footer: null,
      closable: true,
      maskClosable: false,
      content,
    })
  })

  const openParams = useMemoizedFn(async (options: RunContextMenuActionOptions) => {
    pendingRef.current = options
    const cache = parseCachedParams((await getRemoteValue(getParamsCacheKey(options))) || '')
    setParamsModalValue(getParamsModalValue(options.action.Params || [], options.params || cache))
    setParamsVisible(true)
  })

  const onRun = useMemoizedFn(async (options: RunContextMenuActionOptions) => {
    if ((options.action.Params || []).length && (options.action.AskBeforeRun || options.configureParams)) {
      await openParams(options)
      return
    }
    if ((options.action.Params || []).length && !options.params) {
      const cache = parseCachedParams((await getRemoteValue(getParamsCacheKey(options))) || '')
      if (isRequiredParamMissing(options.action.Params, cache)) {
        await openParams(options)
        return
      }
      launch(options, cache)
      return
    }
    launch(options, options.params || [])
  })

  useEffect(() => {
    emiter.on('runContextMenuAction', onRun)
    return () => emiter.off('runContextMenuAction', onRun)
  }, [])

  const onOkParamsModal = useMemoizedFn((save: boolean, exec: boolean, params: YakExecutorParam[]) => {
    const pending = pendingRef.current
    if (!pending) {
      setParamsVisible(false)
      return
    }
    if (save) {
      setRemoteValue(getParamsCacheKey(pending), JSON.stringify(params)).catch((error) => {
        yakitNotify('error', `保存右键插件参数失败: ${error}`)
      })
    }
    if (exec) launch(pending, params)
    pendingRef.current = undefined
    setParamsVisible(false)
  })

  return (
    <PluginHasParamsModal
      visible={paramsVisible}
      pluginType="context-menu"
      scriptName={pendingRef.current?.action.PluginName || '右键插件参数'}
      onCloseParamsModal={(visible) => {
        setParamsVisible(visible)
        if (!visible) pendingRef.current = undefined
      }}
      onOkParamsModal={onOkParamsModal}
      {...paramsModalValue}
    />
  )
})
