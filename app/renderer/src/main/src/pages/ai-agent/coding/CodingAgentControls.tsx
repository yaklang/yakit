import { isCodingAgent } from '@/pages/ai-agent/agentMode'
import React, { useEffect, useState } from 'react'
import { Alert, Form, Spin, Tooltip } from 'antd'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { YakitDropdownMenu } from '@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu'
import {
  CheckOutlined,
  ChevronDownOutlined,
  FolderOutlined,
  DesktopComputerOutlined,
  PlusOutlined,
  SearchOutlined,
  GitMergeOutlined,
  XOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import useAIAgentStore from '../useContext/useStore'
import useAIAgentDispatcher from '../useContext/useDispatcher'
import { isChatSession } from '../utils/isChatSession'
import { createWelcomeChat } from '../defaultConstant'
import { openAIAgentChatTab } from '../historyChat/HistoryChat'
import { setExperimentalCoding, useExperimentalCoding } from './experimentalCodingStore'
import { listCodingSessions, queryCodingWorkspaces } from './api'
import type { CodingWorkspace } from './api'
import { codingSessionBinding, emptyCodingBinding, selectCodingWorkspace, workspaceRoots } from './binding'
import { openCodingWorktrees } from './navigation'
import { CodingWorkspaceCreate } from './CodingWorkspaceCreate'
import { CodingEnvironmentPopover } from './CodingEnvironmentPopover'
import emiter from '@/utils/eventBus/eventBus'
import { useCodingProjectPreferences } from './projectPreferences'
import styles from './CodingAgentControls.module.scss'

export const ExperimentalCodingSetting = () => {
  const enabled = useExperimentalCoding()
  const { t } = useI18nNamespaces(['aiAgent'])
  return (
    <Form.Item wrapperCol={{ span: 24 }} extra={t('CodingAgent.experimentalTip')}>
      <div className={styles.experimentalSettingRow}>
        <span>{t('CodingAgent.experimental')}</span>
        <YakitSwitch aria-label={t('CodingAgent.experimental')} checked={enabled} onChange={setExperimentalCoding} />
      </div>
    </Form.Item>
  )
}

export const CodingAgentControls = () => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const enabled = useExperimentalCoding()
  const { setting, activeChat, pendingChat } = useAIAgentStore()
  const { setSetting } = useAIAgentDispatcher()
  const [menuOpen, setMenuOpen] = useState(false)
  const locked = isChatSession(activeChat) || !!pendingChat
  const coding = isCodingAgent(setting)
  useEffect(() => {
    if (!enabled && !locked && coding) setSetting((old) => ({ ...old, ...emptyCodingBinding }))
  }, [enabled, locked, coding, setSetting])

  if (!enabled && !coding) return null
  return (
    <div className={styles.controls}>
      <div className={styles.bar}>
        <YakitDropdownMenu
          menu={{
            width: 248,
            type: 'grey',
            menuWrapperClassName: styles.modeMenu,
            data: [
              {
                key: 'security',
                noStyle: true,
                label: (
                  <div className={styles.modeOption}>
                    <div>
                      <strong>{t('CodingAgent.security')}</strong>
                      <span>{t('CodingAgent.securityDescription')}</span>
                    </div>
                    {!coding && <CheckOutlined />}
                  </div>
                ),
              },
              {
                key: 'coding',
                noStyle: true,
                label: (
                  <div className={styles.modeOption}>
                    <div>
                      <strong>
                        Coding Agent <small>{t('CodingAgent.preview')}</small>
                      </strong>
                      <span>{t('CodingAgent.codingDescription')}</span>
                    </div>
                    {coding && <CheckOutlined />}
                  </div>
                ),
                disabled: !enabled,
              },
            ],
            onClick: ({ key }) => {
              setMenuOpen(false)
              if ((key === 'coding' && !enabled) || (key === 'coding') === coding) return
              const nextSetting = {
                ...setting,
                ...emptyCodingBinding,
                AgentMode: key === 'coding' ? 'coding' : 'security',
              }
              if (locked) {
                // 保留原会话标签和建联归属，切换后的模式使用独立草稿，原任务继续在后台执行。
                openAIAgentChatTab({ ...createWelcomeChat(), StartParams: nextSetting })
                return
              }
              setSetting(nextSetting)
            },
          }}
          dropdown={{ trigger: ['click'], open: menuOpen, onOpenChange: setMenuOpen }}
        >
          <YakitButton className={styles.modeTrigger} type="text2">
            {coding ? 'Coding Agent' : t('CodingAgent.security')} <ChevronDownOutlined />
          </YakitButton>
        </YakitDropdownMenu>
      </div>
    </div>
  )
}

