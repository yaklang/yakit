import type { FC } from 'react'
import type { YakitStripedProgressProps } from './type'
import styles from './YakitStripedProgress.module.scss'

const YakitStripedProgress: FC<YakitStripedProgressProps> = ({
  percent,
  color = 'var(--Colors-Use-Main-Primary)',
  label,
  valueText,
}) => {
  const value =
    typeof percent === 'number' && Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : undefined
  return (
    <div
      className={styles.progress}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-valuetext={valueText}
    >
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${value ?? 0}%`, background: color }} />
      </div>
    </div>
  )
}

export default YakitStripedProgress
