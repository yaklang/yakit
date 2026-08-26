import React, { useEffect, useRef, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import useHoldGRPCStream from '@/hook/useHoldGRPCStream/useHoldGRPCStream'
import { PluginExecuteResult } from '@/pages/plugins/operator/pluginExecuteResult/PluginExecuteResult'
import { randomString } from '@/utils/randomUtil'
import { yakitNotify } from '@/utils/notification'
import { cancelContextMenuAction, executeContextMenuAction } from './api'
import { getContextMenuExecution, removeContextMenuExecution } from './executionRegistry'
import type { ContextMenuActionEvent, ContextMenuPacketActionResult } from './types'
import styles from './ContextMenuActionExecution.module.scss'

const { ipcRenderer } = window.require('electron')

export const ContextMenuActionExecution: React.FC<{ executionID: string; mode: 'dialog' | 'drawer' | 'tab' }> =
  React.memo(({ executionID, mode }) => {
    const execution = getContextMenuExecution(executionID)
    const [token] = useState(() => randomString(40))
    const [runtimeID, setRuntimeID] = useState('')
    const [loading, setLoading] = useState(true)
    const [status, setStatus] = useState('等待执行')
    const [reason, setReason] = useState('')
    const [packetResult, setPacketResult] = useState<ContextMenuPacketActionResult>()
    const [packetApplied, setPacketApplied] = useState(false)
    const startedRef = useRef(false)
    const cancelRequestedRef = useRef(false)

    const [streamInfo, streamActions] = useHoldGRPCStream({
      taskName: execution?.action.PluginName || '右键插件',
      apiKey: 'ExecuteContextMenuAction',
      token,
      waitTime: 200,
      isShowEnd: false,
      isShowError: false,
      jsonTableToTab: true,
      setRuntimeId: setRuntimeID,
      onEnd: () => {
        setLoading(false)
        if (cancelRequestedRef.current) setStatus('已取消')
      },
      onError: (error) => {
        setLoading(false)
        if (cancelRequestedRef.current) {
          setStatus('已取消')
          setReason('')
        } else {
          setStatus('执行失败')
          setReason(`${error}`)
        }
      },
    })

    const applyPacketResult = useMemoizedFn((result: ContextMenuPacketActionResult) => {
      if (!execution?.onPacketResult || packetApplied) return
      const applied = execution.onPacketResult(result)
      if (applied !== false) setPacketApplied(true)
    })

    useEffect(() => {
      if (!execution) {
        setLoading(false)
        setStatus('执行上下文已失效')
        return
      }

      const eventChannel = `${token}-context-menu-event`
      const errorChannel = `${token}-context-menu-error`
      const onEvent = (_event, data: ContextMenuActionEvent) => {
        if (data.RuntimeID) setRuntimeID(data.RuntimeID)
        switch (data.Status) {
          case 'started':
            setStatus('执行中')
            break
          case 'packet-result':
            if (data.PacketResult) {
              setPacketResult(data.PacketResult)
              if (!data.PacketResult.RequireConfirmation) applyPacketResult(data.PacketResult)
            }
            break
          case 'completed':
            setStatus('已完成')
            setLoading(false)
            break
          case 'cancelled':
            setStatus('已取消')
            setReason(data.Reason || '')
            setLoading(false)
            break
          case 'timeout':
            setStatus('已超时')
            setReason(data.Reason || '')
            setLoading(false)
            break
          case 'failed':
            setStatus('执行失败')
            setReason(data.Reason || '')
            setLoading(false)
            break
          default:
            break
        }
      }
      const onError = (_event, error: string) => {
        if (cancelRequestedRef.current) {
          setStatus('已取消')
          setReason('')
        } else {
          setStatus('执行失败')
          setReason(error)
        }
        setLoading(false)
      }
      ipcRenderer.on(eventChannel, onEvent)
      ipcRenderer.on(errorChannel, onError)

      if (!startedRef.current) {
        startedRef.current = true
        streamActions.start()
        executeContextMenuAction(
          {
            ...execution.request,
            PluginUUID: execution.action.PluginUUID,
            ActionID: execution.action.ActionID,
            Params: execution.params || [],
          },
          token,
        ).catch((error) => {
          setStatus('执行失败')
          setReason(`${error}`)
          setLoading(false)
        })
      }

      return () => {
        ipcRenderer.removeListener(eventChannel, onEvent)
        ipcRenderer.removeListener(errorChannel, onError)
        cancelContextMenuAction(token)
        removeContextMenuExecution(executionID)
      }
    }, [executionID, token])

    if (!execution) {
      return <div className={styles['execution-empty']}>执行上下文已失效，请重新从右键菜单触发。</div>
    }

    return (
      <div className={styles['execution']} data-mode={mode}>
        <div className={styles['execution-header']}>
          <div className={styles['execution-identity']}>
            <strong>{execution.action.PluginName}</strong>
            <YakitTag color={loading ? 'blue' : reason ? 'danger' : 'success'}>{status}</YakitTag>
            <span>{execution.action.HookName}</span>
          </div>
          {loading && (
            <YakitButton
              type="outline2"
              colors="danger"
              onClick={() => {
                cancelRequestedRef.current = true
                cancelContextMenuAction(token)
                setStatus('正在取消')
              }}
            >
              取消执行
            </YakitButton>
          )}
        </div>

        {reason && <div className={styles['execution-error']}>{reason}</div>}

        {packetResult && packetResult.RequireConfirmation && !packetApplied && (
          <div className={styles['packet-confirm']}>
            <div>
              <strong>插件返回了数据包修改</strong>
              <span>应用前会校验数据包版本，避免覆盖触发后产生的新编辑。</span>
            </div>
            <YakitButton
              disabled={!execution.onPacketResult}
              onClick={() => {
                applyPacketResult(packetResult)
                if (!execution.onPacketResult) yakitNotify('warning', '原数据包页面已关闭，无法回填')
              }}
            >
              应用修改
            </YakitButton>
          </div>
        )}

        {packetApplied && <div className={styles['packet-applied']}>数据包修改已提交到原编辑器。</div>}

        <div className={styles['result-body']}>
          <PluginExecuteResult
            streamInfo={streamInfo}
            runtimeId={runtimeID}
            loading={loading}
            pluginType="context-menu"
          />
        </div>
      </div>
    )
  })
