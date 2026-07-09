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

const hasStreamInfo = (info?: HoldGRPCStreamInfo) => {
  if (!info) return false
  return (
    info.progressState.length > 0 ||
    info.cardState.length > 0 ||
    info.tabsState.length > 0 ||
    Object.keys(info.tabsInfoState).length > 0 ||
    info.riskState.length > 0 ||
    info.logState.length > 0 ||
    info.rulesState.length > 0
  )
}

export const LocalPluginExecute: React.FC<LocalPluginExecuteProps> = React.memo((props) => {
  const { plugin, headExtraNode, linkPluginConfig, isHiddenUUID, infoExtra, hiddenUpdateBtn } = props
  const { t } = useI18nNamespaces(['plugin'])
  /**执行状态 */
  const [executeStatus, setExecuteStatus] = useState<ExpandAndRetractExcessiveState>('default')
  const [runtimeId, setRuntimeId] = useState<string>('')
  const [downLoading, setDownLoading] = useState<boolean>(false)

  const tokenRef = useRef<string>(randomString(40))
  const runtimeIdRef = useRef<string>('')
  const executeConfigRef = useRef<PluginExecuteCacheConfig>()
  const [cachedRecord, setCachedRecord] = useState<PluginLastExecuteRecord>()
  const handleSetRuntimeId = useMemoizedFn((id: string) => {
    runtimeIdRef.current = id
    setRuntimeId(id)
  })
  const resetExecuteState = useMemoizedFn(() => {
    setExecuteStatus('default')
    setCachedRecord(undefined)
    executeConfigRef.current = undefined
    handleSetRuntimeId('')
  })
  const tryRestoreCache = useMemoizedFn(() => {
    if (!takePluginRestoreOnOpen(plugin.ScriptName)) return
    getPluginLastExecuteRecord(plugin.ScriptName).then((record) => {
      if (!record) return
      executeConfigRef.current = record.executeConfig
      setCachedRecord(record)
      handleSetRuntimeId(record.runtimeId || '')
    })
  })
  useEffect(() => {
    resetExecuteState()
    tryRestoreCache()
  }, [plugin.ScriptName, resetExecuteState, tryRestoreCache])
  useEffect(() => {
    const onRestore = (name?: string) => {
      if (!name || name !== plugin.ScriptName) return
      resetExecuteState()
      tryRestoreCache()
    }
    emiter.on('onRestorePluginLastExecute', onRestore)
    return () => {
      emiter.off('onRestorePluginLastExecute', onRestore)
    }
  }, [plugin.ScriptName, resetExecuteState, tryRestoreCache])

  const [streamInfo, debugPluginStreamEvent] = useHoldGRPCStream({
    taskName: 'debug-plugin',
    apiKey: 'DebugPlugin',
    token: tokenRef.current,
    onEnd: (finishStreamInfo) => {
      debugPluginStreamEvent.stop()
      const config = executeConfigRef.current
      if (config) {
        const record: PluginLastExecuteRecord = {
          runtimeId: runtimeIdRef.current,
          executeConfig: config,
          streamInfo: finishStreamInfo || streamInfo,
        }
        setCachedRecord(record)
        recordPluginLastExecute(plugin.ScriptName, record)
      }
      setTimeout(() => {
        setExecuteStatus('finished')
      }, 300)
    },
    setRuntimeId: (rId) => {
      yakitNotify('info', `调试任务启动成功，运行时 ID: ${rId}`)
      handleSetRuntimeId(rId)
    },
  })
  const isExecuting = useCreation(() => {
    if (executeStatus === 'process') return true
    return false
  }, [executeStatus])

  const onCacheExecuteConfig = useMemoizedFn((config: PluginExecuteCacheConfig) => {
    executeConfigRef.current = config
    setCachedRecord(undefined)
  })

  const isShowResult = useMemo(
    () => isExecuting || runtimeId || hasStreamInfo(cachedRecord?.streamInfo),
    [isExecuting, runtimeId, cachedRecord?.streamInfo],
  )

  const displayStreamInfo = useMemo(
    () => (hasStreamInfo(streamInfo) ? streamInfo : cachedRecord?.streamInfo || streamInfo),
    [streamInfo, cachedRecord?.streamInfo],
  )

  const displayRuntimeId = useMemo(
    () => runtimeId || cachedRecord?.runtimeId || '',
    [runtimeId, cachedRecord?.runtimeId],
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
        runtimeId={displayRuntimeId}
        setRuntimeId={handleSetRuntimeId}
        executeStatus={executeStatus}
        setExecuteStatus={setExecuteStatus}
        linkPluginConfig={linkPluginConfig}
        onDownPlugin={onDownPlugin}
        isHiddenUUID={isHiddenUUID}
        infoExtra={infoExtra}
        hiddenUpdateBtn={hiddenUpdateBtn}
        initialExecuteConfig={cachedRecord?.executeConfig}
        onCacheExecuteConfig={onCacheExecuteConfig}
      />
      {isShowResult && (
        <PluginExecuteResult
          streamInfo={displayStreamInfo}
          runtimeId={displayRuntimeId}
          loading={isExecuting}
          defaultActiveKey={plugin.Type === 'yak' ? t('PluginExecResultDefaultTabs.log') : undefined}
          pluginExecuteResultWrapper={styles['plugin-execute-result-wrapper']}
          isCrawler={plugin.ScriptName === '基础爬虫'}
        />
      )}
    </YakitSpin>
  )
})
