import React, { useEffect, useMemo, useRef, useState } from 'react'
import { InputRef } from 'antd'
import { useMemoizedFn, useVirtualList } from 'ahooks'
import classNames from 'classnames'
import { DingtalkIcon, FeishuIcon } from '@/assets/commonProcessIcons'
import { OutlinePlusIcon } from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { yakitNotify } from '@/utils/notification'
import { getLocalValue, setLocalValue } from '@/utils/kv'
import { RobotDetailPanel } from './RobotDetailPanel'
import { RobotLinkInfo } from './RobotBoundPanel'
import {
  DEFAULT_IM_CONTROL_CONFIG,
  deleteIMBot,
  getIMControlStatus,
  listIMBots,
  normalizeIMControlConfig,
  saveIMBot,
  startIMControl,
  stopIMControl,
  updateIMControlConfig,
  type IMBotConfigLike,
  type IMControlConfig,
} from './api'
import type { IMControlBadgePlatform, IMControlBadgeStatus } from './status'
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
  /** @name 后端 IM bot 配置 */
  bot?: IMBotConfigLike
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

const IM_CONTROL_CONFIG_CACHE_KEY = 'robot-control-im-runtime-config'

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

const getChannelRuntimeText = (channel?: RobotChannelType, channelLabel = '机器人') => {
  switch (channel) {
    case 'feishu':
      return `${channelLabel} WebSocket 运行中`
    case 'dingtalk':
      return `${channelLabel} Stream 运行中`
    default:
      return `${channelLabel}运行中`
  }
}

const normalizeRuntimePlatform = (platform?: string) => {
  const value = `${platform || ''}`.trim().toLowerCase()
  if (!value) return ''
  if (
    value === 'feishu' ||
    value === 'lark' ||
    value.includes('feishu') ||
    value.includes('lark') ||
    value.includes('飞书')
  ) {
    return 'feishu'
  }
  if (value === 'dingtalk' || value.includes('dingtalk') || value.includes('ding') || value.includes('钉钉')) {
    return 'dingtalk'
  }
  return value
}

export interface RobotControlProps {
  onCancel?: () => void
  onRuntimeStatusChange?: () => void
  runtimeStatus?: IMControlBadgeStatus
}

