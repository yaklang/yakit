import React, { useMemo, useState } from 'react'
import classNames from 'classnames'
import { Tooltip } from 'antd'
import { TableVirtualResize } from '@/components/TableVirtualResize/TableVirtualResize'
import { ColumnsTypeProps } from '@/components/TableVirtualResize/TableVirtualResizeType'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { failed } from '@/utils/notification'
import styles from './IRifyHomeTable.module.scss'
import { YakitRoute } from '@/enums/yakitRoute'
import emiter from '@/utils/eventBus/eventBus'
import { OutlineReloadScanIcon, OutlineScanIcon } from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { AfreshAuditModal } from '../yakRunnerAuditCode/AuditCode/AuditCode'
import { formatTimestamp } from '@/utils/timeUtil'
import { SSAWorkbenchRecentProject } from './IRifyHomeType'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { getGroupNamesTotal } from '../yakRunnerCodeScan/utils'

export interface IRifyHomeTableRow {
  ID: number
  ProjectName: string
  Language: string
  Description: string
  RiskNumber: number
  UpdatedAt: number
  JSONStringConfig: string
  Severity: string
}

export interface IRifyHomeTableProps {
  data?: SSAWorkbenchRecentProject[]
  onRefresh?: () => void
}

export const IRifyHomeTable: React.FC<IRifyHomeTableProps> = ({ data = [], onRefresh }) => {
  const { t } = useI18nNamespaces(['irifyHome', 'yakRunner', 'yakitUi'])
  const [JSONStringConfig, setJSONStringConfig] = useState<string>()

  const tableData = useMemo<IRifyHomeTableRow[]>(
    () =>
      data.map((item) => ({
        ID: item.ID,
        ProjectName: item.ProjectName,
        Language: item.Language,
        Description: item.HighestRiskVerbose,
        RiskNumber: item.RiskCount,
        UpdatedAt: item.UpdatedAt,
        JSONStringConfig: item.JSONStringConfig ?? '',
        Severity: item.HighestRiskSeverity ?? '',
      })),
    [data],
  )

  const columns: ColumnsTypeProps[] = [
    {
      title: t('IRifyHomeTable.project'),
      dataKey: 'ProjectName',
      render: (text) => {
        return (
          <div className={classNames('yakit-content-single-ellipsis', styles['irify-home-table-text'])}>{text}</div>
        )
      },
    },
    {
      title: t('IRifyHomeTable.language'),
      dataKey: 'Language',
      width: 120,
    },
    {
      title: t('IRifyHomeTable.projectRisk'),
      dataKey: 'Description',
      width: 120,
      render: (text, record) => {
        const getSeverityColor = (type) => {
          switch (type) {
            case 'low':
              return 'warning'
            case 'middle':
              return 'info'
            case 'high':
              return 'danger'
            case 'critical':
              return 'serious'
            case 'info':
              return 'info'
            default:
              return 'warning'
          }
        }
        return record.Severity ? <YakitTag color={getSeverityColor(record.Severity)}>{text}</YakitTag> : '-'
      },
    },
    {
      title: t('IRifyHomeTable.riskCount'),
      width: 120,
      dataKey: 'RiskNumber',
    },
    {
      title: t('IRifyHomeTable.updatedAt'),
      dataKey: 'UpdatedAt',
      width: 200,
      render: (text) => {
        return formatTimestamp(text)
      },
    },
    {
      title: t('YakitTable.action'),
      dataKey: 'action',
      fixed: 'right',
      width: 120,
      render: (_, record) => {
        return (
          <div className={styles['audit-opt']} onClick={(e) => e.stopPropagation()}>
            <Tooltip title={t('YakitButton.compile')}>
              <YakitButton
                type="text"
                icon={<OutlineReloadScanIcon />}
                onClick={(e) => {
                  e.stopPropagation()
                  setJSONStringConfig(record.JSONStringConfig)
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
                    const selectTotal = await getGroupNamesTotal({ GroupNames: [record.Language] })
                    emiter.emit(
                      'openPage',
                      JSON.stringify({
                        route: YakitRoute.YakRunner_Code_Scan,
                        params: {
                          projectName: record.ProjectName,
                          projectId: record.ID,
                          GroupNames: [record.Language],
                          selectTotal,
                        },
                      }),
                    )
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
      <TableVirtualResize<IRifyHomeTableRow>
        columns={columns}
        data={tableData}
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
        onSuccee={() => {
          onRefresh?.()
        }}
        warrpId={document.getElementById('irify-home-table')}
        type="compile"
      />
    </div>
  )
}
