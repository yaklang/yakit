import React, { useEffect, useState } from 'react'
import classNames from 'classnames'
import { Tooltip } from 'antd'
import { useMemoizedFn } from 'ahooks'
import { TableVirtualResize } from '@/components/TableVirtualResize/TableVirtualResize'
import { ColumnsTypeProps } from '@/components/TableVirtualResize/TableVirtualResizeType'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { SSAProjectResponse } from '@/pages/yakRunnerAuditCode/AuditCode/AuditCodeType'
import { genDefaultPagination, QueryGeneralResponse } from '@/pages/invoker/schema'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { failed, yakitFailed } from '@/utils/notification'
import styles from './IRifyHomeTable.module.scss'
import { YakitRoute } from '@/enums/yakitRoute'
import emiter from '@/utils/eventBus/eventBus'
import { getGroupNamesTotal } from '../yakRunnerCodeScan/utils'
import { OutlineReloadScanIcon, OutlineScanIcon } from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { AfreshAuditModal } from '../yakRunnerAuditCode/AuditCode/AuditCode'
import { formatTimestamp } from '@/utils/timeUtil'

const { ipcRenderer } = window.require('electron')

const RECENT_PROJECT_LIMIT = 10

export interface IRifyHomeTableProps {}

export const IRifyHomeTable: React.FC<IRifyHomeTableProps> = () => {
  const { t } = useI18nNamespaces(['yakRunner', 'yakitUi'])
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<SSAProjectResponse[]>([])
  const [JSONStringConfig, setJSONStringConfig] = useState<string>()
  const update = useMemoizedFn(async () => {
    setLoading(true)
    try {
      const item: QueryGeneralResponse<SSAProjectResponse> = await ipcRenderer.invoke('QuerySSAProject', {
        Filter: { SearchKeyword: '' },
        Pagination: genDefaultPagination(RECENT_PROJECT_LIMIT),
      })
      item.Data = (item as any).Projects
      console.log('item.Data---', item.Data)
      setData(item.Data || [])
    } catch (e) {
      yakitFailed(t('AuditCode.fetchListDataFailed', { error: String(e) }), true)
    } finally {
      setLoading(false)
    }
  })

  useEffect(() => {
    update()
  }, [])

  const columns: ColumnsTypeProps[] = [
    {
      title: '项目',
      dataKey: 'ProjectName',
      render: (text) => {
        return (
          <div className={classNames('yakit-content-single-ellipsis', styles['irify-home-table-text'])}>{text}</div>
        )
      },
    },
    {
      title: '语言',
      dataKey: 'Language',
      width: 120,
    },
    {
      title: '项目风险',
      dataKey: 'Description',
      render: (text) => {
        return (
          <Tooltip title={text}>
            <div className={classNames('yakit-content-single-ellipsis', styles['irify-home-table-text'])}>{text}</div>
          </Tooltip>
        )
      },
    },
    {
      title: '风险数量',
      width: 120,
      dataKey: 'RiskNumber',
    },
    {
      title: '更新时间',
      dataKey: 'UpdatedAt',
      width: 120,
      render: (text) => {
        return formatTimestamp(text)
      },
    },
    {
      title: t('YakitTable.action'),
      dataKey: 'action',
      width: 120,
      render: (text) => {
        return (
          <div className={styles['audit-opt']} onClick={(e) => e.stopPropagation()}>
            <Tooltip title={t('YakitButton.compile')}>
              <YakitButton
                type="text"
                icon={<OutlineReloadScanIcon />}
                onClick={(e) => {
                  e.stopPropagation()
                  // setJSONStringConfig(record.JSONStringConfig)
                }}
              />
            </Tooltip>

            <Tooltip title={t('AuditCode.codeScan')}>
              <YakitButton
                type="text"
                icon={<OutlineScanIcon />}
                onClick={async (e) => {
                  e.stopPropagation()
                  try {
                    // const selectTotal = await getGroupNamesTotal({ GroupNames: [record.Language] })
                    // emiter.emit(
                    //   'openPage',
                    //   JSON.stringify({
                    //     route: YakitRoute.YakRunner_Code_Scan,
                    //     params: {
                    //       projectName: record.ProjectName,
                    //       projectId: record.ID,
                    //       GroupNames: [record.Language],
                    //       selectTotal,
                    //     },
                    //   }),
                    // )
                  } catch (error) {
                    failed(t('AuditCode.jumpCodeScanFailed', { error: String(error) }))
                  }
                }}
              />
            </Tooltip>
          </div>
        )
      },
    },
  ]

  return (
    <div className={styles['irify-home-table']} id="irify-home-table">
      <TableVirtualResize<SSAProjectResponse>
        loading={loading}
        columns={columns}
        data={data}
        renderKey="ID"
        isRefresh={false}
        disableSorting
        size="small"
        isShowTotal={false}
        isShowTitle={false}
      />
      <AfreshAuditModal
        nameOrConfig={JSONStringConfig}
        setNameOrConfig={setJSONStringConfig}
        onSuccee={() => update()}
        warrpId={document.getElementById('irify-home-table')}
        type="compile"
      />
    </div>
  )
}