// Shared by the welcome composer and existing session composers.
export const CodingSessionControls = ({
  onWorkspaceChange,
}: {
  onWorkspaceChange?: (workspace?: CodingWorkspace) => void
}) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const enabled = useExperimentalCoding()
  const { setting, activeChat, pendingChat } = useAIAgentStore()
  const { setSetting, setActiveChat } = useAIAgentDispatcher()
  const locked = isChatSession(activeChat) || !!pendingChat
  const coding = isCodingAgent(setting)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [workspaces, setWorkspaces] = useState<CodingWorkspace[]>([])
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const preferences = useCodingProjectPreferences()
  const workspace = workspaces.find((item) => item.ID === setting.CodingWorkspaceID)
  const roots =
    (locked || setting.CodingWorktreeID) && setting.CodingSourceRoots?.length
      ? setting.CodingSourceRoots
      : workspace
        ? workspaceRoots(workspace)
        : setting.CodingSourceRoots || []
  useEffect(() => {
    const refreshProjects = () => setRefresh((value) => value + 1)
    emiter.on('sessionData', refreshProjects)
    return () => {
      emiter.off('sessionData', refreshProjects)
    }
  }, [])
  useEffect(() => {
    if (!workspace || locked || setting.CodingWorktreeID) return
    if (JSON.stringify(workspaceRoots(workspace)) === JSON.stringify(setting.CodingSourceRoots || [])) return
    setSetting((old) => ({ ...old, ...selectCodingWorkspace(workspace) }))
  }, [workspace, locked, setting.CodingWorktreeID, setSetting])
  useEffect(() => {
    onWorkspaceChange?.(workspace)
  }, [workspace, onWorkspaceChange])
  const selectWorkspace = (item: CodingWorkspace) => {
    if (locked || !enabled) return
    setSetting((old) => ({ ...old, ...selectCodingWorkspace(item) }))
    setPickerOpen(false)
  }

  useEffect(() => {
    if (!coding) return
    let disposed = false
    setError('')
    setLoading(true)
    queryCodingWorkspaces()
      .then(({ Data }) => {
        if (!disposed) setWorkspaces(Data || [])
      })
      .catch((err) => {
        if (!disposed) setError(String(err))
      })
      .finally(() => {
        if (!disposed) setLoading(false)
      })
    return () => {
      disposed = true
    }
  }, [coding, refresh, setting.CodingWorkspaceID])

  // First-start requests have no resolved checkout path. Read the durable server
  // binding after connection, and guard late responses when switching sessions.
  useEffect(() => {
    const sessionID = isChatSession(activeChat) ? activeChat.SessionID : undefined
    const workspaceID = setting.CodingWorkspaceID
    if (!coding || !sessionID || !workspaceID) return
    let disposed = false
    listCodingSessions(workspaceID)
      .then(({ Data }) => {
        if (disposed) return
        const session = Data?.find((item) => item.SessionID === sessionID)
        if (!session) return
        const binding = codingSessionBinding(session)
        setSetting((old) => ({ ...old, ...binding }))
        setActiveChat((old) =>
          old?.SessionID === sessionID ? { ...old, StartParams: { ...old.StartParams, ...binding } } : old,
        )
      })
      .catch((err) => {
        if (!disposed) setError(String(err))
      })
    return () => {
      disposed = true
    }
  }, [
    coding,
    activeChat?.SessionID,
    activeChat?.isDraftSession,
    setting.CodingWorkspaceID,
    refresh,
    setSetting,
    setActiveChat,
  ])

  if (!coding) return null
  return (
    <div
      data-coding-session-controls
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <div className={styles.composerBar}>
        <YakitPopover
          trigger="click"
          placement="topLeft"
          arrow={false}
          open={pickerOpen}
          onOpenChange={(value) => {
            setPickerOpen(value)
            setSearch('')
          }}
          classNames={{ root: styles.projectPopover }}
          content={
            <div className={styles.projectPicker}>
              <YakitInput
                autoFocus
                variant="borderless"
                prefix={<SearchOutlined />}
                placeholder={t('CodingAgent.searchProjects')}
                aria-label={t('CodingAgent.searchProjects')}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <div className={styles.projectOptions} role="menu" aria-label={t('CodingAgent.selectWorkspace')}>
                {loading && (
                  <div className={styles.pickerEmpty}>
                    <Spin size="small" />
                  </div>
                )}
                {workspaces
                  .filter((item) => !preferences.hidden.includes(item.ID))
                  .filter((item) => item.Name.toLowerCase().includes(search.trim().toLowerCase()))
                  .map((item) => (
                    <button
                      type="button"
                      key={item.ID}
                      className={styles.pickerRow}
                      role="menuitemradio"
                      aria-checked={item.ID === setting.CodingWorkspaceID}
                      disabled={locked || !enabled}
                      title={workspaceRoots(item).join('\n')}
                      onClick={() => selectWorkspace(item)}
                    >
                      <FolderOutlined />
                      <span>{item.Name}</span>
                      {item.ID === setting.CodingWorkspaceID && <CheckOutlined />}
                    </button>
                  ))}
                {!loading &&
                  !workspaces.some(
                    (item) =>
                      !preferences.hidden.includes(item.ID) &&
                      item.Name.toLowerCase().includes(search.trim().toLowerCase()),
                  ) && (
                    <div className={styles.pickerEmpty}>
                      {t(search ? 'CodingAgent.noProjects' : 'CodingAgent.emptyProjects')}
                    </div>
                  )}
              </div>
              <div className={styles.pickerActions}>
                <button
                  type="button"
                  className={styles.pickerRow}
                  disabled={locked || !enabled}
                  onClick={() => {
                    setPickerOpen(false)
                    setCreating(true)
                  }}
                >
                  <PlusOutlined />
                  <span>{t('CodingAgent.createWorkspace')}</span>
                </button>
                <button
                  type="button"
                  className={styles.pickerRow}
                  onClick={() => {
                    setPickerOpen(false)
                    openCodingWorktrees()
                  }}
                >
                  <GitMergeOutlined />
                  <span>{t('CodingAgent.managedWorktrees')}</span>
                </button>
                {setting.CodingWorkspaceID && !locked && enabled && (
                  <button
                    type="button"
                    className={styles.pickerRow}
                    onClick={() => {
                      setSetting((old) => ({ ...old, ...emptyCodingBinding, AgentMode: 'coding' }))
                      setPickerOpen(false)
                    }}
                  >
                    <XOutlined />
                    <span>{t('CodingAgent.clearProject')}</span>
                  </button>
                )}
              </div>
            </div>
          }
        >
          <button
            type="button"
            className={styles.projectTrigger}
            title={t('CodingAgent.changeProject')}
            aria-expanded={pickerOpen}
          >
            <FolderOutlined />
            <span className={styles.path}>{workspace?.Name || t('CodingAgent.selectWorkspace')}</span>
            <ChevronDownOutlined />
          </button>
        </YakitPopover>
        <span className={styles.engineLocation} title={roots.join('\n')}>
          <DesktopComputerOutlined />
          {t('CodingAgent.thisComputer')}
        </span>
        <CodingEnvironmentPopover key={setting.CodingWorkspaceID} workspace={workspace} roots={roots} locked={locked} />
      </div>
      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          action={
            <YakitButton type="text2" onClick={() => setRefresh((v) => v + 1)}>
              {t('CodingAgent.retry')}
            </YakitButton>
          }
        />
      )}
      {creating && !locked && enabled && (
        <CodingWorkspaceCreate
          onClose={() => setCreating(false)}
          onCreated={(item) => {
            setWorkspaces((old) => [item, ...old])
            selectWorkspace(item)
            setCreating(false)
            emiter.emit('sessionData', JSON.stringify({ type: 'refresh' }))
          }}
        />
      )}
    </div>
  )
}
