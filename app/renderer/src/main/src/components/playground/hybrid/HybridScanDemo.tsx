import { ipc, type GrpcInput, type GrpcOutput } from '@/services/ipc'
import React, { useEffect, useState, useRef } from 'react'
import { YakitResizeBox } from '@/components/yakitUI/YakitResizeBox/YakitResizeBox'
import type {
  HybridScanActiveTask,
  HybridScanControlRequest,
  HybridScanInputTarget,
  HybridScanPluginConfig,
  HybridScanResponse,
  HybridScanStatisticResponse,
} from '@/models/HybridScan'
import { genDefaultPagination } from '@/pages/invoker/schema'
import { Divider, Space, Tag } from 'antd'
import { AutoCard } from '@/components/AutoCard'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { randomString } from '@/utils/randomUtil'
import { failed, info } from '@/utils/notification'
import { useGetState, useMemoizedFn } from 'ahooks'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

export interface HybridScanDemoProp {}

export const HybridScanDemo: React.FC<HybridScanDemoProp> = (props) => {
  const { t } = useI18nNamespaces(['components', 'yakitUi'])
  const [token, setToken] = useState(randomString(40))
  const [loading, setLoading] = useState(false)

  const [target, setTarget] = React.useState<HybridScanInputTarget>({
    Input: `http://www.example.com/`,
    InputFile: [],
    HTTPRequestTemplate: {
      IsHttps: false,
      IsRawHTTPRequest: false,
      RawHTTPRequest: new Uint8Array(),
      Method: 'GET',
      Path: ['/'],
      GetParams: [],
      Headers: [],
      Cookie: [],
      Body: new Uint8Array(),
      PostParams: [],
      MultipartParams: [],
      MultipartFileParams: [],
      IsHttpFlowId: false,
      HTTPFlowId: [],
    },
  })
  const [plugin, setPlugin] = React.useState<HybridScanPluginConfig>({
    PluginNames: ['基础 XSS 检测', '开放 URL 重定向漏洞'],
    Filter: { Pagination: genDefaultPagination() /* Pagination is ignore for hybrid scan */ },
  })

  const [status, setStatus] = React.useState<HybridScanStatisticResponse>({
    ActiveTargets: '0',
    ActiveTasks: '0',
    FinishedTargets: '0',
    FinishedTasks: '0',
    HybridScanTaskId: '',
    TotalPlugins: '0',
    TotalTargets: '0',
    TotalTasks: '0',
  })
  const [activeTasks, setActiveTasks, getActiveTasks] = useGetState<HybridScanActiveTask[]>([])

  const controller = useRef<AbortController>()
  const startScan = useMemoizedFn(async (request: GrpcInput<'HybridScan'>, config?: GrpcInput<'HybridScan'>) => {
    controller.current?.abort()
    const owner = new AbortController()
    controller.current = owner
    setLoading(true)
    setActiveTasks([])
    try {
      const task = await ipc.openStream('grpc', 'HybridScan', request, {
        token,
        signal: owner.signal,
        onData: (data) => {
          if (controller.current !== owner) return
          setStatus(data)
          const update = data.UpdateActiveTask
          if (update?.Operator === 'remove')
            setActiveTasks(getActiveTasks().filter((entry) => entry.Index !== update.Index))
          else if (update?.Operator === 'create') setActiveTasks([...getActiveTasks(), update])
        },
        onError: (error) => {
          if (controller.current !== owner) return
          setLoading(false)
          failed(`[HybridScan] error: ${error.message}`)
        },
        onEnd: () => {
          if (controller.current !== owner) return
          setLoading(false)
          info('[HybridScan] finished')
        },
      })
      if (config) await task.write(config)
    } catch (error) {
      if (owner.signal.aborted || controller.current !== owner) return
      owner.abort()
      setLoading(false)
      failed(`[HybridScan] error: ${error}`)
    }
  })
  const cancel = useMemoizedFn(() => {
    controller.current?.abort()
    controller.current = undefined
    setLoading(false)
  })
  useEffect(() => () => controller.current?.abort(), [])

  return (
    <YakitResizeBox
      firstRatio={'350px'}
      firstMinSize={'280px'}
      firstNode={
        <AutoCard
          title={t('playground.HybridScanDemo.configure')}
          size={'small'}
          extra={
            <div>
              <YakitButton
                disabled={loading}
                onClick={() => startScan({ Control: true, HybridScanMode: 'new' }, { Targets: target, Plugin: plugin })}
              >
                {t('YakitButton.start')}
              </YakitButton>
              <YakitButton danger={true} disabled={!loading} onClick={cancel}>
                {t('YakitButton.stopTask')}
              </YakitButton>
            </div>
          }
        >
          <Space direction={'vertical'}>
            <div>
              {t('playground.HybridScanDemo.defaultInput')} {target.Input}
            </div>
            <div>{t('playground.HybridScanDemo.pluginsEnabled')}</div>
            {plugin.PluginNames.map((i) => {
              return <Tag key={i}>{i}</Tag>
            })}
          </Space>
        </AutoCard>
      }
      secondNode={
        <AutoCard title={t('playground.HybridScanDemo.results')} size={'small'}>
          <Space direction={'vertical'}>
            <Space>
              <YakitTag>
                {t('playground.HybridScanDemo.totalTargets')}: {status.TotalTargets}
              </YakitTag>
              <YakitTag>
                {t('playground.HybridScanDemo.finishedTargets')}: {status.FinishedTargets}
              </YakitTag>
              <YakitTag>
                {t('playground.HybridScanDemo.activeTargets')}: {status.ActiveTargets}
              </YakitTag>
              <YakitTag>
                {t('playground.HybridScanDemo.totalTasks')}: {status.TotalTasks}
              </YakitTag>
              <YakitTag>
                {t('playground.HybridScanDemo.activeTasks')}: {status.ActiveTasks}
              </YakitTag>
              <YakitTag>
                {t('playground.HybridScanDemo.finishedTasks')}: {status.FinishedTasks}
              </YakitTag>
            </Space>
            <Divider />
            <Space direction={'vertical'}>
              {activeTasks.map((i) => {
                return (
                  <YakitTag key={i.Index}>
                    {i.Index}: [{i.PluginName}] {t('playground.HybridScanDemo.target')}: {i.Url}
                  </YakitTag>
                )
              })}
            </Space>
          </Space>
        </AutoCard>
      }
    />
  )
}
