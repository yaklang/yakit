import React, { memo, useEffect, useMemo, useState } from 'react'
import { Input } from 'antd'
import { useMemoizedFn } from 'ahooks'
import useChatIPCStore from '../../useContext/ChatIPCContent/useStore'
import useChatIPCDispatcher from '../../useContext/ChatIPCContent/useDispatcher'
import { AIAgentGrpcApi, AIInputEventSyncTypeEnum } from '@/pages/ai-re-act/hooks/grpcApi'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { YakitSegmented } from '@/components/yakitUI/YakitSegmented/YakitSegmented'
import styles from './AICapabilityInventory.module.scss'

type SourceType = 'fixed' | 'dynamic'
type CategoryType = 'all' | 'tools' | 'plugins' | 'skills' | 'forges' | 'mcp_servers'
type ToolItem = AIAgentGrpcApi.CapabilityInventoryToolItem
type NamedItem = AIAgentGrpcApi.CapabilityInventoryNamedItem

interface FlatCapabilityItem {
  id: string
  name: string
  alias?: string
  description?: string
  keywords?: string[]
  source: SourceType
  type: Exclude<CategoryType, 'all'>
  badge: string
}

const sourceOptions = [
  { label: '固定能力', value: 'fixed' },
  { label: '动态加载', value: 'dynamic' },
]

const categoryOptions = [
  { label: '全部', value: 'all' },
  { label: '工具', value: 'tools' },
  { label: '插件', value: 'plugins' },
  { label: '技能', value: 'skills' },
  { label: '蓝图', value: 'forges' },
  { label: 'MCP', value: 'mcp_servers' },
]

const categoryLabelMap: Record<Exclude<CategoryType, 'all'>, string> = {
  tools: '工具',
  plugins: '插件',
  skills: '技能',
  forges: '蓝图',
  mcp_servers: 'MCP',
}

const resolveToolCategoryType = (item: ToolItem): Exclude<CategoryType, 'all'> => {
  if (item.category === 'yak_plugin') {
    return 'plugins'
  }
  return 'tools'
}

const toToolItem = (source: SourceType, item: ToolItem): FlatCapabilityItem => {
  const type = resolveToolCategoryType(item)
  return {
    id: `${source}:${type}:${item.name}`,
    name: item.name,
    alias: item.verbose_name,
    description: item.description,
    keywords: item.keywords || [],
    source,
    type,
    badge: item.category || (type === 'plugins' ? 'yak_plugin' : 'tool'),
  }
}

const toNamedItem =
  (source: SourceType, type: Exclude<CategoryType, 'all'>) =>
  (item: NamedItem): FlatCapabilityItem => ({
    id: `${source}:${type}:${item.name}`,
    name: item.name,
    alias: item.verbose_name,
    description: item.description,
    source,
    type,
    badge: item.category || categoryLabelMap[type],
  })

const buildInventory = (
  source: SourceType,
  section?: AIAgentGrpcApi.CapabilityInventorySection,
): FlatCapabilityItem[] => {
  if (!section) return []
  return [
    ...(section.tools || []).map((item) => toToolItem(source, item)),
    ...(section.skills || []).map(toNamedItem(source, 'skills')),
    ...(section.forges || []).map(toNamedItem(source, 'forges')),
    ...(section.mcp_servers || []).map(toNamedItem(source, 'mcp_servers')),
  ]
}

const emptyCounts = {
  all: 0,
  tools: 0,
  plugins: 0,
  skills: 0,
  forges: 0,
  mcp_servers: 0,
}

