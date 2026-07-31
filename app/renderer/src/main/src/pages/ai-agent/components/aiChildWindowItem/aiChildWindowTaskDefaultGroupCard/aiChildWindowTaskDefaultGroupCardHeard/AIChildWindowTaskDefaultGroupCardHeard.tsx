import { type FC, memo } from 'react'
import type { AIChildWindowTaskDefaultGroupCardHeardProps } from './type'
import styles from './AIChildWindowTaskDefaultGroupCardHeard.module.scss'
import { OutlineInformationcircleIcon, OutlineRefreshIcon } from '@/assets/icon/outline'
import { Tooltip } from 'antd'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { formatTimestamp } from '@/utils/timeUtil'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

const AIChildWindowTaskDefaultGroupCardHeard: FC<AIChildWindowTaskDefaultGroupCardHeardProps> = memo((props) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const { timeStamp, onRefresh } = props
  return (
    <div className={styles['ai-task-default-group-card-title']}>
      <div className={styles['ai-task-default-group-card-title-left']}>
        <span className={styles['icon']}>
          <OutlineInformationcircleIcon />
        </span>
        <span className={styles['text']}>{t('ConcurrentStreamCard.systemInfo')}</span>
        {timeStamp ? <span className={styles['time']}>{formatTimestamp(timeStamp)}</span> : null}
      </div>
      <div className={styles['ai-task-default-group-card-title-right']} onClick={(e) => e.stopPropagation()}>
        <Tooltip title={t('ConcurrentStreamCard.refresh')}>
          <YakitButton
            size="middle"
            type="text"
            icon={<OutlineRefreshIcon />}
            onClick={onRefresh}
            className={styles['expand-btn']}
          />
        </Tooltip>
      </div>
    </div>
  )
})

export default AIChildWindowTaskDefaultGroupCardHeard