export const RobotControl: React.FC<RobotControlProps> = (props) => {
  const { onRuntimeStatusChange, runtimeStatus } = props
  const { t } = useI18nNamespaces(['layout'])
  const [robots, setRobots] = useState<RobotListItem[]>([])
  const [draftRobots, setDraftRobots] = useState<RobotListItem[]>([])
  const [activeRobotId, setActiveRobotId] = useState<string>()
  const [isNewRobotView, setIsNewRobotView] = useState(true)
  const [loading, setLoading] = useState(false)
  const [runtimeConfig, setRuntimeConfig] = useState<IMControlConfig>(DEFAULT_IM_CONTROL_CONFIG)
  const [runtimeConfigLoading, setRuntimeConfigLoading] = useState(false)
  const nameInputRef = useRef<Record<string, InputRef | null>>({})
  const startedOnceRef = useRef(false)

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

  const isSupportedIMPlatform = (value?: RobotChannelType): value is 'feishu' | 'dingtalk' => {
    return value === 'feishu' || value === 'dingtalk'
  }

  const getRobotId = (platform: string) => `robot-${platform}`

  const getChannelRegion = (platform?: string): 'china' | 'global' | undefined => {
    return platform === 'feishu' ? 'china' : undefined
  }

  const getChannelLabel = useMemoizedFn((channel?: RobotChannelType) => {
    if (!channel) return ''
    return t(`RobotControl.channel.${channel}`)
  })

  const buildLinkInfo = (bot: IMBotConfigLike): RobotLinkInfo => {
    return {
      openId: bot.OwnerId || '',
      appId: bot.AppId,
      channel: bot.Platform as RobotChannelType,
      boundAt: '已绑定所有者',
    }
  }

  const buildRobotFromBot = useMemoizedFn((bot: IMBotConfigLike): RobotListItem => {
    const channel = bot.Platform as RobotChannelType
    const channelLabel = isSupportedIMPlatform(channel) ? getChannelLabel(channel) : bot.Platform
    return {
      id: getRobotId(bot.Platform),
      name: `${channelLabel || bot.Platform}机器人`,
      channel,
      region: getChannelRegion(bot.Platform),
      enabled: bot.Enabled !== false,
      bound: !!bot.OwnerId,
      linkInfo: bot.OwnerId ? buildLinkInfo(bot) : undefined,
      bot,
    }
  })

  const getRuntimePlatform = (platform?: string): IMControlBadgePlatform | undefined => {
    const targetPlatform = normalizeRuntimePlatform(platform)
    if (!targetPlatform) return undefined
    return runtimeStatus?.Platforms?.find((item) => {
      return normalizeRuntimePlatform(item.Platform) === targetPlatform
    })
  }

  const isRuntimePlatformMissing = (item?: RobotListItem, runtimePlatform?: IMControlBadgePlatform) => {
    return !!(
      item?.enabled &&
      item.bound &&
      item.bot?.Platform &&
      runtimeStatus?.Running &&
      runtimeStatus.Platforms?.length &&
      !runtimePlatform
    )
  }

  const syncControlRuntime = useMemoizedFn(async (enabledPlatforms: string[], config = runtimeConfig) => {
    try {
      if (enabledPlatforms.length > 0) {
        await startIMControl(enabledPlatforms, config)
      } else {
        await stopIMControl()
      }
    } finally {
      onRuntimeStatusChange?.()
    }
  })

  const loadRuntimeConfig = useMemoizedFn(async (): Promise<IMControlConfig> => {
    try {
      const value = await getLocalValue(IM_CONTROL_CONFIG_CACHE_KEY)
      if (!value) return DEFAULT_IM_CONTROL_CONFIG
      const parsed = typeof value === 'string' ? JSON.parse(value) : value
      const nextConfig = normalizeIMControlConfig(parsed)
      setRuntimeConfig(nextConfig)
      return nextConfig
    } catch (e) {
      setRuntimeConfig(DEFAULT_IM_CONTROL_CONFIG)
      return DEFAULT_IM_CONTROL_CONFIG
    }
  })

  const onRuntimeConfigChange = useMemoizedFn(async (config: IMControlConfig) => {
    const nextConfig = normalizeIMControlConfig(config)
    setRuntimeConfig(nextConfig)
    setLocalValue(IM_CONTROL_CONFIG_CACHE_KEY, JSON.stringify(nextConfig))
    setRuntimeConfigLoading(true)
    try {
      await updateIMControlConfig(nextConfig)
      onRuntimeStatusChange?.()
    } catch (e) {
      yakitNotify('error', `移动端控制配置保存失败：${e}`)
    } finally {
      setRuntimeConfigLoading(false)
    }
  })

  const onBotConfigChange = useMemoizedFn(async (id: string, patch: Partial<IMBotConfigLike>) => {
    const target = robots.find((item) => item.id === id)
    if (!target?.bot) return
    const nextBot = { ...target.bot, ...patch }
    try {
      await saveIMBot(nextBot)
      await loadBots(false)
      yakitNotify('success', '机器人配置已保存')
    } catch (e) {
      yakitNotify('error', `机器人配置保存失败：${e}`)
    }
  })

  const loadBots = useMemoizedFn(async (autoStart = false, config = runtimeConfig) => {
    setLoading(true)
    try {
      const res = await listIMBots()
      const nextRobots = (res.Bots || [])
        .filter((bot) => isSupportedIMPlatform(bot.Platform as RobotChannelType))
        .map((bot) => buildRobotFromBot(bot))

      setRobots(nextRobots)
      setDraftRobots((prev) => prev.filter((item) => !nextRobots.some((robot) => robot.channel === item.channel)))

      const nextIds = new Set([...nextRobots.map((item) => item.id), ...draftRobots.map((item) => item.id)])
      if (activeRobotId && nextIds.has(activeRobotId)) {
        setIsNewRobotView(false)
      } else if (nextRobots.length > 0) {
        setActiveRobotId(nextRobots[0].id)
        setIsNewRobotView(false)
      } else {
        setActiveRobotId(undefined)
        setIsNewRobotView(true)
      }

      if (autoStart) {
        const enabledPlatforms = nextRobots.filter((item) => item.enabled && item.bot).map((item) => item.bot!.Platform)
        if (enabledPlatforms.length > 0) {
          const status = await getIMControlStatus().catch(() => undefined)
          if (!status?.Running) {
            await syncControlRuntime(enabledPlatforms, config)
          } else {
            onRuntimeStatusChange?.()
          }
        } else {
          onRuntimeStatusChange?.()
        }
      }
    } catch (e) {
      yakitNotify('error', `加载机器人配置失败：${e}`)
    } finally {
      setLoading(false)
    }
  })

  useEffect(() => {
    if (startedOnceRef.current) return
    startedOnceRef.current = true
    loadRuntimeConfig().then((config) => {
      loadBots(true, config)
    })
  }, [])

  useEffect(() => {
    if (editingRobot?.isNameEditing) {
      setTimeout(() => {
        const input = nameInputRef.current[editingRobot.id]
        input?.focus()
        input?.select()
      }, 50)
    }
  }, [editingRobot?.id, editingRobot?.isNameEditing])

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

    const existing = robotList.find((item) => item.channel === channel)
    if (existing) {
      onSelectRobot(existing.id)
      return
    }

    const id = `draft-${channel}`
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

  const onDeleteRobot = useMemoizedFn(async (id: string) => {
    if (id.startsWith('draft-')) {
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
      return
    }

    const target = robots.find((item) => item.id === id)
    if (!target?.bot) return

    try {
      await deleteIMBot(target.bot.Platform)
      const enabledPlatforms = robots
        .filter((item) => item.enabled && item.bot && item.bot.Platform !== target.bot!.Platform)
        .map((item) => item.bot!.Platform)
      await syncControlRuntime(enabledPlatforms)
      await loadBots(false)
      yakitNotify('success', '机器人已删除')
    } catch (e) {
      yakitNotify('error', `删除机器人失败：${e}`)
    }
  })

  const onToggleEnabled = useMemoizedFn(async (id: string, enabled: boolean) => {
    if (id.startsWith('draft-')) {
      updateDraftRobot(id, { enabled })
      return
    }

    const target = robots.find((item) => item.id === id)
    if (!target?.bot) return

    const nextBot = { ...target.bot, Enabled: enabled }
    try {
      await saveIMBot(nextBot)
      const enabledPlatforms = robots
        .map((item) => (item.id === id ? { ...item, bot: nextBot, enabled } : item))
        .filter((item) => item.enabled && item.bot)
        .map((item) => item.bot!.Platform)
      await syncControlRuntime(enabledPlatforms)
      await loadBots(false)
      const channelLabel = target.channel ? getChannelLabel(target.channel) : target.bot.Platform
      yakitNotify(
        'success',
        enabled ? getChannelRuntimeText(target.channel, channelLabel) : `${channelLabel}机器人已停用`,
      )
    } catch (e) {
      yakitNotify('error', `更新机器人启用状态失败：${e}`)
    }
  })

  const onLinkInfoChange = useMemoizedFn(async (id: string, info?: RobotLinkInfo, bot?: IMBotConfigLike) => {
    if (bot) {
      const nextBot = { ...bot, Enabled: bot.Enabled !== false }
      setDraftRobots((prev) => prev.filter((item) => item.id !== id && item.channel !== nextBot.Platform))
      setActiveRobotId(getRobotId(nextBot.Platform))
      setIsNewRobotView(false)
      const enabledPlatforms = Array.from(
        new Set([
          ...robots.filter((item) => item.enabled && item.bot).map((item) => item.bot!.Platform),
          nextBot.Platform,
        ]),
      )
      await syncControlRuntime(enabledPlatforms).catch((e) => {
        yakitNotify('error', `启动移动端控制失败：${e}`)
      })
      await loadBots(false)
      return
    }

    if (id.startsWith('draft-')) {
      updateDraftRobot(id, { linkInfo: info, bound: !!info })
    }
  })

  const onUnbound = useMemoizedFn(async (platform?: string) => {
    const enabledPlatforms = robots
      .filter((item) => item.enabled && item.bot && item.bot.Platform !== platform)
      .map((item) => item.bot!.Platform)
    await syncControlRuntime(enabledPlatforms).catch((e) => {
      yakitNotify('error', `同步移动端控制状态失败：${e}`)
    })
    await loadBots(false)
  })

  const renderRegionTag = (region?: 'china' | 'global') => {
    if (!region) return null
    return <span className={styles['region-tag']}>{t(`RobotControl.region.${region}`)}</span>
  }

  const getChannelDesc = (option: RobotChannelOption) => {
    const occupied = robotList.some((item) => item.channel === option.key)
    if (occupied) return '已创建，可在左侧管理'
    if (!option.enabled) return t('RobotControl.comingSoon')
    return t(`RobotControl.channelDesc.${option.key}`)
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

  const activeRobotRuntimePlatform = getRuntimePlatform(activeRobot?.bot?.Platform)
  const activeRobotRuntimeMissing = isRuntimePlatformMissing(activeRobot, activeRobotRuntimePlatform)

  return (
    <div className={styles['robot-control-wrapper']}>
      <div className={styles['robot-sidebar']}>
        <YakitButton
          type="outline2"
          className={styles['create-robot-btn']}
          icon={<OutlinePlusIcon />}
          loading={loading}
          onClick={onCreateRobot}
        >
          {t('RobotControl.createRobot')}
        </YakitButton>
        <div ref={listRef} className={styles['robot-list-container']}>
          <div ref={wrapperRef}>
            {virtualList.map(({ data: item }) => {
              const runtimePlatform = getRuntimePlatform(item.bot?.Platform)
              const runtimeDisconnected = item.enabled && item.bound && runtimePlatform?.Connected === false
              const runtimeMissing = isRuntimePlatformMissing(item, runtimePlatform)
              return (
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
                      [styles['active']]: item.enabled && !runtimeDisconnected && !runtimeMissing,
                      [styles['warning']]: runtimeMissing,
                      [styles['error']]: runtimeDisconnected,
                    })}
                    title={
                      runtimeDisconnected
                        ? runtimePlatform?.Message
                        : runtimeMissing
                          ? `${getChannelLabel(item.channel)}连接状态同步中`
                          : undefined
                    }
                  />
                </div>
              )
            })}
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
                const occupied = robotList.some((item) => item.channel === option.key)
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
                        {occupied && <span className={styles['region-tag']}>已创建</span>}
                      </div>
                      <div className={styles['channel-desc']}>{getChannelDesc(option)}</div>
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
            onLinkInfoChange={(info, bot) => onLinkInfoChange(activeRobot.id, info, bot)}
            onUnbound={onUnbound}
            onBotConfigChange={(patch) => onBotConfigChange(activeRobot.id, patch)}
            runtimeConfig={runtimeConfig}
            runtimeConfigLoading={runtimeConfigLoading}
            runtimeRunning={runtimeStatus?.Running}
            runtimePlatform={activeRobotRuntimePlatform}
            runtimePlatformMissing={activeRobotRuntimeMissing}
            onRuntimeConfigChange={onRuntimeConfigChange}
          />
        ) : (
          <div className={styles['robot-detail-placeholder']}>{t('RobotControl.robotDetailPlaceholder')}</div>
        )}
      </div>
    </div>
  )
}
