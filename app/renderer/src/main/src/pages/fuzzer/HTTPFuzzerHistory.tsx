import React, { useEffect, useMemo, useState } from 'react'
import { Card, Divider, List, Space } from 'antd'
import { formatTimestamp } from '../../utils/timeUtil'
import { ReloadOutlined, DeleteOutlined } from '@ant-design/icons'
import { useMemoizedFn } from 'ahooks'
import { info } from '../../utils/notification'
import type { PaginationSchema } from '@/pages/invoker/schema'
import type { HistoryHTTPFuzzerTask } from '@/pages/fuzzer/HTTPFuzzerPage'
import { Uint8ArrayToString } from '@/utils/str'
import { NewHTTPPacketEditor } from '@/utils/editors'
import { CheckIcon } from '@/assets/newIcon'
import styles from './HTTPFuzzerHistory.module.scss'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { type DeleteFuzzerConfigRequest, apiDeleteFuzzerConfig } from '../layout/mainOperatorContent/utils'
import { YakitCard } from '@/components/yakitUI/YakitCard/YakitCard'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

export interface HTTPFuzzerHistorySelectorProp {
  currentSelectId?: number
  onSelect: (i: number, page: number) => void
  onDeleteAllCallback: () => void
  showAll: boolean
  onShowAllChange: (showAll: boolean) => void
  fuzzerTabIndex: string
}

const { ipcRenderer } = window.require('electron')

interface HTTPFuzzerTask {
  Id: number
  CreatedAt: number
  HTTPFlowTotal: number
  HTTPFlowSuccessCount: number
  HTTPFlowFailedCount: number
  Host?: string
  Port?: number
  onReload?: () => any
}

export interface HTTPFuzzerTaskDetail {
  BasicInfo: HTTPFuzzerTask
  OriginRequest: HistoryHTTPFuzzerTask
}

/*
* message HistoryHTTPFuzzerTaskDetail {
  HistoryHTTPFuzzerTask BasicInfo = 1;
  FuzzerRequest OriginRequest = 2;
}
* */

