import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useKnowledgeBase } from '@/pages/KnowledgeBase/hooks/useKnowledgeBase'
import { grpcQueryAIFocus, grpcQueryAIForge } from '../../grpc'
import { grpcGetAIToolList } from '../../aiToolList/utils'
import { genDefaultPagination } from '@/pages/invoker/schema'
import { browserInstanceMentionName, useBrowserInstances } from '../../browserInstances/browserInstanceStore'
import type { AIChatMentionProps, AIMentionTypeItem } from './type'
import { AIMentionTabsEnum } from '../../defaultConstant'
import { Modal } from 'antd'
const BrowserSettings = React.lazy(async () => ({
  default: (await import('../../browserInstances/BrowserInstancesPanel')).BrowserInstancesPanel,
}))

type Row = { type: AIMentionTypeItem; id: string; name: string; group: string }
export function AllMentionList({
  query,
  filterMode,
  onSelect,
  getContainer,
  browserOnly = false,
}: {
  query: string
  filterMode?: AIChatMentionProps['filterMode']
  onSelect: AIChatMentionProps['onSelect']
  getContainer: () => HTMLElement | null
  browserOnly?: boolean
}) {
  const { t } = useI18nNamespaces(['aiAgent'])
  const { knowledgeBases } = useKnowledgeBase()
  const { instances } = useBrowserInstances()
  const [remote, setRemote] = useState<Row[]>([])
  const [limit, setLimit] = useState(20)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)
  const [retry, setRetry] = useState(0)
  const [settings, setSettings] = useState(false)
  const filters = (filterMode || []).join(',')
  const excludes = (key: AIMentionTabsEnum) => !!filterMode?.includes(key)
  useEffect(() => {
    setLimit(20)
    setSelected(0)
  }, [query, filters, browserOnly])
  useEffect(() => {
    let active = true
    setRemote([])
    setError('')
    setLoading(true)
    const jobs: Array<Promise<{ rows: Row[]; more: boolean }>> = []
    if (!browserOnly && !excludes(AIMentionTabsEnum.Forge_Name))
      jobs.push(
        grpcQueryAIForge({ Pagination: genDefaultPagination(limit), Filter: { Keyword: query } }, true).then((r) => ({
          rows: (r.Data || []).map((s) => ({
            type: 'forge' as const,
            id: `${s.Id}`,
            name: s.ForgeVerboseName || s.ForgeName,
            group: 'AIMentionTabs.skill',
          })),
          more: +(r.Total || 0) > limit,
        })),
      )
    if (!browserOnly && !excludes(AIMentionTabsEnum.Tool))
      jobs.push(
        grpcGetAIToolList(
          { Query: query, ToolName: '', Pagination: genDefaultPagination(limit), OnlyFavorites: false },
          true,
        ).then((r) => ({
          rows: (r.Tools || []).map((s) => ({
            type: 'tool' as const,
            id: `${s.ID}`,
            name: s.VerboseName || s.Name,
            group: 'AIMentionTabs.tool',
          })),
          more: +(r.Total || 0) > limit,
        })),
      )
    if (!browserOnly && !excludes(AIMentionTabsEnum.FocusMode))
      jobs.push(
        grpcQueryAIFocus(undefined, true).then((r) => ({
          rows: (r.Data || [])
            .filter((s) => s.Name.toLowerCase().includes(query.toLowerCase()))
            .map((s) => ({ type: 'focusMode' as const, id: s.Name, name: s.Name, group: 'AiAgengt.focusMode' })),
          more: false,
        })),
      )
    Promise.allSettled(jobs).then((results) => {
      if (!active) return
      const rows: Row[] = []
      const failures: string[] = []
      let more = false
      for (const result of results) {
        if (result.status === 'fulfilled') {
          rows.push(...result.value.rows)
          more ||= result.value.more
        } else failures.push(String(result.reason))
      }
      setRemote(rows)
      setHasMore(more)
      setError(failures.join('; '))
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [query, limit, filters, browserOnly, retry])
  const rows = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    const knowledge: Row[] =
      browserOnly || excludes(AIMentionTabsEnum.KnowledgeBase)
        ? []
        : (knowledgeBases || []).map((s) => ({
            type: 'knowledgeBase',
            id: `${s.ID}`,
            name: s.KnowledgeBaseName,
            group: 'AIMentionTabs.knowledgeBase',
          }))
    if (!browserOnly && !excludes(AIMentionTabsEnum.KnowledgeBase) && knowledge.length)
      knowledge.unshift({
        type: 'knowledgeBase',
        id: '@所有知识库',
        name: '@所有知识库',
        group: 'AIMentionTabs.knowledgeBase',
      })
    const browsers: Row[] = excludes(AIMentionTabsEnum.Browser)
      ? []
      : instances
          .filter((s) => s.online)
          .map((s) => ({
            type: 'browser',
            id: s.id,
            name: browserInstanceMentionName(s),
            group: 'BrowserInstances.title',
          }))
    return [...remote, ...knowledge, ...browsers].filter((row) => row.name.toLowerCase().includes(keyword))
  }, [remote, knowledgeBases, instances, query, filters, browserOnly])
  const current = useRef({ rows, selected, loading })
  current.current = { rows, selected, loading }
  const rowIdentity = rows.map((row) => `${row.type}:${row.id}`).join('|')
  useEffect(() => {
    setSelected(0)
  }, [rowIdentity])
  useEffect(() => {
    const container = getContainer()
    const keydown = (event: KeyboardEvent) => {
      if (settings) return
      if (event.isComposing || event.keyCode === 229) return
      const { rows: list, selected: index, loading: busy } = current.current
      if (!list.length || busy || !['ArrowUp', 'ArrowDown', 'Enter'].includes(event.key)) return
      event.preventDefault()
      event.stopPropagation()
      if (event.key === 'Enter') {
        const row = list[index] || list[0]
        onSelect(row.type, row)
      } else setSelected((index + (event.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length)
    }
    container?.addEventListener('keydown', keydown, true)
    return () => container?.removeEventListener('keydown', keydown, true)
  }, [getContainer, onSelect, settings])
  return (
    <div
      role="listbox"
      style={{ maxHeight: 320, overflow: 'auto' }}
      aria-label={t(browserOnly ? 'BrowserInstances.title' : 'Parity.all')}
    >
      {browserOnly && <button onClick={() => setSettings(true)}>{t('Parity.browserSettings')}</button>}
      {error && (
        <div role="alert">
          {error}
          <button onClick={() => setRetry((v) => v + 1)}>{t('SessionSkills.refresh')}</button>
        </div>
      )}
      {loading && <div role="status">{t('SessionSkills.loading')}</div>}
      {rows.map((row, index) => (
        <React.Fragment key={`${row.type}:${row.id}`}>
          {(index === 0 || rows[index - 1].group !== row.group) && (
            <strong style={{ display: 'block', padding: 6 }}>{t(row.group)}</strong>
          )}
          <button
            role="option"
            aria-selected={selected === index}
            onMouseEnter={() => setSelected(index)}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: 8,
              background: selected === index ? 'var(--Colors-Use-Neutral-Bg-Hover)' : 'transparent',
              border: 0,
              color: 'inherit',
            }}
            onClick={() => onSelect(row.type, row)}
          >
            {row.name}
          </button>
        </React.Fragment>
      ))}
      {!rows.length && !loading && <p>{t('SessionSkills.empty')}</p>}
      {hasMore && (
        <button disabled={loading} onClick={() => setLimit((v) => v + 20)}>
          {t('SessionSkills.more')}
        </button>
      )}
      <Modal
        getContainer={() => getContainer() || document.body}
        visible={settings}
        title={t('BrowserInstances.title')}
        width={850}
        bodyStyle={{ height: '70vh', padding: 0 }}
        footer={null}
        destroyOnClose
        onCancel={() => setSettings(false)}
      >
        {settings && (
          <React.Suspense fallback={<p>{t('SessionSkills.loading')}</p>}>
            <BrowserSettings
              modalContainer={() => getContainer() || document.body}
              onMention={(mention) => {
                setSettings(false)
                onSelect('browser', { id: mention.mentionId, name: mention.mentionName })
              }}
            />
          </React.Suspense>
        )}
      </Modal>
    </div>
  )
}
