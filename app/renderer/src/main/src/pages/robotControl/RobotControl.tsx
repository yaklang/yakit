import React, { useEffect, useMemo, useRef, useState } from 'react'
import { InputRef } from 'antd'
import { useMemoizedFn, useVirtualList } from 'ahooks'
import classNames from 'classnames'
import { DingtalkIcon, FeishuIcon } from '@/assets/commonProcessIcons'
import { OutlinePlusIcon } from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { randomString } from '@/utils/randomUtil'
import { RobotDetailPanel } from './RobotDetailPanel'
import { MOCK_LINK_INFO, RobotLinkInfo } from './RobotBoundPanel'
import styles from './RobotControl.module.scss'

export type RobotChannelType = 'wechat' | 'feishu' | 'lark' | 'telegram' | 'dingtalk' | 'discord' | 'wecom'

export interface RobotListItem {
  /** @name 机器人唯一标识 */
  id: string
  /** @name 机器人名称 */
  name: string
  /** @name 接入渠道类型 */
  channel?: RobotChannelType
  /** @name 渠道区域（如飞书中国/ Lark 全球） */
  region?: 'china' | 'global'
  /** @name 是否为未保存的临时草稿 */
  isDraft?: boolean
  /** @name 左侧列表项是否处于名称编辑态 */
  isNameEditing?: boolean
  /** @name 机器人是否启用 */
  enabled?: boolean
  /** @name 是否已完成 IM 端绑定 */
  bound?: boolean
  /** @name IM 端绑定详情 */
  linkInfo?: RobotLinkInfo
}

interface RobotChannelOption {
  key: RobotChannelType
  enabled: boolean
  region?: 'china' | 'global'
}

const CHANNEL_OPTIONS: RobotChannelOption[] = [
  { key: 'feishu', enabled: true, region: 'china' },
  { key: 'dingtalk', enabled: true },
]

const DEFAULT_ROBOTS: RobotListItem[] = [
  {
    id: 'robot-zcode',
    name: 'zcode',
    channel: 'feishu',
    region: 'china',
    bound: true,
    enabled: true,
    linkInfo: MOCK_LINK_INFO,
  },
]

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

export interface RobotControlProps {
  onCancel?: () => void
}

