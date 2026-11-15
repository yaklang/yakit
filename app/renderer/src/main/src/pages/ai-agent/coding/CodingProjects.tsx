import React, { useState } from 'react'
import { Alert, Spin, Tooltip } from 'antd'
import {
  ChevronDownOutlined,
  ChevronRightOutlined,
  FolderOutlined,
  GitMergeOutlined,
  PlusOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import emiter from '@/utils/eventBus/eventBus'
import useAIAgentStore from '../useContext/useStore'
import { openAIAgentChatTab } from '../historyChat/HistoryChat'
import { CodingWorkspaceCreate } from './CodingWorkspaceCreate'
import { useCodingCatalog } from './useCodingCatalog'
import { openCodingProject, openCodingWorktrees } from './navigation'
import { useExperimentalCoding } from './experimentalCodingStore'
import styles from './CodingProjects.module.scss'

export const CodingProjects = ({ search = '' }: { search?: string }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const { activeChat, setting } = useAIAgentStore()
  const enabled = useExperimentalCoding()
  const { projects, details, loading, error, sessionError, refresh } = useCodingCatalog()
  const [collapsed, setCollapsed] = useState<string[]>([])
  const [expanded, setExpanded] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const keyword = search.trim().toLowerCase()
  return (
    <section className={styles.projects} aria-label={t('CodingAgent.projects')}>
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
          {projects.map(({ workspace, sessions }) => {
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
                <div className={styles.projectRow} data-selected={setting.CodingWorkspaceID === workspace.ID}>
                  <button
                    className={styles.projectName}
                    aria-expanded={open}
                    onClick={() =>
                      setCollapsed((old) => (open ? [...old, workspace.ID] : old.filter((id) => id !== workspace.ID)))
                    }
                  >
                    {open ? <ChevronDownOutlined /> : <ChevronRightOutlined />}
                    <FolderOutlined />
                    <span>{workspace.Name}</span>
                  </button>
                  <Tooltip title={t('CodingAgent.newProjectSession')}>
                    <button
                      className={styles.addSession}
                      aria-label={t('CodingAgent.newSessionInProject', { name: workspace.Name })}
                      disabled={!enabled || loading || !!error}
                      onClick={() => openCodingProject(workspace)}
                    >
                      <PlusOutlined />
                    </button>
                  </Tooltip>
                </div>
                {open && (
                  <div className={styles.sessions}>
                    {(showAll ? visible : visible.slice(0, 3)).map((session) => (
                      <button
                        key={session.SessionID}
                        className={styles.session}
                        aria-current={activeChat?.SessionID === session.SessionID ? 'page' : undefined}
                        title={session.Title}
                        onClick={() => openAIAgentChatTab(session)}
                      >
                        {session.Title || session.SessionID}
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
          {!loading && !error && !projects.length && (
            <button
              className={styles.emptySession}
              disabled={!enabled || loading || !!error}
              onClick={() => setCreating(true)}
            >
              {t('CodingAgent.createFirstProject')}
            </button>
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
    </section>
  )
}
