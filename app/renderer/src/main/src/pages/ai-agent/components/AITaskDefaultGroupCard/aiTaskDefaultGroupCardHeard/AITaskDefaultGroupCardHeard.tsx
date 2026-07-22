import { memo } from 'react'
import { AITaskDefaultGroupCardHeardProps } from './type'
import styles from './AITaskDefaultGroupCardHeard.module.scss'
import { OutlineInformationcircleIcon } from '@/assets/icon/outline'
import { formatTimestamp } from '@/utils/timeUtil'

import ConcurrentStreamCardActions from '../../ConcurrentStreamCard/ConcurrentStreamCardActions/ConcurrentStreamCardActions'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

const AITaskDefaultGroupCardHeard: React.FC<AITaskDefaultGroupCardHeardProps> = memo((props) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const { isChildWindow, expandToggle, timeStamp, expand, onRefresh, token } = props
  return (
    <div className={styles['ai-task-default-group-card-title']} onClick={isChildWindow ? undefined : expandToggle}>
      <div className={styles['ai-task-default-group-card-title-left']}>
        <span className={styles['icon']}>
          <OutlineInformationcircleIcon />
        </span>
        <span className={styles['text']}>{t('ConcurrentStreamCard.systemInfo')}</span>
        {timeStamp ? <span className={styles['time']}>{formatTimestamp(timeStamp)}</span> : null}
      </div>
      <div className={styles['ai-task-default-group-card-title-right']} onClick={(e) => e.stopPropagation()}>
        <ConcurrentStreamCardActions
          isChildWindow={isChildWindow}
          expand={expand}
          onExpandToggle={expandToggle}
          onRefresh={onRefresh}
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
