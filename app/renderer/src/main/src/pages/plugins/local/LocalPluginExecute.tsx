import { yakitNotify } from '@/utils/notification'
import { randomString } from '@/utils/randomUtil'
import React, { useState, useRef, useEffect, useMemo } from 'react'
import { LocalPluginExecuteDetailHeard } from '../operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard'
import { PluginExecuteResult } from '../operator/pluginExecuteResult/PluginExecuteResult'
import { LocalPluginExecuteProps } from './PluginsLocalType'
import useHoldGRPCStream from '@/hook/useHoldGRPCStream/useHoldGRPCStream'
import styles from './PluginsLocalDetail.module.scss'
import { ExpandAndRetractExcessiveState } from '../operator/expandAndRetract/ExpandAndRetract'
import { useCreation, useMemoizedFn } from 'ahooks'
import { apiDownloadPluginOther } from '../utils'
import emiter from '@/utils/eventBus/eventBus'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import {
  getPluginLastExecuteRecord,
  PluginExecuteCacheConfig,
  PluginLastExecuteRecord,
  recordPluginLastExecute,
  takePluginRestoreOnOpen,
} from '@/utils/pluginUsageCache'
import type { HoldGRPCStreamInfo } from '@/hook/useHoldGRPCStream/useHoldGRPCStreamType'

export const LocalPluginExecute: React.FC<LocalPluginExecuteProps> = React.memo((props) => {
  const {
    plugin,
    headExtraNode,
    linkPluginConfig,
    isHiddenUUID,
    infoExtra,
    hiddenUpdateBtn,
    initExecParamsValue,
    code,
    input,
    noHTTPRequestTemplate,
    autoExecute,
  } = props
  const { t } = useI18nNamespaces(['plugin'])
  /**执行状态 */
  const [executeStatus, setExecuteStatus] = useState<ExpandAndRetractExcessiveState>('default')
  const [runtimeId, setRuntimeId] = useState<string>('')
  const [downLoading, setDownLoading] = useState<boolean>(false)
  /** 最近使用回显的配置 + 结果 */
  const [cachedRecord, setCachedRecord] = useState<PluginLastExecuteRecord>()
  /** 当前这次执行：开始时记下，结束/停止/关页时写入引擎 */
  const pendingRef = useRef<{ pluginName: string; config: PluginExecuteCacheConfig; runtimeId: string }>()

  const tokenRef = useRef<string>(randomString(40))

  const handleSetRuntimeId = useMemoizedFn((id: string) => {
    if (pendingRef.current) pendingRef.current.runtimeId = id
    setRuntimeId(id)
  })

  const persistExecutionRecord = useMemoizedFn((streamInfo?: HoldGRPCStreamInfo) => {
    const pending = pendingRef.current
    if (!pending || !streamInfo) return
    pendingRef.current = undefined
    void recordPluginLastExecute(pending.pluginName, {
      runtimeId: pending.runtimeId,
      executeConfig: pending.config,
      streamInfo,
    }).catch(() => {})
  })

  const [streamInfo, debugPluginStreamEvent] = useHoldGRPCStream({
    taskName: 'debug-plugin',
    apiKey: 'DebugPlugin',
    token: tokenRef.current,
    onEnd: (finishStreamInfo) => {
      debugPluginStreamEvent.stop()
      persistExecutionRecord(finishStreamInfo)
      setTimeout(() => {
        setExecuteStatus('finished')
      }, 300)
    },
    setRuntimeId: (rId) => {
      yakitNotify('info', `调试任务启动成功，运行时 ID: ${rId}`)
      handleSetRuntimeId(rId)
    },
  })

  const restoreCache = useMemoizedFn((name: string) => {
    getPluginLastExecuteRecord(name).then((record) => {
      if (!record || name !== plugin.ScriptName) return
      setCachedRecord(record)
      handleSetRuntimeId(record.runtimeId || '')
    })
  })

  useEffect(() => {
    pendingRef.current = undefined
    setExecuteStatus('default')
    setCachedRecord(undefined)
    handleSetRuntimeId('')
    if (takePluginRestoreOnOpen(plugin.ScriptName)) restoreCache(plugin.ScriptName)

    const onRestore = (name?: string) => {
      if (!name || name !== plugin.ScriptName) return
      persistExecutionRecord(debugPluginStreamEvent.snapshot())
      pendingRef.current = undefined
      setExecuteStatus('default')
      setCachedRecord(undefined)
      handleSetRuntimeId('')
      restoreCache(name)
    }
    emiter.on('onRestorePluginLastExecute', onRestore)
    return () => {
      persistExecutionRecord(debugPluginStreamEvent.snapshot())
      emiter.off('onRestorePluginLastExecute', onRestore)
    }
  }, [plugin.ScriptName])

  const isExecuting = useCreation(() => {
    if (executeStatus === 'process') return true
    return false
  }, [executeStatus])

  const onCacheExecuteConfig = useMemoizedFn((config: PluginExecuteCacheConfig) => {
    pendingRef.current = { pluginName: plugin.ScriptName, config, runtimeId: '' }
    setCachedRecord(undefined)
  })

  const isShowResult = useMemo(() => {
    return isExecuting || runtimeId || cachedRecord
  }, [isExecuting, runtimeId, cachedRecord])

  const displayStreamInfo = useMemo(
    () => cachedRecord?.streamInfo || streamInfo,
    [cachedRecord?.streamInfo, streamInfo],
  )

  /**更新:下载插件 */
  const onDownPlugin = useMemoizedFn(() => {
    if (!plugin.UUID) return
    setDownLoading(true)
    apiDownloadPluginOther({
      UUID: [plugin.UUID],
    })
      .then(() => {
        // 刷新单个执行页面中的插件数据
        emiter.emit('onRefSinglePluginExecution', plugin.UUID)
        yakitNotify('success', '下载完成')
      })
      .finally(() =>
        setTimeout(() => {
          setDownLoading(false)
        }, 200),
      )
  })
  return (
    <YakitSpin spinning={downLoading}>
      <LocalPluginExecuteDetailHeard
        token={tokenRef.current}
        plugin={plugin}
        extraNode={headExtraNode}
        debugPluginStreamEvent={debugPluginStreamEvent}
        progressList={streamInfo.progressState}
        runtimeId={runtimeId}
        setRuntimeId={handleSetRuntimeId}
        executeStatus={executeStatus}
        setExecuteStatus={setExecuteStatus}
        linkPluginConfig={linkPluginConfig}
        onDownPlugin={onDownPlugin}
        isHiddenUUID={isHiddenUUID}
        infoExtra={infoExtra}
        hiddenUpdateBtn={hiddenUpdateBtn}
        initExecParamsValue={initExecParamsValue}
        code={code}
        input={input}
        noHTTPRequestTemplate={noHTTPRequestTemplate}
        autoExecute={autoExecute}
        initialExecuteConfig={cachedRecord?.executeConfig}
        onCacheExecuteConfig={onCacheExecuteConfig}
        onExecutionStop={persistExecutionRecord}
      />
      {isShowResult && (
        <PluginExecuteResult
          streamInfo={displayStreamInfo}
          runtimeId={runtimeId}
          loading={isExecuting}
          defaultActiveKey={plugin.Type === 'yak' ? t('PluginExecResultDefaultTabs.log') : undefined}
          pluginExecuteResultWrapper={styles['plugin-execute-result-wrapper']}
          isCrawler={plugin.ScriptName === '基础爬虫'}
        />
      )}
    </YakitSpin>
  )
})