export const RobotControl: React.FC<RobotControlProps> = () => {
  const { t } = useI18nNamespaces(['layout'])
  const [robots] = useState<RobotListItem[]>(DEFAULT_ROBOTS)
  const [draftRobots, setDraftRobots] = useState<RobotListItem[]>([])
  const [activeRobotId, setActiveRobotId] = useState<string>()
  const [isNewRobotView, setIsNewRobotView] = useState(true)
  const nameInputRef = useRef<Record<string, InputRef | null>>({})

  const robotList = useMemo(() => [...draftRobots, ...robots], [draftRobots, robots])

  const listRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [virtualList] = useVirtualList(robotList, {
    containerTarget: listRef,
    wrapperTarget: wrapperRef,
    itemHeight: 56,
    overscan: 10,
  })

  const activeRobot = useMemo(() => {
    return robotList.find((item) => item.id === activeRobotId)
  }, [activeRobotId, robotList])

  const editingRobot = useMemo(() => {
    return robotList.find((item) => item.isNameEditing)
  }, [robotList])

  useEffect(() => {
    if (editingRobot?.isNameEditing) {
      setTimeout(() => {
        const input = nameInputRef.current[editingRobot.id]
        input?.focus()
        input?.select()
      }, 50)
    }
  }, [editingRobot?.id, editingRobot?.isNameEditing])

  const getChannelLabel = useMemoizedFn((channel?: RobotChannelType) => {
    if (!channel) return ''
    return t(`RobotControl.channel.${channel}`)
  })

  const onCreateRobot = useMemoizedFn(() => {
    setIsNewRobotView(true)
    setActiveRobotId(undefined)
  })

  const onSelectRobot = useMemoizedFn((id: string) => {
    setIsNewRobotView(false)
    setActiveRobotId(id)
  })

  const onSelectChannel = useMemoizedFn((channel: RobotChannelType) => {
    const option = CHANNEL_OPTIONS.find((item) => item.key === channel)
    if (!option?.enabled) return

    const id = `draft-${randomString(8)}`
    const newDraft: RobotListItem = {
      id,
      name: t('RobotControl.newRobotName'),
      channel: option.key,
      region: option.region,
      isDraft: true,
      isNameEditing: true,
      enabled: true,
      bound: false,
    }
    setDraftRobots((prev) => [...prev, newDraft])
    setActiveRobotId(id)
    setIsNewRobotView(false)
  })

  const updateDraftRobot = useMemoizedFn((id: string, patch: Partial<RobotListItem>) => {
    setDraftRobots((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  })

  const onNameBlur = useMemoizedFn((id: string, value: string) => {
    const trimmed = value.trim()
    updateDraftRobot(id, {
      name: trimmed || t('RobotControl.newRobotName'),
      isNameEditing: false,
    })
  })

  const onNameInputClick = useMemoizedFn((e: React.MouseEvent) => {
    e.stopPropagation()
  })

  const onStartEditName = useMemoizedFn((id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const target = draftRobots.find((item) => item.id === id)
    if (!target?.isDraft) return
    updateDraftRobot(id, { isNameEditing: true })
  })

  const onDeleteRobot = useMemoizedFn((id: string) => {
    setDraftRobots((prev) => {
      const next = prev.filter((item) => item.id !== id)
      if (activeRobotId === id) {
        if (next.length > 0) {
          setActiveRobotId(next[0].id)
          setIsNewRobotView(false)
        } else if (robots.length > 0) {
          setActiveRobotId(robots[0].id)
          setIsNewRobotView(false)
        } else {
          setActiveRobotId(undefined)
          setIsNewRobotView(true)
        }
      }
      return next
    })
  })

  const onToggleEnabled = useMemoizedFn((id: string, enabled: boolean) => {
    if (id.startsWith('draft-')) {
      updateDraftRobot(id, { enabled })
    }
  })

  const onLinkInfoChange = useMemoizedFn((id: string, info?: RobotLinkInfo) => {
    if (id.startsWith('draft-')) {
      updateDraftRobot(id, { linkInfo: info, bound: !!info })
    }
  })

  const renderRegionTag = (region?: 'china' | 'global') => {
    if (!region) return null
    return <span className={styles['region-tag']}>{t(`RobotControl.region.${region}`)}</span>
  }

  const renderListItemName = (item: RobotListItem) => {
    if (item.isDraft && item.isNameEditing && activeRobotId === item.id) {
      return (
        <YakitInput
          ref={(el) => {
            nameInputRef.current[item.id] = el
          }}
          size="small"
          className={styles['robot-list-name-input']}
          defaultValue={item.name}
          onClick={onNameInputClick}
          onMouseDown={onNameInputClick}
          onBlur={(e) => onNameBlur(item.id, e.target.value)}
          onPressEnter={(e) => (e.target as HTMLInputElement).blur()}
        />
      )
    }
    return (
      <div
        className={styles['robot-list-name']}
        onDoubleClick={item.isDraft ? (e) => onStartEditName(item.id, e) : undefined}
      >
        {item.name}
      </div>
    )
  }

  return (
    <div className={styles['robot-control-wrapper']}>
      <div className={styles['robot-sidebar']}>
        <YakitButton
          type="outline2"
          className={styles['create-robot-btn']}
          icon={<OutlinePlusIcon />}
          onClick={onCreateRobot}
        >
          {t('RobotControl.createRobot')}
        </YakitButton>
        <div ref={listRef} className={styles['robot-list-container']}>
          <div ref={wrapperRef}>
            {virtualList.map(({ data: item }) => (
              <div
                key={item.id}
                className={classNames(styles['robot-list-item'], {
                  [styles['active']]: activeRobotId === item.id,
                })}
                onClick={() => onSelectRobot(item.id)}
              >
                <div className={styles['robot-list-icon']}>{getChannelIcon(item.channel)}</div>
                <div className={styles['robot-list-info']}>
                  {renderListItemName(item)}
                  {item.channel && (
                    <div className={styles['robot-list-platform']}>
                      <span>{getChannelLabel(item.channel)}</span>
                      {renderRegionTag(item.region)}
                    </div>
                  )}
                </div>
                <div
                  className={classNames(styles['robot-status-dot'], {
                    [styles['active']]: item.enabled,
                  })}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles['robot-main-content']}>
        {isNewRobotView ? (
          <>
            <div className={styles['new-robot-title']}>{t('RobotControl.createRobot')}</div>
            <div className={styles['new-robot-desc']}>{t('RobotControl.createRobotDesc')}</div>
            <div className={styles['channel-grid']}>
              {CHANNEL_OPTIONS.map((option) => {
                const descKey = option.enabled ? `RobotControl.channelDesc.${option.key}` : 'RobotControl.comingSoon'
                return (
                  <div
                    key={option.key}
                    className={classNames(styles['channel-card'], {
                      [styles['disabled']]: !option.enabled,
                    })}
                    onClick={() => onSelectChannel(option.key)}
                  >
                    <div className={styles['channel-icon']}>{getChannelIcon(option.key)}</div>
                    <div className={styles['channel-info']}>
                      <div className={styles['channel-title-row']}>
                        <span className={styles['channel-title']}>{t(`RobotControl.channel.${option.key}`)}</span>
                        {renderRegionTag(option.region)}
                      </div>
                      <div className={styles['channel-desc']}>{t(descKey)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : activeRobot ? (
          <RobotDetailPanel
            robot={activeRobot}
            onDelete={activeRobot.isDraft ? () => onDeleteRobot(activeRobot.id) : undefined}
            onToggleEnabled={(enabled) => onToggleEnabled(activeRobot.id, enabled)}
            onLinkInfoChange={(info) => onLinkInfoChange(activeRobot.id, info)}
          />
        ) : (
          <div className={styles['robot-detail-placeholder']}>{t('RobotControl.robotDetailPlaceholder')}</div>
        )}
      </div>
    </div>
  )
}