export const HTTPFuzzerHistorySelector: React.FC<HTTPFuzzerHistorySelectorProp> = React.memo((props) => {
  const { currentSelectId, fuzzerTabIndex, showAll, onShowAllChange } = props
  const { t } = useI18nNamespaces(['webFuzzer', 'yakitUi'])
  const [tasks, setTasks] = useState<HTTPFuzzerTaskDetail[]>([])
  const [loading, setLoading] = useState(false)
  const [paging, setPaging] = useState<PaginationSchema>({ Limit: 10, Order: '', OrderBy: '', Page: 1 })
  const [keyword, setKeyword] = useState('')
  const [total, setTotal] = useState(0)
  const page = useMemo(() => paging.Page, [paging.Page])
  const limit = useMemo(() => paging.Limit, [paging.Limit])

  useEffect(() => {
    reload(1, limit)
  }, [])

  const deleteAll = useMemoizedFn(() => {
    setLoading(true)
    const removeParams = {
      WebFuzzerIndex: showAll ? '' : fuzzerTabIndex,
    }
    ipcRenderer
      .invoke('DeleteHistoryHTTPFuzzerTask', removeParams)
      .then(() => {
        info('Delete History')
        deleteFuzzerConfig()
        reload(1, limit)
        props.onDeleteAllCallback()
      })
      .finally(() => setTimeout(() => setLoading(false), 300))
  })

  /** 删除对应的配置缓存历史数据 */
  const deleteFuzzerConfig = useMemoizedFn(() => {
    const deleteFuzzerConfigRequest: DeleteFuzzerConfigRequest = {
      PageId: [],
      DeleteAll: false,
    }
    if (showAll) {
      deleteFuzzerConfigRequest.DeleteAll = true
    } else {
      deleteFuzzerConfigRequest.PageId = [fuzzerTabIndex]
    }
    apiDeleteFuzzerConfig(deleteFuzzerConfigRequest)
  })

  const reload = useMemoizedFn((pageInt: number, limitInt: number) => {
    setLoading(true)
    const params = {
      Pagination: { ...paging, Page: pageInt, Limit: limitInt },
      Keyword: keyword,
      FuzzerTabIndex: showAll ? '' : fuzzerTabIndex,
    }
    ipcRenderer
      .invoke('QueryHistoryHTTPFuzzerTaskEx', params)
      .then((data: { Data: HTTPFuzzerTaskDetail[]; Total: number; Pagination: PaginationSchema }) => {
        setTasks(data.Data)
        setTotal(data.Total)
        setPaging(data.Pagination)
      })
      .finally(() => setTimeout(() => setLoading(false), 300))
  })

  const onSwitchShowAll = useMemoizedFn((v: boolean) => {
    onShowAllChange(v)
    setTimeout(() => {
      reload(1, limit)
    }, 200)
  })

  return (
    <YakitCard
      bordered={false}
      title={
        <Space style={{ lineHeight: '16px' }}>
          <span>Web Fuzzer History</span>
          <YakitButton
            type="text"
            size={'small'}
            icon={<ReloadOutlined />}
            onClick={() => {
              reload(1, limit)
            }}
          />
          <YakitPopconfirm
            title={t('HTTPFuzzerHistorySelector.confirmDeletePackets')}
            onConfirm={() => {
              deleteAll()
            }}
          >
            <YakitButton type="text" size={'small'} colors="danger" icon={<DeleteOutlined />} />
          </YakitPopconfirm>
        </Space>
      }
      className={styles['history-card-container']}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{t('HTTPFuzzerHistorySelector.quickSearch')}</span>
        <YakitInput.Search
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onSearch={() => reload(1, limit)}
          onPressEnter={() => reload(1, limit)}
        />
        <span>
          {t('YakitButton.view_all_button')}
          <YakitSwitch checked={showAll} onChange={onSwitchShowAll} />
        </span>
      </div>
      <Divider
        style={{
          marginTop: 10,
          marginBottom: 6,
          color: 'var(--Colors-Use-Neutral-Border)',
          borderTop: '1px solid var(--Colors-Use-Neutral-Border)',
        }}
      />
      <List<HTTPFuzzerTaskDetail>
        className="yakit-list"
        loading={loading}
        dataSource={tasks}
        pagination={{
          size: 'small',
          pageSize: limit,
          showSizeChanger: true,
          total,
          pageSizeOptions: ['5', '10', '20'],
          onChange: (page: number, limit?: number) => {
            reload(page, limit || 10)
          },
          onShowSizeChange: (old, limit) => {
            reload(page, limit || 10)
          },
        }}
        renderItem={(detail: HTTPFuzzerTaskDetail, index) => {
          const i = detail.BasicInfo
          let verbose = detail.OriginRequest.Verbose
          if (!verbose) {
            const rawToStr = Uint8ArrayToString(detail.OriginRequest.RequestRaw)
            if (!rawToStr) {
              verbose = detail.OriginRequest.Request
            } else {
              verbose = rawToStr
            }
          }
          return (
            <List.Item key={i.Id} style={{ padding: 2 }}>
              <YakitPopover
                placement={'rightBottom'}
                content={
                  <div style={{ width: 600, height: 300 }}>
                    <NewHTTPPacketEditor
                      originValue={verbose}
                      readOnly={true}
                      noMinimap={true}
                      noHeader={true}
                      onlyBasicMenu={true}
                    />
                  </div>
                }
              >
                <Card
                  size={'small'}
                  style={{ marginBottom: 4, width: '100%' }}
                  bodyStyle={{ paddingTop: 4, paddingBottom: 4 }}
                  hoverable={true}
                  onClick={(e) => {
                    e.preventDefault()
                    const newPage = (paging.Page - 1) * paging.Limit + index + 1
                    props.onSelect(i.Id, newPage)
                  }}
                  bordered={false}
                >
                  <div className={styles['history-item']}>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        width: '100%',
                        gap: 4,
                        position: 'relative',
                      }}
                    >
                      <div>{`ID:${i.Id}`}</div>
                      <div style={{ overflow: 'hidden' }}>
                        <YakitTag
                          color="info"
                          style={{
                            whiteSpace: 'normal',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: 'block',
                            lineHeight: '14px',
                          }}
                        >
                          {i.Host ? i.Host : formatTimestamp(i.CreatedAt)}
                        </YakitTag>
                      </div>

                      <YakitTag>
                        {t('HTTPFuzzerHistorySelector.totalFlows', {
                          HTTPFlowTotal: i.HTTPFlowTotal,
                        })}
                      </YakitTag>
                      {i.HTTPFlowSuccessCount != i.HTTPFlowTotal && (
                        <YakitTag>
                          {t('HTTPFuzzerHistorySelector.successCount', {
                            HTTPFlowSuccessCount: i.HTTPFlowSuccessCount,
                          })}
                        </YakitTag>
                      )}
                      {currentSelectId == i.Id && <CheckIcon className={styles['check-icon']} />}
                    </div>
                  </div>
                </Card>
              </YakitPopover>
            </List.Item>
          )
        }}
      />
    </YakitCard>
  )
})
