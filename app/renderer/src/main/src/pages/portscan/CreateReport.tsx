import { ipc } from '@/services/ipc'
import { int64String } from '@/utils/int64'
import React, { useEffect, useRef, useState } from 'react'
import { Progress } from 'antd'
import { useMemoizedFn } from 'ahooks'
import { failed, yakitNotify } from '@/utils/notification'
import { randomString } from '@/utils/randomUtil'
import type { ExecResult } from '../invoker/schema'
import { YakitRoute } from '@/enums/yakitRoute'
import { showYakitModal } from '@/components/yakitUI/YakitModal/YakitModalConfirm'

import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import emiter from '@/utils/eventBus/eventBus'
import type { ShowModalProps } from '@/utils/showModal'

export const onCreateReportModal = (createReportContent: CreateReportContentProps, modalProps: ShowModalProps) => {
  const m = showYakitModal({
    title: '下载报告',
    footer: null,
    content: <CreateReportContent onCancel={() => m.destroy()} {...createReportContent} />,
    onCancel: () => {
      m.destroy()
    },
    bodyStyle: { padding: 24 },
    ...modalProps,
  })
}
export interface CreateReportContentProps {
  reportName: string
  runtimeId: string
  onCancel?: () => void
  type?: 'portScan' | 'codeScan'
}
const CreateReportContent: React.FC<CreateReportContentProps> = React.memo((props) => {
  const { onCancel, runtimeId, type = 'portScan' } = props
  const [reportName, setReportName] = useState<string>(props.reportName || '默认报告名称')
  // 是否展示报告生成进度
  const [showReportPercent, setShowReportPercent] = useState<boolean>(false)
  // 报告生成进度
  const [reportPercent, setReportPercent] = useState<number>(0)
  const [reportLoading, setReportLoading] = useState<boolean>(false)

  const tokenRef = useRef<string>(randomString(40))
  const reportIdRef = useRef<string>()
  const controllerRef = useRef<AbortController>()
  useEffect(() => () => controllerRef.current?.abort(), [])

  /** 下载报告 */
  const downloadReport = async () => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    reportIdRef.current = undefined
    setReportPercent(0)
    const onError = (error: unknown) => {
      if (controller.signal.aborted) return
      setReportLoading(false)
      failed(`生成报告执行出错: ${error}`)
    }
    try {
      if (type === 'portScan') {
        await ipc.openStream(
          'grpc',
          'SimpleDetectCreatReport',
          { ReportName: reportName, RuntimeId: runtimeId },
          {
            token: tokenRef.current,
            signal: controller.signal,
            onData(data) {
              if (controller.signal.aborted || !data.IsMessage) return
              const obj = JSON.parse(new TextDecoder().decode(data.Message))
              if (obj?.type === 'progress') setReportPercent(obj.content.progress)
              if (obj?.type === 'log' && obj.content?.level === 'report')
                reportIdRef.current = int64String(obj.content.data)
            },
            onError,
            onEnd() {
              if (!controller.signal.aborted) onOpenReport()
            },
          },
        )
      } else {
        const result = await ipc.invoke(
          'grpc',
          'GenerateSSAReport',
          { ReportName: reportName, TaskID: runtimeId },
          { signal: controller.signal },
        )
        if (controller.signal.aborted) return
        if (!result.Success) throw new Error(result.Message)
        setReportPercent(1)
        yakitNotify('success', result.Message)
        onCancel?.()
        emiter.emit('openPage', JSON.stringify({ route: YakitRoute.DB_Report }))
      }
    } catch (error) {
      onError(error)
    }
  }
  const onOpenReport = useMemoizedFn(() => {
    if (!reportIdRef.current) {
      setReportLoading(false)
      return
    }
    setReportLoading(false)
    setShowReportPercent(false)
    setReportPercent(0)
    emiter.emit('menuOpenPage', JSON.stringify({ route: YakitRoute.DB_Report }))
    setTimeout(() => {
      ipc.invoke('local', 'ForwardMainEvent', { event: 'fetch-simple-open-report', data: reportIdRef.current })
    }, 300)
    if (onCancel) onCancel()
  })
  return (
    <div>
      <div style={{ textAlign: 'center' }}>
        <YakitInput
          placeholder="请输入任务名称"
          allowClear
          value={reportName}
          onChange={(e) => {
            setReportName(e.target.value)
          }}
        />
        {showReportPercent && (
          <Progress
            strokeColor="var(--Colors-Use-Main-Primary)"
            trailColor="var(--Colors-Use-Neutral-Bg)"
            percent={Math.trunc(reportPercent * 100)}
            format={(percent) => `${percent}%`}
            style={{ marginTop: 12, display: 'flex', alignItems: 'center' }}
          />
        )}
      </div>
      <div style={{ marginTop: 20, textAlign: 'right' }}>
        <YakitButton
          style={{ marginRight: 8 }}
          onClick={() => {
            controllerRef.current?.abort()
            if (onCancel) onCancel()
          }}
          type="outline2"
        >
          取消
        </YakitButton>
        <YakitButton
          loading={reportLoading}
          type={'primary'}
          onClick={() => {
            setReportLoading(true)
            downloadReport()
            setShowReportPercent(true)
          }}
        >
          确定
        </YakitButton>
      </div>
    </div>
  )
})
