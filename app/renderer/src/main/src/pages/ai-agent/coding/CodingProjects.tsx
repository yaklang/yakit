import React, { useEffect, useRef, useState } from 'react'
import { Alert, Spin, Tooltip } from 'antd'
import { useInViewport } from 'ahooks'
import { GitMergeOutlined, PlusOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import emiter from '@/utils/eventBus/eventBus'
import useAIAgentStore from '../useContext/useStore'
import { openAIAgentChatTab } from '../historyChat/HistoryChat'
import { CodingWorkspaceCreate } from './CodingWorkspaceCreate'
import { useCodingCatalog } from './useCodingCatalog'
import { openCodingProject, openCodingWorktrees } from './navigation'
import { useExperimentalCoding } from './experimentalCodingStore'
import { CodingProjectRow } from './CodingProjectRow'
import { YakitDropdownMenu } from '@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { getMainOperatorPageBodyContainerOrBody } from '@/utils/getMainOperatorPageBodyContainer'
import {
  isCodingSessionUnread,
  markCodingSessionsRead,
  setCodingProjectHidden,
  useCodingProjectPreferences,
} from './projectPreferences'
import type { CodingWorkspace } from './api'
import styles from './CodingProjects.module.scss'

export const CodingProjects = ({ search = '' }: { search?: string }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const { activeChat, setting } = useAIAgentStore()
  const enabled = useExperimentalCoding()
  const { projects, details, loading, error, sessionError, refresh } = useCodingCatalog()
  const [collapsed, setCollapsed] = useState<string[]>([])
  const [expanded, setExpanded] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<CodingWorkspace>()
  const [removing, setRemoving] = useState<CodingWorkspace>()
  const preferences = useCodingProjectPreferences()
  const rootRef = useRef<HTMLElement>(null)
  const [inViewport] = useInViewport(rootRef)
  useEffect(() => {
    const session = activeChat && details.get(activeChat.SessionID)
    if (inViewport && session) markCodingSessionsRead([session])
  }, [inViewport, activeChat?.SessionID, details])
  const visibleProjects = projects
    .filter(({ workspace }) => !preferences.hidden.includes(workspace.ID))
    .sort(
      (a, b) =>
        Number(preferences.pinned.includes(b.workspace.ID)) - Number(preferences.pinned.includes(a.workspace.ID)),
    )
  const hiddenProjects = projects.filter(({ workspace }) => preferences.hidden.includes(workspace.ID))
  const keyword = search.trim().toLowerCase()
  return (
    <section ref={rootRef} className={styles.projects} aria-label={t('CodingAgent.projects')}>
      <div className={styles.heading}>
        <span>{t('CodingAgent.projects')}</span>
        <Tooltip title={t('CodingAgent.managedWorktrees')}>
          <button aria-label={t('CodingAgent.managedWorktrees')} onClick={openCodingWorktrees}>
            <GitMergeOutlined />
          </button>
        </Tooltip>
        <Tooltip title={t('CodingAgent.createWorkspace')}>
          <button
            aria-label={t('CodingAgent.createWorkspace')}
            disabled={!enabled || loading || !!error}
            onClick={() => setCreating(true)}
          >
            <PlusOutlined />
          </button>
        </Tooltip>
      </div>
      {error && (
        <Alert type="error" message={error} action={<button onClick={refresh}>{t('CodingAgent.retry')}</button>} />
      )}
      {sessionError && <p className={styles.empty}>{t('CodingAgent.sessionLoadFailed')}</p>}
      <div className={styles.list}>
        <Spin spinning={loading}>
          {visibleProjects.map(({ workspace, sessions }) => {
            const live = sessions
              .filter((s) => !(Number(s.SessionDeletedAt) > 0) && details.has(s.SessionID))
              .map((s) => details.get(s.SessionID)!)
              .sort((a, b) => (b.LastUsedAt || b.UpdatedAt) - (a.LastUsedAt || a.UpdatedAt))
            const matchesProject = workspace.Name.toLowerCase().includes(keyword)
            const visible = matchesProject ? live : live.filter((s) => s.Title.toLowerCase().includes(keyword))
            if (!matchesProject && !visible.length) return null
            const open = !!keyword || !collapsed.includes(workspace.ID)
            const showAll = !!keyword || expanded.includes(workspace.ID)
            return (
              <div key={workspace.ID} className={styles.project}>
                <CodingProjectRow
                  workspace={workspace}
                  expanded={open}
                  selected={setting.CodingWorkspaceID === workspace.ID}
                  disabled={!enabled || loading || !!error}
                  pinned={preferences.pinned.includes(workspace.ID)}
                  sessionCount={live.length}
                  unreadCount={live.filter((s) => isCodingSessionUnread(s, preferences.readAt)).length}
                  onToggle={() =>
                    setCollapsed((old) => (open ? [...old, workspace.ID] : old.filter((id) => id !== workspace.ID)))
                  }
                  onEdit={() => setEditing(workspace)}
                  onRemove={() => setRemoving(workspace)}
                  onMarkRead={() => markCodingSessionsRead(live)}
                />
                {open && (
                  <div className={styles.sessions}>
                    {(showAll ? visible : visible.slice(0, 3)).map((session) => (
                      <button
                        key={session.SessionID}
                        className={styles.session}
                        aria-current={activeChat?.SessionID === session.SessionID ? 'page' : undefined}
                        title={session.Title}
                        onClick={() => {
                          markCodingSessionsRead([session])
                          openAIAgentChatTab(session)
                        }}
                      >
                        <span>{session.Title || session.SessionID}</span>
                        {isCodingSessionUnread(session, preferences.readAt) && (
                          <span className={styles.unreadDot} aria-label={t('CodingAgent.unreadSession')} />
                        )}
                      </button>
                    ))}
                    {!loading && !sessionError && !live.length && (
                      <button
                        className={styles.emptySession}
                        disabled={!enabled || loading || !!error}
                        onClick={() => openCodingProject(workspace)}
                      >
                        {t('CodingAgent.startProjectSession')}
                      </button>
                    )}
                    {!showAll && visible.length > 3 && (
                      <button className={styles.more} onClick={() => setExpanded((old) => [...old, workspace.ID])}>
                        {t('CodingAgent.moreSessions', { count: visible.length - 3 })}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {!loading && !error && !visibleProjects.length && (
            <button
              className={styles.emptySession}
              disabled={!enabled || loading || !!error}
              onClick={() => setCreating(true)}
            >
              {t('CodingAgent.createFirstProject')}
            </button>
          )}
          {hiddenProjects.length > 0 && (
            <YakitDropdownMenu
              dropdown={{ trigger: ['click'] }}
              menu={{
                width: 200,
                type: 'grey',
                data: hiddenProjects.map(({ workspace }) => ({ key: workspace.ID, label: workspace.Name })),
                onClick: ({ key }) => setCodingProjectHidden(key, false),
              }}
            >
              <button className={styles.more}>{t('CodingAgent.restoreProject')}</button>
            </YakitDropdownMenu>
          )}
        </Spin>
      </div>
      {creating && (
        <CodingWorkspaceCreate
          onClose={() => setCreating(false)}
          onCreated={(workspace) => {
            setCreating(false)
            emiter.emit('sessionData', JSON.stringify({ type: 'refresh' }))
            openCodingProject(workspace)
          }}
        />
      )}
      {editing && (
        <CodingWorkspaceCreate
          key={editing.ID}
          workspace={editing}
          onClose={() => setEditing(undefined)}
          onCreated={() => {
            setEditing(undefined)
            emiter.emit('sessionData', JSON.stringify({ type: 'refresh' }))
          }}
          onRemove={() => {
            setRemoving(editing)
            setEditing(undefined)
          }}
        />
      )}
      {removing && (
        <YakitModal
          open
          width={420}
          type="white"
          title={t('CodingAgent.removeProject')}
          okText={t('CodingAgent.removeProject')}
          onCancel={() => setRemoving(undefined)}
          onOk={() => {
            setCodingProjectHidden(removing.ID, true)
            setRemoving(undefined)
          }}
          getContainer={getMainOperatorPageBodyContainerOrBody()}
        >
          <p>{t('CodingAgent.removeProjectConfirm', { name: removing.Name })}</p>
        </YakitModal>
      )}
    </section>
  )
}
