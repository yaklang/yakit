import type { FC } from 'react'
import { useState } from 'react'
import { Tooltip } from 'antd'
import { Virtuoso } from 'react-virtuoso'
import { PlusOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { AISkillListProps } from './type'
import styles from './AISkillList.module.scss'

export const AISkillList: FC<AISkillListProps> = ({ data, loadState, onAdd, addLoading, addingSkill }) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const [scrollParent, setScrollParent] = useState<HTMLDivElement | null>(null)

  return (
    <div className={styles['list']} ref={setScrollParent} role="list" tabIndex={0}>
      {data.length ? (
        <Virtuoso
          customScrollParent={scrollParent ?? undefined}
          data={data}
          initialItemCount={1}
          computeItemKey={(_index, skill) => skill.name}
          itemContent={(_index, skill) => (
            <div className={styles['row']}>
              <div className={styles['item']} role="listitem">
                <div className={styles['item-header']}>
                  <span className={styles['name']} title={skill.name}>
                    {skill.name}
                  </span>
                  {loadState === 'metadata' ? (
                    <Tooltip title={t('YakitButton.add')}>
                      <YakitButton
                        type="text2"
                        size="small"
                        className={styles['add-button']}
                        aria-label={t('YakitButton.add')}
                        icon={<PlusOutlined />}
                        loading={addLoading && addingSkill === skill.name}
                        disabled={addLoading}
                        onClick={() => onAdd(skill.name)}
                      />
                    </Tooltip>
                  ) : (
                    <Tooltip title={t('AISkillLoadingPane.contextSize')}>
                      <span className={styles['token-count']}>{skill.token_count ?? '—'}</span>
                    </Tooltip>
                  )}
                </div>
                <div className={styles['description']} title={skill.description}>
                  {skill.description}
                </div>
              </div>
            </div>
          )}
        />
      ) : (
        <YakitEmpty />
      )}
    </div>
  )
}
