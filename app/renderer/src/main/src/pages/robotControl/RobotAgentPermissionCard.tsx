import React from 'react'
import classNames from 'classnames'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import type { IMControlConfig, IMReviewPolicy } from './api'
import styles from './RobotControl.module.scss'

const REVIEW_POLICY_OPTIONS: Array<{
  value: IMReviewPolicy
  label: string
  description: string
}> = [
  { value: 'manual', label: '人工', description: '敏感动作暂停，等待用户确认后继续执行。' },
  { value: 'yolo', label: '托管 YOLO', description: '动作由 Agent 自动执行，仅适合受控环境。' },
  { value: 'ai', label: '协同 AI', description: 'AI 参与风险判断，必要时转交人工。' },
]

export interface RobotAgentPermissionCardProps {
  config: IMControlConfig
  loading?: boolean
  onChange: (config: IMControlConfig) => void
}

export const RobotAgentPermissionCard: React.FC<RobotAgentPermissionCardProps> = (props) => {
  const { config, loading, onChange } = props
  const reviewPolicy =
    REVIEW_POLICY_OPTIONS.find((item) => item.value === config.ReviewPolicy) || REVIEW_POLICY_OPTIONS[0]

  return (
    <div className={classNames(styles['robot-detail-card'], styles['robot-agent-permission-card'])}>
      <div className={styles['robot-link-card-header-main']}>
        <div className={styles['robot-detail-card-content']}>
          <div className={styles['robot-detail-card-title']}>AI Agent 权限</div>
          <div className={styles['robot-detail-card-desc']}>控制机器人触发工具、任务和敏感动作时的审批策略。</div>
        </div>
      </div>

      <div className={styles['robot-setting-list']}>
        <div className={styles['robot-setting-item']}>
          <div className={styles['robot-setting-copy']}>
            <div className={styles['robot-setting-title']}>执行审批</div>
            <div className={styles['robot-setting-desc']}>{reviewPolicy.description}</div>
          </div>
          <YakitSelect<IMReviewPolicy>
            size="small"
            value={reviewPolicy.value}
            disabled={loading}
            wrapperClassName={styles['robot-setting-select']}
            onChange={(value) => onChange({ ...config, ReviewPolicy: value })}
          >
            {REVIEW_POLICY_OPTIONS.map((item) => (
              <YakitSelect.Option key={item.value} value={item.value}>
                {item.label}
              </YakitSelect.Option>
            ))}
          </YakitSelect>
        </div>
      </div>
    </div>
  )
}
