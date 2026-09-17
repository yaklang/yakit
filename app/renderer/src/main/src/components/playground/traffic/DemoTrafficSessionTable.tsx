import { trafficSessionsForUI } from '@/models/Traffic'
import { grpcPageForUI } from '@/utils/int64'
import { ipc } from '@/services/ipc'
import type React from 'react'
import { useEffect, useState } from 'react'
import type { Paging } from '@/utils/yakQueryHTTPFlow'
import { DemoVirtualTable } from '@/demoComponents/virtualTable/VirtualTable'
import type { TrafficSession } from '@/models/Traffic'
import type { TrafficViewerControlIf } from '@/components/playground/traffic/base'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

export interface DemoTrafficSessionTableProp extends TrafficViewerControlIf {}

export const DemoTrafficSessionTable: React.FC<DemoTrafficSessionTableProp> = (props) => {
  const { t } = useI18nNamespaces(['components'])
  const [selected, setSelected] = useState<TrafficSession>()

  useEffect(() => {
    if (!selected) {
      return
    }

    if (props.onClick !== undefined) {
      props.onClick(selected)
    }
  }, [selected])

  return (
    <DemoVirtualTable<TrafficSession>
      columns={[
        { headerTitle: 'ID', key: 'Id', width: 80, colRender: (i) => i.Id },
        {
          headerTitle: t('playground.DemoTrafficSessionTable.type'),
          key: 'Id',
          width: 80,
          colRender: (i) => i.SessionType,
        },
        {
          headerTitle: t('playground.DemoTrafficSessionTable.deviceType'),
          key: 'Id',
          width: 80,
          colRender: (i) => i.DeviceType,
        },

        { headerTitle: 'ID', key: 'id', width: 80, colRender: (i) => i.Id },
        {
          headerTitle: t('playground.DemoTrafficSessionTable.source'),
          key: 'source',
          width: 160,
          colRender: (i) => i.NetworkSrcIP + ':' + i.TransportLayerSrcPort,
        },
        {
          headerTitle: t('playground.DemoTrafficSessionTable.destination'),
          key: 'destination',
          width: 160,
          colRender: (i) => i.NetworkDstIP + ':' + i.TransportLayerDstPort,
        },
        {
          headerTitle: t('playground.DemoTrafficSessionTable.protocol'),
          key: 'protocol',
          width: 160,
          colRender: (i) => i.Protocol,
        },
      ]}
      rowClick={(data) => {
        setSelected(data)
      }}
      loadMore={(data: TrafficSession | undefined) => {
        return new Promise((resolve, reject) => {
          if (!data) {
            // info("加载初始化数据")
            ipc
              .invoke('grpc', 'QueryTrafficSession', {
                TimestampNow: props.fromTimestamp,
                Pagination: { Limit: 10, Page: 1, OrderBy: 'id', Order: 'asc' }, // genDefaultPagination(),
                FromId: 0,
              })
              .then(trafficSessionsForUI)
              .then(grpcPageForUI)
              .then((rsp) => {
                resolve({
                  data: rsp.Data,
                })
                return
              })
            return
          } else {
            ipc
              .invoke('grpc', 'QueryTrafficSession', {
                TimestampNow: props.fromTimestamp,
                Pagination: { Limit: 10, Page: 1, OrderBy: 'id', Order: 'asc' },
                FromId: data.Id,
              })
              .then(trafficSessionsForUI)
              .then(grpcPageForUI)
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
      rowKey={'Id'}
      isStop={!props.realtime}
      isScrollUpdate={!props.realtime}
    />
  )
}
