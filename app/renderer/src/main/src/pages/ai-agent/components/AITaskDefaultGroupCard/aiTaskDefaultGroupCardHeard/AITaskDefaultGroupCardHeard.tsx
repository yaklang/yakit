import { memo } from 'react'
import { useCreation } from 'ahooks'
import type { AITaskDefaultGroupCardHeardProps } from './type'
import styles from './AITaskDefaultGroupCardHeard.module.scss'
import { OutlineInformationcircleIcon } from '@/assets/icon/outline'
import { formatTimestamp } from '@/utils/timeUtil'

import ConcurrentStreamCardActions from '../../ConcurrentStreamCard/ConcurrentStreamCardActions/ConcurrentStreamCardActions'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useCurrentStore, useCurrentRawData } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useStore } from 'zustand'

const AITaskDefaultGroupCardHeard: React.FC<AITaskDefaultGroupCardHeardProps> = memo((props) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const { expandToggle, expand, token } = props
  const store = useCurrentStore()
  const renderNum = useStore(store, (state) => state.tasks[token]?.renderNum)
  const rawData = useCurrentRawData()
  const timeStamp = useCreation(() => {
    if (!rawData) return 0
    const itemData = rawData.contents.get(token)
    if (!itemData) return 0
    return itemData.Timestamp || 0
  }, [renderNum])
  return (
    <div className={styles['ai-task-default-group-card-title']} onClick={expandToggle}>
      <div className={styles['ai-task-default-group-card-title-left']}>
        <span className={styles['icon']}>
          <OutlineInformationcircleIcon />
        </span>
        <span className={styles['text']}>{t('ConcurrentStreamCard.systemInfo')}</span>
        {timeStamp ? <span className={styles['time']}>{formatTimestamp(timeStamp)}</span> : null}
      </div>
      <div className={styles['ai-task-default-group-card-title-right']} onClick={(e) => e.stopPropagation()}>
        <ConcurrentStreamCardActions
          expand={expand}
          onExpandToggle={expandToggle}
          token={token}
          showContinueTask={false}
          showCancelTask={false}
          showDetails={false}
        />
      </div>
    </div>
  )
})

export default AITaskDefaultGroupCardHeard
