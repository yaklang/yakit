import React from 'react'
import { DingtalkIcon, FeishuIcon } from '@/assets/commonProcessIcons'
import { YakitEllipsis } from '@/components/basics/YakitEllipsis'
import { RobotChannelType } from './RobotControl'
import styles from './RobotControl.module.scss'

export interface RobotLinkInfo {
  /** @name IM 端 open id */
  openId: string
  /** @name 头像地址，接口返回 */
  avatarUrl?: string
  /** @name 绑定渠道 */
  channel: RobotChannelType
  /** @name 绑定时间 */
  boundAt: string
}

/** @name 已绑定机器人 MOCK 数据，后续由接口替换 */
export const MOCK_LINK_INFO: RobotLinkInfo = {
  openId: 'oc_938483f20447bcad4f8e2a91c3d5e6f7',
  channel: 'feishu',
  boundAt: '2026-06-30 16:59:26',
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
          <YakitEllipsis text={linkInfo.openId} />
        </div>

        <div className={styles['robot-bound-meta']}>
          <span className={styles['robot-bound-channel-tag']}>
            <span className={styles['robot-bound-channel-icon']}>{getChannelIcon(linkInfo.channel)}</span>
            <span>{channelLabel}</span>
          </span>
          <span className={styles['robot-bound-time']}>{linkInfo.boundAt}</span>
        </div>
      </div>
    </div>
  )
}
