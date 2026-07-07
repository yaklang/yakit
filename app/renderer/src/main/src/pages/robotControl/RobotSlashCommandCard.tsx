import React, { useState } from 'react'
import classNames from 'classnames'
import { OutlineChevronsDownUpIcon, OutlineChevronsUpDownIcon } from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from './RobotControl.module.scss'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'

export interface SlashCommandItem {
  command: string
  description: string
}

export interface SlashCommandGroup {
  title: string
  commands: SlashCommandItem[]
}

/** @name 斜杠命令 MOCK 数据，后续由后端接口替换 */
export const MOCK_SLASH_COMMANDS: SlashCommandGroup[] = [
  {
    title: '会话管理',
    commands: [
      { command: '/new', description: '新建会话（清空上下文）' },
      { command: '/stop', description: '中断当前任务' },
      { command: '/status', description: '查看会话状态' },
    ],
  },
  {
    title: 'AI 配置',
    commands: [
      { command: '/model [名称]', description: '切换 AI 模型' },
      { command: '/mode [plan|react]', description: '切换执行模式' },
    ],
  },
  {
    title: '安全任务',
    commands: [
      { command: '/scan <目标>', description: '让 agent 扫描目标' },
      { command: '/mitm', description: '让 agent 启动 MITM' },
      { command: '/run <脚本>', description: '让 agent 执行 yak 脚本' },
    ],
  },
]

export interface RobotSlashCommandCardProps {
  /** @name 斜杠命令列表，默认使用 MOCK 数据 */
  commandGroups?: SlashCommandGroup[]
}

export const RobotSlashCommandCard: React.FC<RobotSlashCommandCardProps> = (props) => {
  const { commandGroups = MOCK_SLASH_COMMANDS } = props
  const { t } = useI18nNamespaces(['layout'])
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={classNames(styles['robot-detail-card'], styles['robot-slash-command-card'])}>
      <div className={styles['robot-link-card-header-main']}>
        <div className={styles['robot-detail-card-content']}>
          <div className={styles['robot-detail-card-title']}>{t('RobotControl.slashCommand')}</div>
          <div className={styles['robot-detail-card-desc']}>{t('RobotControl.slashCommandDesc')}</div>
        </div>
        <YakitButton
          type="text2"
          icon={expanded ? <OutlineChevronsDownUpIcon /> : <OutlineChevronsUpDownIcon />}
          onClick={() => setExpanded((prev) => !prev)}
        />
      </div>

      {expanded && (
        <div className={styles['robot-slash-panel']}>
          {commandGroups.map((group, groupIndex) => (
            <div
              key={group.title}
              className={classNames(styles['robot-slash-group'], {
                [styles['has-divider']]: groupIndex > 0,
              })}
            >
              <div className={styles['robot-slash-group-title']}>{group.title}</div>
              <div className={styles['robot-slash-command-list']}>
                {group.commands.map((item) => (
                  <div key={item.command} className={styles['robot-slash-command-item']}>
                    <div className={styles['robot-slash-command-tag']}>
                      <YakitTag size="small" className={styles['robot-slash-command-tag-item']}>
                        {item.command}
                      </YakitTag>
                    </div>

                    <span className={classNames(styles['robot-slash-command-desc'], 'yakit-content-single-ellipsis')}>
                      {item.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
