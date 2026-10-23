import type { FC } from 'react'
import { useState } from 'react'
import { Virtuoso } from 'react-virtuoso'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import AISkillListItem from './AISkillListItem/AISkillListItem'
import type { AISkillListProps } from './type'
import styles from './AISkillList.module.scss'

export const AISkillList: FC<AISkillListProps> = ({ source, data, loadState, onAdd, addLoading, addingSkill }) => {
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
      ) : (
        <YakitEmpty />
      )}
    </div>
  )
}
