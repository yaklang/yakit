import type { FC } from 'react'
import { Progress } from 'antd'
import classNames from 'classnames'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { AIContextUsageProps } from './type'
import styles from './AIContextUsage.module.scss'

/** TODO - 弹窗未做 */
const AIContextUsage: FC<AIContextUsageProps> = ({ className }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  // TODO: 接入实际上下文用量后，在组件内根据数据状态判断是否显示。
  const percent = 62
  const label = t('AIContextUsage.label', { percent })
  return (
    <span className={classNames(styles.badge, className)}>
      <Progress
        type="circle"
        percent={percent}
        size={16}
        strokeWidth={12}
        showInfo={false}
        strokeColor="var(--Colors-Use-Main-Primary)"
        trailColor="var(--Colors-Use-Neutral-Border)"
        aria-label={label}
      />
      <span className={styles.label} aria-hidden="true">
        {label}
      </span>
    </span>
  )
}

export default AIContextUsage
