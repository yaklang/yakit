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
import type { IMControlBadgePlatform } from './status'
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

const getChannelName = (channel?: RobotChannelType) => {
  switch (channel) {
    case 'feishu':
      return '飞书'
    case 'dingtalk':
      return '钉钉'
    default:
      return '机器人'
  }
}

export interface RobotDetailPanelProps {
  robot: RobotListItem
  onDelete?: () => void
  onToggleEnabled?: (enabled: boolean) => void
  onLinkInfoChange?: (info?: RobotLinkInfo, bot?: IMBotConfigLike) => void
  onUnbound?: (platform?: IMPlatform) => void
  onBotConfigChange?: (patch: Partial<IMBotConfigLike>) => void
  runtimeConfig: IMControlConfig
  runtimeConfigLoading?: boolean
  runtimeRunning?: boolean
  runtimePlatform?: IMControlBadgePlatform
  runtimePlatformMissing?: boolean
  onRuntimeConfigChange: (config: IMControlConfig) => void
}

export const RobotDetailPanel: React.FC<RobotDetailPanelProps> = (props) => {
  const {
    robot,
    onDelete,
    onToggleEnabled,
    onLinkInfoChange,
    onUnbound,
    onBotConfigChange,
    runtimeConfig,
    runtimeConfigLoading,
    runtimeRunning,
    runtimePlatform,
    runtimePlatformMissing,
    onRuntimeConfigChange,
  } = props
  const { t } = useI18nNamespaces(['layout'])
  const enabled = robot.enabled !== false
  const channelName = getChannelName(robot.channel)
  const runtimeDisconnected = enabled && robot.bound && runtimePlatform?.Connected === false
  let statusText = getRunningStatusText(robot.channel)
  if (!enabled) {
    statusText = '机器人已停用'
  } else if (!robot.bound) {
    statusText = '机器人未绑定'
  } else if (runtimeDisconnected) {
    statusText = `${channelName}连接异常`
  } else if (runtimePlatformMissing) {
    statusText = `${channelName}状态同步中`
  } else if (runtimeRunning === false) {
    statusText = `${channelName}未启动`
  }
  const statusActive =
    enabled && robot.bound && !runtimeDisconnected && !runtimePlatformMissing && runtimeRunning !== false
  const statusTitle =
    runtimeDisconnected && runtimePlatform?.Message
      ? runtimePlatform.Message
      : runtimePlatformMissing
        ? `${channelName}连接状态暂未上报`
        : statusText

  return (
    <div className={styles['robot-detail-panel']}>
      <div className={styles['robot-detail-header']}>
        <div className={styles['robot-detail-header-left']}>
          <div className={styles['detail-header-icon']}>{getChannelIcon(robot.channel)}</div>
          <div className={styles['robot-detail-header-info']}>
            <div className={styles['robot-detail-name']}>{robot.name}</div>
            <div className={styles['robot-detail-status']} title={statusTitle}>
              <span
                className={classNames(styles['robot-detail-status-dot'], {
                  [styles['active']]: statusActive,
                  [styles['warning']]: runtimePlatformMissing,
                  [styles['error']]: runtimeDisconnected,
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

        <div className={styles['robot-detail-card']}>
          <div className={styles['robot-link-card-header-main']}>
            <div className={styles['robot-detail-card-content']}>
              <div className={styles['robot-detail-card-title']}>群聊访问控制</div>
              <div className={styles['robot-detail-card-desc']}>
                开启后，只有所有者和白名单用户可以在群聊中与机器人互动；关闭时群成员都可以使用。
              </div>
            </div>
          </div>
          <div className={styles['robot-setting-list']}>
            <div className={styles['robot-setting-item']}>
              <div className={styles['robot-setting-copy']}>
                <div className={styles['robot-setting-title']}>仅允许白名单用户</div>
                <div className={styles['robot-setting-desc']}>
                  默认关闭。白名单在后续权限配置中维护，所有者始终可用。
                </div>
              </div>
              <YakitSwitch
                checked={!!robot.bot?.GroupAccessControl}
                disabled={!robot.bot}
                onChange={(checked) => onBotConfigChange?.({ GroupAccessControl: checked })}
              />
            </div>
          </div>
        </div>

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
