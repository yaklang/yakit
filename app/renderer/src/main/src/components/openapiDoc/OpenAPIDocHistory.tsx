import React, { useMemo, useState } from 'react'
import classNames from 'classnames'
import { useDebounce, useMemoizedFn } from 'ahooks'
import { Tooltip } from 'antd'
import { OutlineBookopenIcon, OutlineSearchIcon, OutlineTrashIcon } from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitDropdownMenu } from '@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitRoundCornerTag } from '@/components/yakitUI/YakitRoundCornerTag/YakitRoundCornerTag'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'
import { yakitNotify } from '@/utils/notification'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import {
  DAY_MS,
  HOUR_MS,
  THIRTY_DAYS_MS,
  WEEK_MS,
  normalizeTimestamp,
} from '@/pages/ai-agent/historyChat/HistoryChatList/HistoryChatList'
import historyChatStyles from '@/pages/ai-agent/historyChat/HistoryChat.module.scss'
import historyListStyles from '@/pages/ai-agent/historyChat/HistoryChatList/HistoryChatList.module.scss'
import { OpenAPIDocumentHistoryItem } from './openapiDocType'
import {
  deleteOpenAPIDocument,
  getOpenAPIDocumentHistoryTimestamp,
  getOpenAPIDocumentHistoryTitle,
} from './openapiYakURL'

const HISTORY_GROUPS = [
  { key: 'justNow', label: 'HistoryChatList.justNow' },
  { key: 'oneHour', label: 'HistoryChatList.oneHour' },
  { key: 'oneDay', label: 'HistoryChatList.oneDay' },
  { key: 'oneWeek', label: 'HistoryChatList.oneWeek' },
  { key: 'thirtyDays', label: 'HistoryChatList.thirtyDays' },
] as const

type HistoryGroupKey = (typeof HISTORY_GROUPS)[number]['key']

const getHistoryGroupKey = (timestamp?: number): HistoryGroupKey => {
  const time = normalizeTimestamp(timestamp)
  const diff = Math.max(Date.now() - time, 0)
  if (diff <= HOUR_MS) return 'justNow'
  if (diff <= DAY_MS) return 'oneHour'
  if (diff <= WEEK_MS) return 'oneDay'
  if (diff <= THIRTY_DAYS_MS) return 'oneWeek'
  return 'thirtyDays'
}

interface OpenAPIDocHistoryListProps {
  items: OpenAPIDocumentHistoryItem[]
  activeDocId: string
  search: string
  onSelect: (item: OpenAPIDocumentHistoryItem) => void
  onDeleted: (sessionId: string) => void
  getPopupContainer?: () => HTMLElement
  overlayClassName?: string
}

