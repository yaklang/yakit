import type { FC } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useThrottleFn } from 'ahooks'
import { Virtuoso } from 'react-virtuoso'
import LoadingOutlined from '@ant-design/icons/lib/icons/LoadingOutlined'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import AISkillListItem from './AISkillListItem/AISkillListItem'
import type { AISkillListProps } from './type'
import styles from './AISkillList.module.scss'

export const AISkillList: FC<AISkillListProps> = ({
  source,
  data,
  loadState,
  onAdd,
  addLoading,
  addingSkill,
  onEndReached,
  onRetry,
  refreshLoading = false,
  loadingMore = false,
  hasMore,
}) => {
  const { t } = useI18nNamespaces(['yakitUi'])
  const [scrollParent, setScrollParent] = useState<HTMLDivElement | null>(null)
  const lastScrollTopRef = useRef(0)
  const { run: handleScroll, cancel: cancelScroll } = useThrottleFn(
    (container: HTMLDivElement) => {
      const { scrollTop, clientHeight, scrollHeight } = container
      if (scrollTop === lastScrollTopRef.current) return
      const scrollingDown = scrollTop > lastScrollTopRef.current
      lastScrollTopRef.current = scrollTop
      if (!onRetry || loadingMore || refreshLoading || !scrollingDown) return
      if (scrollTop + clientHeight >= scrollHeight - 1) onRetry()
    },
    { wait: 200 },
  )

  useEffect(() => {
    cancelScroll()
    // 取消尾调用时同步位置，避免将 loading 收缩引起的修正误判为向下滚动。
    lastScrollTopRef.current = scrollParent?.scrollTop ?? 0
  }, [loadingMore, refreshLoading, onRetry, scrollParent, cancelScroll])

  useEffect(() => {
    if (refreshLoading && scrollParent) scrollParent.scrollTop = 0
  }, [refreshLoading, scrollParent])

  return (
    <div
      className={styles['list']}
      ref={setScrollParent}
      role="list"
      tabIndex={0}
      onScroll={(event) => handleScroll(event.currentTarget)}
    >
      {data.length ? (
        <>
          <Virtuoso
            customScrollParent={scrollParent ?? undefined}
            data={data}
            initialItemCount={1}
            endReached={onEndReached}
            computeItemKey={(_index, skill) => skill.name}
            itemContent={(_index, skill) => (
              <AISkillListItem
                source={source}
                skill={skill}
                loadState={loadState}
                onAdd={onAdd}
                addLoading={addLoading}
                addingSkill={addingSkill}
              />
            )}
          />
          {(loadingMore || hasMore === false) && (
            <div className={styles['footer']} role="status">
              {loadingMore ? (
                <>
                  <LoadingOutlined aria-hidden="true" />
                  {t('YakitSpin.loadMore')}
                </>
              ) : (
                t('YakitEmpty.noMoreData')
              )}
            </div>
          )}
        </>
      ) : (
        <YakitEmpty />
      )}
    </div>
  )
}
