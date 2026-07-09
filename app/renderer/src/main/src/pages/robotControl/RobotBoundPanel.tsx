import React from 'react'
import { DingtalkIcon, FeishuIcon } from '@/assets/commonProcessIcons'
import { YakitEllipsis } from '@/components/basics/YakitEllipsis'
import { RobotChannelType } from './RobotControl'
import styles from './RobotControl.module.scss'

export interface RobotLinkInfo {
  /** @name 机器人配置标识，优先展示 owner open_id，回退到 app id */
  openId: string
  /** @name 应用 AppID */
  appId?: string
  /** @name 头像地址，接口返回 */
  avatarUrl?: string
  /** @name 绑定渠道 */
  channel: RobotChannelType
  /** @name 绑定状态文案 */
  boundAt?: string
}

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

export interface RobotBoundPanelProps {
  linkInfo: RobotLinkInfo
  channelLabel: string
}

export const RobotBoundPanel: React.FC<RobotBoundPanelProps> = (props) => {
  const { linkInfo, channelLabel } = props

  return (
    <div className={styles['robot-bound-panel']}>
      <div className={styles['robot-bound-info']}>
        <div className={styles['robot-bound-info-header']}>
          <div className={styles['robot-bound-avatar']}>
            {linkInfo.avatarUrl ? (
              <img src={linkInfo.avatarUrl} alt="" className={styles['robot-bound-avatar-img']} />
            ) : (
              <span className={styles['robot-bound-avatar-placeholder']}>😊</span>
            )}
          </div>
          <YakitEllipsis text={linkInfo.openId || linkInfo.appId || ''} />
        </div>

        <div className={styles['robot-bound-meta']}>
          <span className={styles['robot-bound-channel-tag']}>
            <span className={styles['robot-bound-channel-icon']}>{getChannelIcon(linkInfo.channel)}</span>
            <span>{channelLabel}</span>
          </span>
          <span className={styles['robot-bound-time']}>{linkInfo.boundAt || '已保存凭据'}</span>
        </div>
      </div>
    </div>
  )
}
