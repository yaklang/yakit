import React, { memo } from 'react'
import classNames from 'classnames'
import { Tooltip } from 'antd'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitVirtualList } from '@/components/yakitUI/YakitVirtualList/YakitVirtualList'
import { VirtualListColumns } from '@/components/yakitUI/YakitVirtualList/YakitVirtualListType'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { YakitHint } from '@/components/yakitUI/YakitHint/YakitHint'
import { showYakitModal } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import {
  OutlineClockIcon,
  OutlineDocumentduplicateIcon,
  OutlinePencilaltIcon,
  OutlineReloadScanIcon,
  OutlineScanIcon,
  OutlineTrashIcon,
} from '@/assets/icon/outline'
import emiter from '@/utils/eventBus/eventBus'
import { YakitRoute } from '@/enums/yakitRoute'
import { getGroupNamesTotal } from '@/pages/yakRunnerCodeScan/utils'
import { failed } from '@/utils/notification'
import { setClipboardText } from '@/utils/clipboard'
import { ProjectManagerEditForm } from '@/pages/yakRunnerAuditCode/AuditCode/AuditCode'
import { AfreshAuditModal } from '@/pages/yakRunnerAuditCode/AuditCode/AuditCode'
import { SSAProjectResponse } from '@/pages/yakRunnerAuditCode/AuditCode/AuditCodeType'
import { SSAProjectTableState } from './useSSAProjectTable'
import { getDefaultDatabaseDisplayPath, openIRifySSAProject } from './ssaProjectTableShared'
import auditStyles from '../yakRunnerAuditCode/AuditCode/AuditCode.module.scss'
import sectionStyles from './SSAProjectManageBlock.module.scss'

interface SSAProjectTableSectionProps {
  table: SSAProjectTableState & { onFinish?: () => void }
  warrpId?: HTMLElement | null
}

const renderDbPathCell = (path: string, emptyLabel: string) => {
  if (!path) {
    return <span className={sectionStyles['db-path-empty']}>{emptyLabel}</span>
  }
  return (
    <div className={sectionStyles['db-path-cell']}>
      <div className={classNames(sectionStyles['db-path-text'], 'yakit-content-single-ellipsis')}>{path}</div>
      <Tooltip title="copy">
        <div
          className={auditStyles['extra-icon']}
          onClick={(e) => {
            e.stopPropagation()
            setClipboardText(path)
          }}
        >
          <OutlineDocumentduplicateIcon />
        </div>
      </Tooltip>
    </div>
  )
}

