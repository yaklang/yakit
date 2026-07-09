import React from 'react'
import classNames from 'classnames'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import type { IMControlConfig, IMGroupTrigger, IMReplyGranularity } from './api'
import styles from './RobotControl.module.scss'

const REPLY_GRANULARITY_OPTIONS: Array<{
  value: IMReplyGranularity
  label: string
  description: string
}> = [
  { value: 'standard', label: '标准', description: '只返回主要执行结果和必要说明' },
  { value: 'summary', label: '摘要', description: '更短的移动端友好回复' },
  { value: 'detailed', label: '详细', description: '包含更完整的执行过程和细节' },
]

const GROUP_TRIGGER_OPTIONS: Array<{
  value: IMGroupTrigger
  label: string
  description: string
}> = [
  { value: 'must_at', label: '需 @bot 或 /命令', description: '群聊中仅明确唤起时响应' },
  { value: 'allow_slash', label: '仅 /命令', description: '群聊中只响应斜杠命令' },
  { value: 'allow_all', label: '所有消息', description: '群聊所有消息都会触发 AI' },
]

export interface RobotRuntimeSettingCardProps {
  config: IMControlConfig
  loading?: boolean
  onChange: (config: IMControlConfig) => void
}

export const RobotRuntimeSettingCard: React.FC<RobotRuntimeSettingCardProps> = (props) => {
  const { config, loading, onChange } = props

  const updateConfig = (patch: Partial<IMControlConfig>) => {
    onChange({ ...config, ...patch })
  }

  const replyGranularity = REPLY_GRANULARITY_OPTIONS.find((item) => item.value === config.ReplyGranularity)
  const groupTrigger = GROUP_TRIGGER_OPTIONS.find((item) => item.value === config.GroupTrigger)

  return (
    <div className={classNames(styles['robot-detail-card'], styles['robot-runtime-setting-card'])}>
      <div className={styles['robot-link-card-header-main']}>
        <div className={styles['robot-detail-card-content']}>
          <div className={styles['robot-detail-card-title']}>回复与触发</div>
          <div className={styles['robot-detail-card-desc']}>控制机器人在 IM 端的回复样式和群聊触发方式。</div>
        </div>
      </div>

      <div className={styles['robot-setting-list']}>
        <div className={styles['robot-setting-item']}>
          <div className={styles['robot-setting-copy']}>
            <div className={styles['robot-setting-title']}>引用回复</div>
            <div className={styles['robot-setting-desc']}>开启后，bot 回复会尽量引用用户原消息。</div>
          </div>
          <YakitSwitch
            checked={config.ReplyQuote}
            disabled={loading}
            onChange={(checked) => updateConfig({ ReplyQuote: checked })}
          />
        </div>

        <div className={styles['robot-setting-item']}>
          <div className={styles['robot-setting-copy']}>
            <div className={styles['robot-setting-title']}>回复模式</div>
            <div className={styles['robot-setting-desc']}>{replyGranularity?.description || ''}</div>
          </div>
          <YakitSelect<IMReplyGranularity>
            size="small"
            value={config.ReplyGranularity}
            disabled={loading}
            wrapperClassName={styles['robot-setting-select']}
            onChange={(value) => updateConfig({ ReplyGranularity: value })}
          >
            {REPLY_GRANULARITY_OPTIONS.map((item) => (
              <YakitSelect.Option key={item.value} value={item.value}>
                {item.label}
              </YakitSelect.Option>
            ))}
          </YakitSelect>
        </div>

        <div className={styles['robot-setting-item']}>
          <div className={styles['robot-setting-copy']}>
            <div className={styles['robot-setting-title']}>群聊触发</div>
            <div className={styles['robot-setting-desc']}>{groupTrigger?.description || ''}</div>
          </div>
          <YakitSelect<IMGroupTrigger>
            size="small"
            value={config.GroupTrigger}
            disabled={loading}
            wrapperClassName={styles['robot-setting-select']}
            onChange={(value) => updateConfig({ GroupTrigger: value })}
          >
            {GROUP_TRIGGER_OPTIONS.map((item) => (
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
