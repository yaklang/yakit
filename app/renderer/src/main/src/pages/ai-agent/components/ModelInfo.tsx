import type { FC, ReactNode } from 'react'
import { AIOnlineModelIconMap } from '../defaultConstant'
import styles from './ModelInfo.module.scss'
import { formatTimestamp } from '@/utils/timeUtil'
import { useCreation } from 'ahooks'
import { AISystemOutputIcon } from '../aiModelList/icon'
import { getModelName } from '../aiModelList/modelName'

export interface ModalInfoProps {
  icon?: string
  title?: string
  time?: number
  /**
   * 行尾右侧内容（如操作按钮）。与 `time` 同排左右布局时，优先保证此处不换行/不被挤压；
   * 空间不足时由中间时间区收缩（`…` 省略）。
   */
  trailing?: ReactNode
}

const ModalInfo: FC<ModalInfoProps> = ({ icon, title, time, trailing }) => {
  const iconSvg = useCreation(() => {
    if (!icon) {
      return (
        <div className={styles['title-icon']}>
          <AISystemOutputIcon />
        </div>
      )
    }
    return (
      (AIOnlineModelIconMap[icon] && (
        <div className={styles['title-icon']}>{AIOnlineModelIconMap[icon || '']}</div>
      )) || (
        <div className={styles['title-icon']}>
          <AISystemOutputIcon />
        </div>
      )
    )
  }, [icon])
  if (!title) return null

  return (
    <div className={styles['modal-info']}>
      <div className={styles['modal-info-title']}>
        {iconSvg}
        <span className={styles['modal-info-title-text']}>{getModelName(title)}</span>
        {time != null && time > 0 ? (
          <span
            className={trailing != null ? styles['modal-info-title-time-squeeze'] : styles['modal-info-title-time']}
          >
            {formatTimestamp(time)}
          </span>
        ) : null}
        {trailing != null ? <span className={styles['modal-info-title-trailing']}>{trailing}</span> : null}
      </div>
    </div>
  )
}

export default ModalInfo
