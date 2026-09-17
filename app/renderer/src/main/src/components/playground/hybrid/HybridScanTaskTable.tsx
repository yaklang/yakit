import { hybridTasksForUI } from '@/models/HybridScan'
import { ipc, type GrpcInput, type GrpcOutput } from '@/services/ipc'
import React, { useEffect, useState, useRef } from 'react'
import type { Paging } from '@/utils/yakQueryHTTPFlow'
import { DemoVirtualTable } from '@/demoComponents/virtualTable/VirtualTable'
import type {
  HybridScanActiveTask,
  HybridScanControlRequest,
  HybridScanResponse,
  HybridScanStatisticResponse,
  HybridScanTask,
} from '@/models/HybridScan'
import { YakitResizeBox } from '@/components/yakitUI/YakitResizeBox/YakitResizeBox'
import { AutoCard } from '@/components/AutoCard'
import { Divider, Space } from 'antd'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { randomString } from '@/utils/randomUtil'
import { failed, info } from '@/utils/notification'
import { useGetState, useMemoizedFn } from 'ahooks'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

export interface HybridScanTaskTableProp {}

export const HybridScanTaskTable: React.FC<HybridScanTaskTableProp> = (props) => {
  const { t } = useI18nNamespaces(['components', 'yakitUi'])
  const [selected, setSelected] = React.useState<HybridScanTask>()
  const [token, setToken] = useState(randomString(40))
  const [loading, setLoading] = useState(false)

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
      firstNode={
        <DemoVirtualTable<HybridScanTask>
          columns={[
            { headerTitle: 'ID', key: 'Id', width: 80, colRender: (i) => i.Id },
            {
              headerTitle: t('playground.HybridScanTaskTable.taskId'),
              key: 'Title',
              width: 300,
              colRender: (i) => i.TaskId,
            },
            {
              headerTitle: t('playground.HybridScanTaskTable.status'),
              key: 'Status',
              width: 300,
              colRender: (i) => i.Status,
            },
          ]}
          rowClick={(item) => {
            setSelected(item)
          }}
          loadMore={(data: HybridScanTask | undefined) => {
            return new Promise((resolve, reject) => {
              if (!data) {
                // info("加载初始化数据")
                ipc
                  .invoke('grpc', 'QueryHybridScanTask', {
                    Pagination: { Limit: 10, Page: 1, OrderBy: 'id', Order: 'asc' }, // genDefaultPagination(),
                    FromId: 0,
                  })
                  .then(hybridTasksForUI)
                  .then((rsp) => {
                    resolve({
                      data: rsp.Data,
                    })
                    return
                  })
                return
              } else {
                ipc
                  .invoke('grpc', 'QueryHybridScanTask', {
                    Pagination: { Limit: 10, Page: 1, OrderBy: 'id', Order: 'asc' },
                    FromId: data.Id,
                  })
                  .then(hybridTasksForUI)
                  .then((rsp) => {
                    resolve({
                      data: rsp.Data,
                    })
                    return
                  })
                return
              }
            })
          }}
          rowKey={'TaskId'}
          isScrollUpdate={true}
        />
      }
      secondNode={
        selected ? (
          <AutoCard
            size={'small'}
            title={`TASK:${selected?.TaskId}`}
            extra={
              <Space>
                <YakitTag>{selected?.Status}</YakitTag>
                <YakitButton
                  disabled={loading}
                  onClick={() => startScan({ Control: true, HybridScanMode: 'resume', ResumeTaskId: selected?.TaskId })}
                >
                  {t('playground.HybridScanTaskTable.startTask')}
                </YakitButton>
                <YakitButton
                  disabled={!loading}
                  danger={true}
                  onClick={() => {
                    cancel()
                  }}
                >
                  {t('playground.HybridScanTaskTable.stopTask')}
                </YakitButton>
              </Space>
            }
          >
            <Space direction={'vertical'}>
              <Space>
                <YakitTag>
                  {t('playground.HybridScanTaskTable.totalTargets')}: {status.TotalTargets}
                </YakitTag>
                <YakitTag>
                  {t('playground.HybridScanTaskTable.finishedTargets')}: {status.FinishedTargets}
                </YakitTag>
                <YakitTag>
                  {t('playground.HybridScanTaskTable.activeTargets')}: {status.ActiveTargets}
                </YakitTag>
                <YakitTag>
                  {t('playground.HybridScanTaskTable.totalTasks')}: {status.TotalTasks}
                </YakitTag>
                <YakitTag>
                  {t('playground.HybridScanTaskTable.activeTasks')}: {status.ActiveTasks}
                </YakitTag>
                <YakitTag>
                  {t('playground.HybridScanTaskTable.finishedTasks')}: {status.FinishedTasks}
                </YakitTag>
              </Space>
              <Divider />
              <Space direction={'vertical'}>
                {activeTasks.map((i) => {
                  return (
                    <YakitTag key={i.Index}>
                      {i.Index}: [{i.PluginName}] {t('playground.HybridScanTaskTable.target')}: {i.Url}
                    </YakitTag>
                  )
                })}
              </Space>
            </Space>
          </AutoCard>
        ) : (
          t('playground.HybridScanTaskTable.selectTask')
        )
      }
    />
  )
}
