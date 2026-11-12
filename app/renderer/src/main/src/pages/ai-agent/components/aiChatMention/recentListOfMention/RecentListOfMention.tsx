import { useRef, useState } from 'react'
import type { FC } from 'react'
import { useRequest } from 'ahooks'
import uniqBy from 'lodash/uniqBy'
import { ChevronDownOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useKnowledgeBase } from '@/pages/KnowledgeBase/hooks/useKnowledgeBase'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'
import BrowserMaterialList from '../../../browserInstances/BrowserMaterialList/BrowserMaterialList'
import { AIMentionTabsEnum } from '../../../defaultConstant'
import { useBrowserInstances } from '../../../browserInstances/browserInstanceStore'
import { useMentionRowsKeyboard } from '../hooks/useMentionRowsKeyboard'
import {
  browserMentionRow,
  fileMentionRow,
  knowledgeMentionRow,
  matchesMentionKeyword,
  sceneMentionRow,
  skillMentionRow,
  toolMentionRow,
} from '../mentionListData'
import MentionResourceRow from '../mentionResourceRow/MentionResourceRow'
import { loadRecentMentionResources } from './recentListOfMentionData'
import type { RecentListOfMentionProps } from './type'
import styles from './RecentListOfMention.module.scss'

const previewSize = 5

const RecentListOfMention: FC<RecentListOfMentionProps> = ({ query, tabs, ...controls }) => {
  const { t, i18n } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const sessionId = useCurrentSessionId()
  const { instances, loading: browserLoading } = useBrowserInstances()
  const knowledgeBases = useKnowledgeBase((state) => state.knowledgeBases)
  const [expanded, setExpanded] = useState<Partial<Record<AIMentionTabsEnum, boolean>>>({})
  const scrollRef = useRef<HTMLDivElement>(null)
  const { data, loading, error } = useRequest(() => loadRecentMentionResources(sessionId), {
    refreshDeps: [sessionId],
  })
  const spinning = loading || (Boolean(data?.browserIDs.length) && browserLoading)
  const chinese = i18n.language === 'zh' || i18n.language === 'zh-TW'
  const lists = !spinning &&
    !error &&
    data && {
      [AIMentionTabsEnum.File_System]: uniqBy(
        [
          ...data.files.map((item) => fileMentionRow(item)),
          ...data.attachments.map((item) => fileMentionRow(item, true)),
        ],
        'id',
      ),
      [AIMentionTabsEnum.Forge_Name]: data.skills.map(skillMentionRow),
      [AIMentionTabsEnum.KnowledgeBase]: data.knowledgeBases.map((item) => knowledgeMentionRow(item, knowledgeBases)),
      [AIMentionTabsEnum.Tool]: data.tools.map((tool) => toolMentionRow(tool, i18n.language)),
      [AIMentionTabsEnum.Browser]: instances.filter((item) => data.browserIDs.includes(item.id)).map(browserMentionRow),
      [AIMentionTabsEnum.FocusMode]: data.scenarios.map((item) => sceneMentionRow(item, chinese)),
    }

  const sections = lists
    ? tabs
        .flatMap((tab) => {
          if (tab.value === AIMentionTabsEnum.Recent) return []
          const key = tab.value as keyof typeof lists
          const items = lists[key].filter((item) => matchesMentionKeyword(item, query))
          if (!items.length) return []
          const label = key === AIMentionTabsEnum.File_System ? 'AIMentionTabs.files' : (tab.label as string)
          return [{ key, label, total: items.length, items: expanded[key] ? items : items.slice(0, previewSize) }]
        })
        .sort(
          (a, b) => Number(b.key === AIMentionTabsEnum.File_System) - Number(a.key === AIMentionTabsEnum.File_System),
        )
    : []

  // 键盘导航按可见条目的顺序跨分组移动。
  const rows = sections.flatMap((section) => section.items)
  const rowProps = useMentionRowsKeyboard(scrollRef, rows, controls, `${sessionId}:${query}`)

  return (
    <div className={styles.list} ref={scrollRef} role="listbox">
      {spinning ? (
        <YakitSpin />
      ) : sections.length ? (
        sections.map(({ key, label, total, items }) => {
          const isFileSection = key === AIMentionTabsEnum.File_System
          return (
            <section key={key} className={isFileSection ? `${styles.section} ${styles.files}` : styles.section}>
              <div className={styles.title}>
                {t(label)} ({total})
              </div>
              {key === AIMentionTabsEnum.Browser ? (
                <BrowserMaterialList
                  items={items
                    .filter((item) => item.type === 'browser')
                    .map((item) => ({ instance: item.instance, option: rowProps(item) }))}
                />
              ) : (
                <div className={isFileSection ? styles['file-rows'] : undefined}>
                  {items
                    .filter((item) => item.type !== 'browser')
                    .map((item) => {
                      const props = rowProps(item)
                      return (
                        <MentionResourceRow key={props.id} {...item.row} {...props} name={item.row.name ?? item.name} />
                      )
                    })}
                </div>
              )}
              {total > items.length && (
                <button
                  type="button"
                  className={styles.more}
                  onClick={() => setExpanded((previous) => ({ ...previous, [key]: true }))}
                >
                  {t('AIMentionTabs.viewMore')}
                  <ChevronDownOutlined size={12} color="currentColor" svgProps={{ strokeWidth: 2 }} aria-hidden />
                </button>
              )}
            </section>
          )
        })
      ) : (
        <div className={styles.empty}>
          {error ? t('YakitNotification.loadFailed', { error: String(error) }) : t('YakitEmpty.noData')}
        </div>
      )}
    </div>
  )
}

export default RecentListOfMention
