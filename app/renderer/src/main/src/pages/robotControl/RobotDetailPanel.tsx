import React from 'react'
import classNames from 'classnames'
import { DingtalkIcon, FeishuIcon } from '@/assets/commonProcessIcons'
import { OutlineTrashIcon } from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { RobotLinkRobotCard } from './RobotLinkRobotCard'
import { RobotLinkInfo } from './RobotBoundPanel'
import { RobotSlashCommandCard } from './RobotSlashCommandCard'
import { RobotRuntimeSettingCard } from './RobotRuntimeSettingCard'
import { RobotChannelType, RobotListItem } from './RobotControl'
import type { IMBotConfigLike, IMControlConfig, IMPlatform } from './api'
import styles from './RobotControl.module.scss'

const getChannelIcon = (channel?: RobotChannelType) => {
  switch (channel) {
    case 'feishu':
      return <FeishuIcon />
    case 'dingtalk':
      return <DingtalkIcon />
    default:
      return <FeishuIcon />
  }
}

const getRunningStatusText = (channel?: RobotChannelType) => {
  switch (channel) {
    case 'feishu':
      return '飞书 WebSocket 运行中'
    case 'dingtalk':
      return '钉钉 Stream 运行中'
    default:
      return '机器人运行中'
  }
}

export interface RobotDetailPanelProps {
  robot: RobotListItem
  onDelete?: () => void
  onToggleEnabled?: (enabled: boolean) => void
  onLinkInfoChange?: (info?: RobotLinkInfo, bot?: IMBotConfigLike) => void
  onUnbound?: (platform?: IMPlatform) => void
  runtimeConfig: IMControlConfig
  runtimeConfigLoading?: boolean
  onRuntimeConfigChange: (config: IMControlConfig) => void
}

export const RobotDetailPanel: React.FC<RobotDetailPanelProps> = (props) => {
  const {
    robot,
    onDelete,
    onToggleEnabled,
    onLinkInfoChange,
    onUnbound,
    runtimeConfig,
    runtimeConfigLoading,
    onRuntimeConfigChange,
  } = props
  const { t } = useI18nNamespaces(['layout'])
  const enabled = robot.enabled !== false
  const statusText = !enabled ? '机器人已停用' : robot.bound ? getRunningStatusText(robot.channel) : '机器人未绑定'
  const statusActive = enabled && robot.bound

  return (
    <div className={styles['robot-detail-panel']}>
      <div className={styles['robot-detail-header']}>
        <div className={styles['robot-detail-header-left']}>
          <div className={styles['detail-header-icon']}>{getChannelIcon(robot.channel)}</div>
          <div className={styles['robot-detail-header-info']}>
            <div className={styles['robot-detail-name']}>{robot.name}</div>
            <div className={styles['robot-detail-status']}>
              <span
                className={classNames(styles['robot-detail-status-dot'], {
                  [styles['active']]: statusActive,
                })}
              />
              <span>{statusText}</span>
            </div>
          </div>
        </div>
        <YakitSwitch checked={enabled} onChange={(checked) => onToggleEnabled?.(checked)} />
      </div>

      <div className={styles['robot-detail-cards']}>
        <RobotLinkRobotCard
          channel={robot.channel}
          linkInfo={robot.linkInfo}
          onLinkInfoChange={onLinkInfoChange}
          onUnbound={onUnbound}
        />

        <RobotRuntimeSettingCard
          config={runtimeConfig}
          loading={runtimeConfigLoading}
          onChange={onRuntimeConfigChange}
        />

        <RobotSlashCommandCard />

        <div className={styles['robot-detail-card']}>
          <div className={styles['robot-detail-card-main']}>
            <div className={styles['robot-detail-card-content']}>
              <div className={styles['robot-detail-card-title']}>{t('RobotControl.deleteRobot')}</div>
              <div className={styles['robot-detail-card-desc']}>{t('RobotControl.deleteRobotDesc')}</div>
            </div>
            <YakitButton type="primary" colors="danger" icon={<OutlineTrashIcon />} onClick={onDelete}>
              {t('RobotControl.deleteRobot')}
            </YakitButton>
          </div>
        </div>
      </div>
    </div>
  )
}
