import React, { useEffect, useMemo, useState } from 'react'
import classNames from 'classnames'
import { useDebounce, useMemoizedFn } from 'ahooks'
import { OutlineBookopenIcon, OutlineSearchIcon, OutlineTrashIcon } from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitRoundCornerTag } from '@/components/yakitUI/YakitRoundCornerTag/YakitRoundCornerTag'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'
import { yakitNotify } from '@/utils/notification'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from './WebFuzzerApiDoc.module.scss'
import {
  DAY_MS,
  HOUR_MS,
  THIRTY_DAYS_MS,
  WEEK_MS,
  normalizeTimestamp,
} from '@/pages/ai-agent/historyChat/HistoryChatList/HistoryChatList'
import historyChatStyles from '@/pages/ai-agent/historyChat/HistoryChat.module.scss'
import listStyles from '@/pages/ai-agent/historyChat/HistoryChatList/HistoryChatList.module.scss'
import { YakURLResource } from '@/pages/yakURLTree/data'
import { ApiDocHistoryItem, getExtra, openApiRequest, toNumber } from './apiDoc'

const parseHistoryItem = (resource: YakURLResource): ApiDocHistoryItem => {
  const extra = resource.Extra || []
  const sessionId = getExtra(extra, 'session_id') || resource.ResourceName
  const createdAt = toNumber(getExtra(extra, 'created_at') || getExtra(extra, 'uploaded_at'))
  const updatedAt = toNumber(getExtra(extra, 'updated_at'), createdAt)
  const lastUsedAt = toNumber(getExtra(extra, 'last_used_at'), updatedAt || createdAt)
  return {
    sessionId,
    title: getExtra(extra, 'title') || resource.VerboseName,
    fileName: getExtra(extra, 'file_name') || undefined,
    createdAt,
    updatedAt,
    lastUsedAt,
  }
}

const TIME_GROUPS = [
  { key: 'justNow', label: 'HistoryChatList.justNow', max: HOUR_MS },
  { key: 'oneHour', label: 'HistoryChatList.oneHour', max: DAY_MS },
  { key: 'oneDay', label: 'HistoryChatList.oneDay', max: WEEK_MS },
  { key: 'oneWeek', label: 'HistoryChatList.oneWeek', max: THIRTY_DAYS_MS },
  { key: 'thirtyDays', label: 'HistoryChatList.thirtyDays', max: Infinity },
] as const

const getItemTitle = (item: ApiDocHistoryItem) => item.title || item.fileName || item.sessionId

export const WebFuzzerApiDocHistory: React.FC<{
  onSelect: (item: ApiDocHistoryItem) => void
  onDeleted: (sessionId: string) => void
  refreshToken?: number
}> = ({ onSelect, onDeleted, refreshToken = 0 }) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi', 'webFuzzer'])
  const [search, setSearch] = useState('')
  const keyword = useDebounce(search, { wait: 300 })
  const [items, setItems] = useState<ApiDocHistoryItem[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(false)
  const [deletingIds, setDeletingIds] = useState<string[]>([])

  const refresh = useMemoizedFn(async () => {
    setLoading(true)
    try {
      const resources = await openApiRequest('GET', 'history')
      setItems(resources.filter((item) => item.ResourceType === 'openapi-document').map(parseHistoryItem))
    } finally {
      setLoading(false)
    }
  })

  useEffect(() => {
    setSearch('')
    setSelectedId('')
    refresh()
  }, [refreshToken, refresh])

  const groups = useMemo(() => {
    const kw = keyword.toLowerCase()
    const filtered = kw ? items.filter((item) => getItemTitle(item).toLowerCase().includes(kw)) : items
    const map = Object.fromEntries(TIME_GROUPS.map((g) => [g.key, [] as ApiDocHistoryItem[]])) as Record<
      (typeof TIME_GROUPS)[number]['key'],
      ApiDocHistoryItem[]
    >
    filtered.forEach((item) => {
      const ts = item.lastUsedAt || item.updatedAt || item.createdAt
      const diff = Math.max(Date.now() - normalizeTimestamp(ts), 0)
      const groupKey = TIME_GROUPS.find((group) => diff <= group.max)?.key || 'thirtyDays'
      map[groupKey].push(item)
    })
    return TIME_GROUPS.map((group) => ({ ...group, list: map[group.key] })).filter((g) => g.list.length > 0)
  }, [items, keyword])

  const onDelete = useMemoizedFn(async (item: ApiDocHistoryItem) => {
    const { sessionId } = item
    if (deletingIds.includes(sessionId)) return
    setDeletingIds((prev) => [...prev, sessionId])
    try {
      await openApiRequest('DELETE', sessionId)
      setItems((prev) => prev.filter((i) => i.sessionId !== sessionId))
      setSelectedId((prev) => (prev === sessionId ? '' : prev))
      onDeleted(sessionId)
      yakitNotify('success', t('ApiDoc.deleteSuccess'))
    } catch (error) {
      yakitNotify('error', t('HistoryChatList.deleteFailed', { error: String(error) }))
    } finally {
      setDeletingIds((prev) => prev.filter((id) => id !== sessionId))
    }
  })

  return (
    <div className={historyChatStyles['history-chat']}>
      <div className={historyChatStyles['header-wrapper']}>
        <div className={historyChatStyles['haeder-first']}>
          <div className={historyChatStyles['first-title']}>
            {t('ApiDoc.historyDocuments')}
            <YakitRoundCornerTag>{items.length}</YakitRoundCornerTag>
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
          <div className={styles['api-doc-history-panel-loading']}>{t('YakitSpin.loading')}</div>
        ) : (
          <div className={listStyles['history-chat-list']}>
            {groups.map((group) => (
              <div key={group.key} className={listStyles['history-group']}>
                <div className={listStyles['history-group-title']}>{t(group.label)}</div>
                {group.list.map((item) => {
                  console.log(item, 'item')
                  const title = getItemTitle(item)
                  const deleting = deletingIds.includes(item.sessionId)
                  return (
                    <div
                      key={item.sessionId}
                      className={classNames(listStyles['history-item'], {
                        [listStyles['history-item-active']]: selectedId === item.sessionId,
                      })}
                      onClick={() => {
                        setSelectedId(item.sessionId)
                        onSelect(item)
                      }}
                    >
                      <div className={listStyles['item-info']}>
                        <div className={listStyles['item-icon']}>
                          <OutlineBookopenIcon />
                        </div>
                        <div
                          className={classNames(listStyles['info-title'], 'yakit-content-single-ellipsis')}
                          title={title}
                        >
                          {title}
                        </div>
                      </div>
                      <div className={listStyles['item-extra']}>
                        <YakitPopconfirm
                          title={t('ApiDoc.deleteConfirm')}
                          placement="right"
                          overlayClassName="api-doc-history-embedded-popconfirm"
                          onConfirm={(e) => {
                            e?.stopPropagation()
                            onDelete(item)
                          }}
                          zIndex={1070}
                        >
                          <YakitButton
                            loading={deleting}
                            type="text2"
                            icon={<OutlineTrashIcon className={listStyles['del-icon']} />}
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
        )}
      </div>
    </div>
  )
}
