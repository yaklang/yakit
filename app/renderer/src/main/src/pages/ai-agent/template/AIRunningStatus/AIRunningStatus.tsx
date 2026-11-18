import type { FC } from 'react'
import classNames from 'classnames'
import { ChevronDownOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { AIRunningStatusProps } from './type'
import styles from './AIRunningStatus.module.scss'

/** TODO - 弹窗未做 */
const AIRunningStatus: FC<AIRunningStatusProps> = ({ className }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const round = 5
  const elapsed = '28:32'
  const duration = '1h'
  return (
    <span
      className={classNames(styles.badge, className)}
      role="status"
      aria-label={t('AIRunningStatus.label', { round, elapsed, duration })}
    >
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.label} aria-hidden="true">
        {t('AIRunningStatus.state')}
      </span>
      <span aria-hidden="true">{t('AIRunningStatus.round', { round })}</span>
      <span className={styles.time} aria-hidden="true">
        · {elapsed} / {duration}
      </span>
      <ChevronDownOutlined
        className={styles.chevron}
        size={12}
        color="var(--Colors-Use-Neutral-Text-3-Secondary)"
        aria-hidden="true"
      />
    </span>
  )
}

export default AIRunningStatus