export const OpenAPIDocHistoryList: React.FC<OpenAPIDocHistoryListProps> = ({
  items,
  activeDocId,
  search,
  onSelect,
  onDeleted,
  getPopupContainer,
  overlayClassName,
}) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const [delLoading, setDelLoading] = useState<string[]>([])

  const filteredItems = useMemo(() => {
    if (!search) return items
    const kw = search.toLowerCase()
    return items.filter((item) => {
      const haystack = `${getOpenAPIDocumentHistoryTitle(item)} ${item.title} ${item.fileName || ''}`.toLowerCase()
      return haystack.includes(kw)
    })
  }, [items, search])

  const groupedItems = useMemo(() => {
    const groupMap = HISTORY_GROUPS.reduce<Record<HistoryGroupKey, OpenAPIDocumentHistoryItem[]>>(
      (acc, item) => {
        acc[item.key] = []
        return acc
      },
      {} as Record<HistoryGroupKey, OpenAPIDocumentHistoryItem[]>,
    )
    filteredItems.forEach((item) => {
      groupMap[getHistoryGroupKey(getOpenAPIDocumentHistoryTimestamp(item))].push(item)
    })
    return HISTORY_GROUPS.map((item) => ({
      ...item,
      list: groupMap[item.key],
    })).filter((item) => item.list.length > 0)
  }, [filteredItems])

  const handleDelete = useMemoizedFn(async (item: OpenAPIDocumentHistoryItem) => {
    const sessionId = item.sessionId
    if (delLoading.includes(sessionId)) return
    setDelLoading((prev) => [...prev, sessionId])
    try {
      await deleteOpenAPIDocument(sessionId)
      onDeleted(sessionId)
      yakitNotify('success', t('HTTPHistory.openapiDoc.deleteSuccess'))
    } catch (error) {
      yakitNotify('error', t('HistoryChatList.deleteFailed', { error: String(error) }))
    } finally {
      setDelLoading((prev) => prev.filter((id) => id !== sessionId))
    }
  })

  return (
    <div className={historyListStyles['history-chat-list']}>
      {groupedItems.map((group) => (
        <div key={group.key} className={historyListStyles['history-group']}>
          <div className={historyListStyles['history-group-title']}>{t(group.label)}</div>
          {group.list.map((item) => {
            const sessionId = item.sessionId
            const title = getOpenAPIDocumentHistoryTitle(item)
            const deleting = delLoading.includes(sessionId)
            return (
              <div
                key={sessionId}
                className={classNames(historyListStyles['history-item'], {
                  [historyListStyles['history-item-active']]: activeDocId === sessionId,
                })}
                onClick={() => onSelect(item)}
              >
                <div className={historyListStyles['item-info']}>
                  <div className={historyListStyles['item-icon']}>
                    <OutlineBookopenIcon />
                  </div>
                  <div
                    className={classNames(historyListStyles['info-title'], 'yakit-content-single-ellipsis')}
                    title={title}
                  >
                    {title}
                  </div>
                </div>
                <div className={historyListStyles['item-extra']}>
                  <YakitPopconfirm
                    title={t('HistoryChatList.deleteConfirm')}
                    placement="bottom"
                    getPopupContainer={getPopupContainer}
                    overlayClassName={overlayClassName}
                    onConfirm={(e) => {
                      e?.stopPropagation()
                      handleDelete(item)
                    }}
                  >
                    <YakitButton
                      loading={deleting}
                      type="text2"
                      icon={<OutlineTrashIcon className={historyListStyles['del-icon']} />}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </YakitPopconfirm>
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

interface OpenAPIDocHistoryProps {
  activeDocId: string
  onSelect: (item: OpenAPIDocumentHistoryItem) => void
  onDeleted: (sessionId: string) => void
  refreshToken?: number
  onItemsChange?: (items: OpenAPIDocumentHistoryItem[]) => void
  getPopupContainer?: () => HTMLElement
}

export const OpenAPIDocHistory: React.FC<OpenAPIDocHistoryProps> = ({
  activeDocId,
  onSelect,
  onDeleted,
  refreshToken = 0,
  onItemsChange,
  getPopupContainer,
}) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi', 'history'])
  const [search, setSearch] = useState('')
  const searchDebounce = useDebounce(search, { wait: 300 })
  const [items, setItems] = useState<OpenAPIDocumentHistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [clearLoading, setClearLoading] = useState(false)

  const embeddedOverlayClass = 'openapi-doc-history-embedded-popconfirm'
  const embeddedOverlayOptions = getPopupContainer
    ? {
        getPopupContainer,
        overlayClassName: embeddedOverlayClass,
      }
    : undefined

  const refreshItems = useMemoizedFn(async () => {
    setLoading(true)
    try {
      const { listOpenAPIDocumentHistory } = await import('./openapiYakURL')
      const nextItems = await listOpenAPIDocumentHistory()
      setItems(nextItems)
      onItemsChange?.(nextItems)
      return nextItems
    } finally {
      setLoading(false)
    }
  })

  React.useEffect(() => {
    setSearch('')
    refreshItems()
  }, [refreshToken, refreshItems])

  const handleClearAll = useMemoizedFn(async () => {
    if (clearLoading || items.length === 0) return
    setClearLoading(true)
    try {
      for (const item of items) {
        await deleteOpenAPIDocument(item.sessionId)
        onDeleted(item.sessionId)
      }
      setItems([])
      onItemsChange?.([])
      yakitNotify('success', t('HistoryChat.allChatsCleared'))
    } catch (error) {
      yakitNotify('error', t('HistoryChat.clearFailed', { error: String(error) }))
      await refreshItems()
    } finally {
      setClearLoading(false)
    }
  })

  const handleClearByDays = useMemoizedFn(async (days: number) => {
    if (clearLoading) return
    const beforeTimestamp = Date.now() - days * DAY_MS
    const deletedItems = items.filter(
      (item) => normalizeTimestamp(getOpenAPIDocumentHistoryTimestamp(item)) <= beforeTimestamp,
    )
    if (!deletedItems.length) {
      yakitNotify('info', t('HistoryChat.noChatsBeforeDays', { days }))
      return
    }
    setClearLoading(true)
    try {
      for (const item of deletedItems) {
        await deleteOpenAPIDocument(item.sessionId)
        onDeleted(item.sessionId)
      }
      const nextItems = items.filter(
        (item) => normalizeTimestamp(getOpenAPIDocumentHistoryTimestamp(item)) > beforeTimestamp,
      )
      setItems(nextItems)
      onItemsChange?.(nextItems)
      yakitNotify('success', t('HistoryChat.clearedBeforeDays', { days }))
    } catch (error) {
      yakitNotify('error', t('HistoryChat.clearFailed', { error: String(error) }))
      await refreshItems()
    } finally {
      setClearLoading(false)
    }
  })

  const renderClearConfirm = (label: string, title: string, onConfirm: () => void) => (
    <YakitPopconfirm
      placement="bottomRight"
      title={title}
      onConfirm={onConfirm}
      getPopupContainer={embeddedOverlayOptions?.getPopupContainer}
      overlayClassName={embeddedOverlayOptions?.overlayClassName}
    >
      <div
        style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        {label}
      </div>
    </YakitPopconfirm>
  )

  return (
    <div className={historyChatStyles['history-chat']}>
      <div className={historyChatStyles['header-wrapper']}>
        <div className={historyChatStyles['haeder-first']}>
          <div className={historyChatStyles['first-title']}>
            {t('HistoryChat.title')}
            <YakitRoundCornerTag>{items.length}</YakitRoundCornerTag>
          </div>
          <div className={historyChatStyles['header-actions']}>
            <YakitDropdownMenu
              menu={{
                data: [
                  {
                    key: '1',
                    label: renderClearConfirm(
                      t('HistoryChat.oneDay'),
                      t('HistoryChat.clearConfirm', { days: t('HistoryChat.oneDay') }),
                      () => handleClearByDays(1),
                    ),
                  },
                  {
                    key: '7',
                    label: renderClearConfirm(
                      t('HistoryChat.oneWeek'),
                      t('HistoryChat.clearConfirm', { days: t('HistoryChat.oneWeek') }),
                      () => handleClearByDays(7),
                    ),
                  },
                  {
                    key: '30',
                    label: renderClearConfirm(
                      t('HistoryChat.thirtyDays'),
                      t('HistoryChat.clearConfirm', { days: t('HistoryChat.thirtyDays') }),
                      () => handleClearByDays(30),
                    ),
                  },
                  { type: 'divider' },
                  {
                    key: 'all',
                    label: renderClearConfirm(
                      t('HistoryChat.clearAll'),
                      t('HistoryChat.clearAllConfirm'),
                      handleClearAll,
                    ),
                  },
                ],
              }}
              dropdown={{
                trigger: ['click'],
                placement: 'bottomRight',
                disabled: clearLoading || items.length === 0,
                getPopupContainer,
              }}
            >
              <Tooltip title={t('HistoryChat.clearChats')} placement="topRight" getPopupContainer={getPopupContainer}>
                <YakitButton
                  disabled={clearLoading || items.length === 0}
                  colors="danger"
                  type="outline1"
                  loading={clearLoading}
                >
                  {t('YakitButton.delete')}
                </YakitButton>
              </Tooltip>
            </YakitDropdownMenu>
          </div>
        </div>
        <div className={historyChatStyles['header-second']}>
          <YakitInput
            prefix={<OutlineSearchIcon className={historyChatStyles['search-icon']} />}
            placeholder={t('YakitInput.searchKeyWordPlaceholder')}
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className={historyChatStyles['content']}>
        {loading ? (
          <div className="openapi-doc-history-panel-loading">{t('YakitSpin.loading')}</div>
        ) : (
          <OpenAPIDocHistoryList
            items={items}
            activeDocId={activeDocId}
            search={searchDebounce}
            onSelect={onSelect}
            onDeleted={(sessionId) => {
              setItems((prev) => prev.filter((item) => item.sessionId !== sessionId))
              onDeleted(sessionId)
            }}
            getPopupContainer={getPopupContainer}
            overlayClassName={embeddedOverlayClass}
          />
        )}
      </div>
    </div>
  )
}