export const SSAProjectTableSection: React.FC<SSAProjectTableSectionProps> = memo(({ table, warrpId }) => {
  const {
    variant,
    projectPool,
    sharedMode,
    t,
    JSONStringConfig,
    setJSONStringConfig,
    refresh,
    loading,
    data,
    setData,
    hasMore,
    pagination,
    isAllSelect,
    selectedRowKeys,
    schema,
    onSelectAll,
    onSelectChange,
    update,
    loadMoreData,
    deleteParams,
    setDeleteParams,
    onDeleteHistoryOnly,
    onDeleteAll,
    onFinish,
  } = table

  const isIrify = variant === 'irify'
  const isExternalAuditPool = isIrify && projectPool === 'dedicated'

  const columns: VirtualListColumns<SSAProjectResponse>[] = [
    {
      title: t('AuditCode.projectName'),
      dataIndex: 'ProjectName',
      render: (text) => (
        <Tooltip title={text}>
          <div className={classNames('yakit-content-single-ellipsis', auditStyles['audit-text'])}>{text}</div>
        </Tooltip>
      ),
    },
    {
      title: t('AuditCode.language', { defaultValue: '语言' }),
      dataIndex: 'Language',
      width: 100,
    },
    {
      title: t('AuditCode.projectDescription'),
      dataIndex: 'Description',
      render: (text) => (
        <Tooltip title={text} overlayClassName={auditStyles['tooltip-line-feed']}>
          <div className={classNames('yakit-content-single-ellipsis', auditStyles['audit-text'])}>{text}</div>
        </Tooltip>
      ),
    },
    {
      title: t('AuditCode.projectPath'),
      dataIndex: 'URL',
      render: (text) => {
        const path = text || t('AuditCode.unknownPath')
        return renderDbPathCell(path, t('AuditCode.unknownPath'))
      },
    },
  ]

  // 外部审计项目均为独立库，列表不再展示「独立数据库」列（避免与区块标题重复）
  if (isIrify && !isExternalAuditPool) {
    const isSharedPool = projectPool === 'shared' || (projectPool === 'auto' && sharedMode)
    columns.push({
      title: t('ProjectManage.storageDatabase', { defaultValue: '存储数据库' }),
      dataIndex: 'ResolvedDatabasePath',
      width: 280,
      render: (_text, record) => {
        const path = getDefaultDatabaseDisplayPath(record)
        return renderDbPathCell(path, '-')
      },
    })
  }

  if (!isIrify) {
    columns.push({
      title: t('AuditCode.riskCount'),
      dataIndex: 'RiskNumber',
      width: 100,
      render: (text) => {
        const countNum = parseInt(text + '')
        return countNum !== 0 ? <YakitTag color="info">{countNum}</YakitTag> : '-'
      },
    })
  }

  columns.push(
    {
      title: t('ProjectManage.compileTimes', { defaultValue: '编译次数' }),
      dataIndex: 'CompileTimes',
      width: 100,
      render: (text) => {
        const countNum = parseInt(text + '')
        return countNum !== 0 ? countNum : '-'
      },
    },
    {
      title: t('YakitTable.action'),
      dataIndex: 'action',
      width: isExternalAuditPool ? 120 : isIrify ? 180 : 200,
      render: (_text, record) => (
        <div className={auditStyles['audit-opt']} onClick={(e) => e.stopPropagation()}>
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
          {!isExternalAuditPool && (
            <>
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
              <Tooltip title={t('AuditCode.projectHistory')}>
                <YakitButton
                  type="text"
                  icon={<OutlineClockIcon />}
                  onClick={(e) => {
                    e.stopPropagation()
                    emiter.emit(
                      'openPage',
                      JSON.stringify({
                        route: YakitRoute.YakRunner_ScanHistory,
                        params: { Programs: [record.ProjectName], ProjectIds: [record.ID] },
                      }),
                    )
                  }}
                />
              </Tooltip>
            </>
          )}
          <Tooltip title={t('YakitButton.edit')}>
            <YakitButton
              type="text"
              icon={<OutlinePencilaltIcon />}
              onClick={(e) => {
                e.stopPropagation()
                const m = showYakitModal({
                  title: (modalT) => modalT('AuditCode.editProject'),
                  width: 600,
                  type: 'white',
                  footer: null,
                  centered: true,
                  content: (
                    <ProjectManagerEditForm
                      record={record}
                      setData={setData}
                      onClose={() => m.destroy()}
                      schema={schema}
                    />
                  ),
                })
              }}
            />
          </Tooltip>
          <YakitButton
            type="text"
            danger
            icon={<OutlineTrashIcon />}
            onClick={(e) => {
              e?.stopPropagation()
              table.setDeleteParams({
                titile: `确认删除${record.ProjectName}？`,
                params: { Filter: { IDs: [parseInt(record.ID + '')] } },
              })
            }}
          />
        </div>
      ),
    },
  )

  const onClickRow = async (record: SSAProjectResponse) => {
    if (isIrify) {
      await openIRifySSAProject(record, onFinish)
      return
    }
    emiter.emit(
      'openPage',
      JSON.stringify({
        route: YakitRoute.YakRunner_ScanHistory,
        params: { Programs: [record.ProjectName], ProjectIds: [record.ID] },
      }),
    )
  }

  return (
    <div className={sectionStyles['ssa-table-section']}>
      <YakitVirtualList<SSAProjectResponse>
        className={auditStyles['audit-virtual-list']}
        loading={loading}
        refresh={refresh}
        hasMore={hasMore}
        columns={columns}
        data={data}
        page={pagination.Page}
        loadMoreData={loadMoreData}
        renderKey="ID"
        rowSelection={{
          isAll: isAllSelect,
          type: 'checkbox',
          selectedRowKeys,
          onSelectAll: onSelectAll,
          onChangeCheckboxSingle: onSelectChange,
        }}
        onClickRow={onClickRow}
      />
      <AfreshAuditModal
        nameOrConfig={JSONStringConfig}
        setNameOrConfig={setJSONStringConfig}
        onSuccee={() => update(true)}
        warrpId={warrpId || document.getElementById('ssa-project-manage-block')}
        type="compile"
      />
      <YakitHint
        visible={!!deleteParams}
        title={deleteParams?.titile}
        content={t('AuditCode.selectDeleteMode')}
        width={520}
        footer={
          <div className={auditStyles['hint-right-btn']}>
            <YakitButton size="max" type="outline2" onClick={() => setDeleteParams(undefined)}>
              {t('YakitButton.cancel')}
            </YakitButton>
            <div className={auditStyles['btn-group-wrapper']}>
              <YakitButton size="max" type="outline2" onClick={onDeleteHistoryOnly}>
                {t('YakitButton.keep')}
              </YakitButton>
              <YakitButton size="max" type="primary" onClick={onDeleteAll}>
                {t('YakitButton.delete')}
              </YakitButton>
            </div>
          </div>
        }
      />
    </div>
  )
})