const AICapabilityInventory = memo(() => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const { capabilityInventory } = useChatIPCStore().chatIPCData
  const { handleSendSyncMessage } = useChatIPCDispatcher()

  const [activeSource, setActiveSource] = useState<SourceType>('fixed')
  const [activeCategory, setActiveCategory] = useState<CategoryType>('all')
  const [keyword, setKeyword] = useState('')

  useEffect(() => {
    handleSendSyncMessage({
      syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_CAPABILITY_INVENTORY,
    })
  }, [handleSendSyncMessage])

  const flatMap = useMemo(() => {
    return {
      fixed: buildInventory('fixed', capabilityInventory.fixed),
      dynamic: buildInventory('dynamic', capabilityInventory.dynamic),
    }
  }, [capabilityInventory])

  const counts = useMemo(() => {
    const buildCounts = (list: FlatCapabilityItem[]) => ({
      all: list.length,
      tools: list.filter((item) => item.type === 'tools').length,
      plugins: list.filter((item) => item.type === 'plugins').length,
      skills: list.filter((item) => item.type === 'skills').length,
      forges: list.filter((item) => item.type === 'forges').length,
      mcp_servers: list.filter((item) => item.type === 'mcp_servers').length,
    })
    return {
      fixed: buildCounts(flatMap.fixed),
      dynamic: buildCounts(flatMap.dynamic),
    }
  }, [flatMap])

  const currentList = useMemo(() => {
    const raw = flatMap[activeSource]
    const normalizedKeyword = keyword.trim().toLowerCase()
    return raw.filter((item) => {
      if (activeCategory !== 'all' && item.type !== activeCategory) return false
      if (!normalizedKeyword) return true
      const text = [item.name, item.alias, item.description, item.badge, ...(item.keywords || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return text.includes(normalizedKeyword)
    })
  }, [activeSource, activeCategory, flatMap, keyword])

  const currentCounts = counts[activeSource] || emptyCounts
  const showEmpty = flatMap.fixed.length === 0 && flatMap.dynamic.length === 0

  const sourceLabel = useMemoizedFn((value: string) => {
    return value === 'fixed' ? `固定能力 ${counts.fixed.all}` : `动态加载 ${counts.dynamic.all}`
  })

  const categoryLabel = useMemoizedFn((value: string) => {
    const key = value as CategoryType
    const label = categoryOptions.find((item) => item.value === key)?.label || key
    return `${label} ${currentCounts[key] ?? 0}`
  })

  if (showEmpty) {
    return (
      <div className={styles['capability-inventory']}>
        <YakitEmpty />
      </div>
    )
  }

  return (
    <div className={styles['capability-inventory']}>
      <div className={styles.header}>
        <div className={styles['header-top']}>
          <div className={styles.title}>能力清单</div>
          <div className={styles.summary}>
            <span>当前视图</span>
            <span className={styles['summary-number']}>{currentList.length}</span>
          </div>
        </div>

        <div className={styles.controls}>
          <YakitSegmented
            size="middle"
            block
            options={sourceOptions.map((item) => ({ ...item, label: sourceLabel(item.value) }))}
            value={activeSource}
            onChange={(value) => setActiveSource(value as SourceType)}
          />
          <YakitSegmented
            size="middle"
            block
            options={categoryOptions.map((item) => ({ ...item, label: categoryLabel(item.value) }))}
            value={activeCategory}
            onChange={(value) => setActiveCategory(value as CategoryType)}
          />
          <Input
            allowClear
            size="small"
            className={styles.search}
            placeholder={t('AICapabilityInventory.searchPlaceholder', undefined, '搜索名称、描述、关键词')}
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>
      </div>

      <div className={styles['meta-row']}>
        <div className={styles['meta-item']}>
          <span className={styles['meta-label']}>工具</span>
          <span className={styles['meta-value']}>{currentCounts.tools}</span>
        </div>
        <div className={styles['meta-item']}>
          <span className={styles['meta-label']}>插件</span>
          <span className={styles['meta-value']}>{currentCounts.plugins}</span>
        </div>
        <div className={styles['meta-item']}>
          <span className={styles['meta-label']}>技能</span>
          <span className={styles['meta-value']}>{currentCounts.skills}</span>
        </div>
        <div className={styles['meta-item']}>
          <span className={styles['meta-label']}>蓝图</span>
          <span className={styles['meta-value']}>{currentCounts.forges}</span>
        </div>
        <div className={styles['meta-item']}>
          <span className={styles['meta-label']}>MCP</span>
          <span className={styles['meta-value']}>{currentCounts.mcp_servers}</span>
        </div>
      </div>

      <div className={styles.list}>
        {currentList.length === 0 ? (
          <div className={styles.empty}>
            <YakitEmpty />
          </div>
        ) : (
          currentList.map((item) => (
            <div className={styles.item} key={item.id}>
              <div className={styles['item-main']}>
                <div className={styles['item-title-row']}>
                  <div className={styles['item-name']}>
                    {item.name}
                    {!!item.alias && item.alias !== item.name && (
                      <span className={styles['item-alias']}>{item.alias}</span>
                    )}
                  </div>
                  <div className={styles['item-tags']}>
                    <YakitTag size="small" color="info" fullRadius>
                      {categoryLabelMap[item.type]}
                    </YakitTag>
                    <YakitTag size="small" color="blue" fullRadius>
                      {item.badge}
                    </YakitTag>
                  </div>
                </div>
                {!!item.description && <div className={styles['item-desc']}>{item.description}</div>}
                {!!item.keywords?.length && (
                  <div className={styles['item-keywords']}>
                    {item.keywords.map((word) => (
                      <YakitTag key={`${item.id}:${word}`} size="small" color="cyan">
                        {word}
                      </YakitTag>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
})

export default AICapabilityInventory
