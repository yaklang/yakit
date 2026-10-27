import type { FC } from 'react'
import { useEffect, useState } from 'react'
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
  refreshLoading = false,
  loadingMore = false,
  hasMore,
}) => {
  const { t } = useI18nNamespaces(['yakitUi'])
  const [scrollParent, setScrollParent] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    if (refreshLoading && scrollParent) scrollParent.scrollTop = 0
  }, [refreshLoading, scrollParent])

  return (
    <div className={styles['list']} ref={setScrollParent} role="list" tabIndex={0}>
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
