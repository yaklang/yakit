import { memo } from 'react'

import styles from './AITree.module.scss'

export const TaskInProgressIndicator = memo(() => (
  <div className={styles['task-in-progress-icon']}>
    <div className={styles['center-wrapper']} />
  </div>
))

TaskInProgressIndicator.displayName = 'TaskInProgressIndicator'
