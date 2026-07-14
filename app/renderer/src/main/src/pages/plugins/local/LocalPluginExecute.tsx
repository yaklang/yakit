import { yakitNotify } from '@/utils/notification'
import { randomString } from '@/utils/randomUtil'
import React, { useState, useRef, useMemo, useEffect } from 'react'
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
import cloneDeep from 'lodash/cloneDeep'
import { savePluginExecutionHistory } from '../pluginExecutionHistory'
import type { PluginExecutionHistoryItem, PluginExecutionHistoryStatus } from '../pluginExecutionHistory'
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
    historySource,
    initFormValue,
    initExtraParamsValue,
    initRuntimeId,
    initStreamInfo,
  } = props
  const { t } = useI18nNamespaces(['plugin'])
  /**执行状态 */
  const [executeStatus, setExecuteStatus] = useState<ExpandAndRetractExcessiveState>('default')
  const [runtimeId, setRuntimeId] = useState<string>(initRuntimeId || '')
  const [restoredStreamInfo, setRestoredStreamInfo] = useState(initStreamInfo)
  const [downLoading, setDownLoading] = useState<boolean>(false)

  const tokenRef = useRef<string>(randomString(40))
  const runtimeIdRef = useRef<string>(initRuntimeId || '')
  const historyItemRef = useRef<PluginExecutionHistoryItem>()
  const historySaveQueueRef = useRef<Promise<void>>(Promise.resolve())

  const queueHistorySave = useMemoizedFn((item: PluginExecutionHistoryItem) => {
    historySaveQueueRef.current = historySaveQueueRef.current
      .catch(() => undefined)
      .then(() => savePluginExecutionHistory(item))
      .catch(() => undefined)
  })
  const persistExecutionHistory = useMemoizedFn(
    (finalStreamInfo: HoldGRPCStreamInfo, resultStatus: PluginExecutionHistoryStatus) => {
      if (!historyItemRef.current) return
      queueHistorySave({
        ...historyItemRef.current,
        runtimeId: runtimeIdRef.current,
        streamInfo: cloneDeep(finalStreamInfo),
        resultRecorded: true,
        resultStatus,
      })
      historyItemRef.current = undefined
    },
  )
  const onRuntimeIdChange = useMemoizedFn((rId: string) => {
    runtimeIdRef.current = rId
    setRuntimeId(rId)
    if (!rId) setRestoredStreamInfo(undefined)
  })
  const onExecutionHistoryStart = useMemoizedFn((item: PluginExecutionHistoryItem) => {
    historyItemRef.current = item
  })

  useEffect(() => {
    setExecuteStatus('default')
    historyItemRef.current = undefined
    runtimeIdRef.current = initRuntimeId || ''
    setRuntimeId(initRuntimeId || '')
    setRestoredStreamInfo(initStreamInfo)
  }, [plugin.ScriptName, initRuntimeId, initStreamInfo])

  const [streamInfo, debugPluginStreamEvent] = useHoldGRPCStream({
    taskName: 'debug-plugin',
    apiKey: 'DebugPlugin',
    token: tokenRef.current,
    onEnd: (finalStreamInfo) => {
      debugPluginStreamEvent.stop()
      if (finalStreamInfo) persistExecutionHistory(finalStreamInfo, 'finished')
      setTimeout(() => {
        setExecuteStatus('finished')
      }, 300)
    },
    setRuntimeId: (rId) => {
      yakitNotify('info', `调试任务启动成功，运行时 ID: ${rId}`)
      onRuntimeIdChange(rId)
    },
  })
  const isExecuting = useCreation(() => {
    if (executeStatus === 'process') return true
    return false
  }, [executeStatus])
  const isShowResult = useMemo(() => {
    return isExecuting || runtimeId || restoredStreamInfo
  }, [isExecuting, runtimeId, restoredStreamInfo])
  const resultStreamInfo = useMemo(() => restoredStreamInfo || streamInfo, [restoredStreamInfo, streamInfo])
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
        setRuntimeId={onRuntimeIdChange}
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
        historySource={historySource}
        initFormValue={initFormValue}
        initExtraParamsValue={initExtraParamsValue}
        onExecutionHistoryStart={onExecutionHistoryStart}
        onExecutionHistoryStop={(stoppedStreamInfo) => persistExecutionHistory(stoppedStreamInfo, 'stopped')}
      />
      {isShowResult && (
        <PluginExecuteResult
          streamInfo={resultStreamInfo}
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
