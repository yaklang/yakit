import styles from './DividerCard.module.scss'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { useMemo, type FC } from 'react'
import { XOutlined, FigmaIcon5237120699Outlined } from '@yakit-libs/yakit-ui-icons/outline'

import classNames from 'classnames'
import { TaskErrorIcon } from '@yakit-libs/yakit-ui-icons/oldicon/TaskErrorIcon'
import { TaskSkippedIcon } from '@yakit-libs/yakit-ui-icons/oldicon/TaskSkippedIcon'
import { TaskSuccessIcon } from '@yakit-libs/yakit-ui-icons/oldicon/TaskSuccessIcon'
import { TaskInProgressIndicator } from '../aiTree/TaskInProgressIndicator'
import { AITaskStatus } from '@/pages/ai-re-act/hooks/grpcApi'

interface SuccessStatus {
  status: AITaskStatus.success | AITaskStatus.cancel
  desc?: string
  success: number
  error: number
  name?: string
}
interface WarningStatus {
  status: AITaskStatus.inProgress | AITaskStatus.error | AITaskStatus.skipped | AITaskStatus.created
  desc?: string
  name?: string
}

type DividerCardProps = SuccessStatus | WarningStatus
const DividerCard: FC<DividerCardProps> = (props) => {
  const [icon, dom] = useMemo(() => {
    const { status, desc, name } = props
    switch (status) {
      case AITaskStatus.success: {
        const { error, success } = props
        return [
          <TaskSuccessIcon />,
          <div className={classNames(styles['divider-content-success'], styles['divider-content-text'])}>
            <span>{name}</span>
            {[error, success]
              .filter((ele) => !!ele)
              .map((item, index) => {
                return (
                  <YakitTag
                    key={index}
                    size="small"
                    fullRadius
                    color={index === 0 ? 'danger' : 'success'}
                    className={styles['divider-content-success-tag']}
                  >
                    {item}
                  </YakitTag>
                )
              })}
            <span className={styles['divider-content-text-desc']}>{desc}</span>
          </div>,
        ]
      }
      case AITaskStatus.inProgress:
        return [
          <div className={styles['icon-danger']}>
            <TaskInProgressIndicator />
          </div>,
          <div className={styles['divider-content-text']}>
            <span>{name}</span>
            {desc && (
              <YakitTag fullRadius className={styles['divider-content-error']} size="small" color="warning">
                <FigmaIcon5237120699Outlined color="currentColor" />
                <p className={styles['divider-content-error-text']}>{desc}</p>
              </YakitTag>
            )}
          </div>,
        ]
      case AITaskStatus.error:
        return [
          <TaskErrorIcon key="error" />,
          <div className={styles['divider-content-text']}>
            <span>{name}</span>
            <YakitTag fullRadius className={styles['divider-content-error']} size="small" color="danger">
              <XOutlined color="currentColor" />
              <p className={styles['divider-content-error-text']}>{desc}</p>
            </YakitTag>
          </div>,
        ]
      case AITaskStatus.skipped:
        return [
          <TaskSkippedIcon key="skipped" />,
          <div className={styles['divider-content-text']}>
            <span>{name}</span>
            <YakitTag fullRadius className={styles['divider-content-error']} size="small" color="white">
              <XOutlined color="currentColor" />
              <p className={styles['divider-content-error-text']}>{desc}</p>
            </YakitTag>
          </div>,
        ]
      case AITaskStatus.cancel: {
        const { error, success } = props
        return [
          <div key="circle" className={styles['node-circle-icon']} />,
          <div className={classNames(styles['divider-content-success'], styles['divider-content-text'])}>
            <span>{name}</span>
            {[error, success]
              .filter((ele) => !!ele)
              .map((item, index) => {
                return (
                  <YakitTag
                    key={index}
                    size="small"
                    fullRadius
                    color={index === 0 ? 'danger' : 'success'}
                    className={styles['divider-content-success-tag']}
                  >
                    {item}
                  </YakitTag>
                )
              })}
            <span className={styles['divider-content-text-desc']}>{desc}</span>
          </div>,
        ]
      }
      default:
        return [null, null]
    }
  }, [props])
  return (
    <div className={styles.divider} hidden={!dom}>
      <div />
      <div className={styles['divider-content']}>
        <div className={styles['divider-content-icon']}>{icon}</div>
        {dom}
      </div>
    </div>
  )
}
export default DividerCard
