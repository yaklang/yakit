import React from 'react'
import { DingtalkIcon, FeishuIcon } from '@/assets/commonProcessIcons'
import { OutlineTrashIcon } from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { RobotLinkRobotCard } from './RobotLinkRobotCard'
import { RobotLinkInfo } from './RobotBoundPanel'
import { RobotSlashCommandCard } from './RobotSlashCommandCard'
import { RobotChannelType, RobotListItem } from './RobotControl'
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

export interface RobotDetailPanelProps {
  robot: RobotListItem
  onDelete?: () => void
  onToggleEnabled?: (enabled: boolean) => void
  onLinkInfoChange?: (info?: RobotLinkInfo) => void
}

export const RobotDetailPanel: React.FC<RobotDetailPanelProps> = (props) => {
  const { robot, onDelete, onToggleEnabled, onLinkInfoChange } = props
  const { t } = useI18nNamespaces(['layout'])

  return (
    <div className={styles['robot-detail-panel']}>
      <div className={styles['robot-detail-header']}>
        <div className={styles['robot-detail-header-left']}>
          <div className={styles['detail-header-icon']}>{getChannelIcon(robot.channel)}</div>
          <div className={styles['robot-detail-header-info']}>
            <div className={styles['robot-detail-name']}>{robot.name}</div>
            <div className={styles['robot-detail-status']}>
              {robot.bound ? t('RobotControl.bound') : t('RobotControl.unbound')}
            </div>
          </div>
        </div>
        <YakitSwitch checked={robot.enabled !== false} onChange={(checked) => onToggleEnabled?.(checked)} />
      </div>

      <div className={styles['robot-detail-cards']}>
        <RobotLinkRobotCard
          channel={robot.channel}
          linkInfo={robot.linkInfo}
          onLinkInfoChange={onLinkInfoChange}
        />

        <RobotSlashCommandCard />

        {robot.isDraft && (
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
        )}
      </div>
    </div>
  )
}
