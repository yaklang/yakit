import React, { useEffect, useRef, useState } from 'react'
import { Alert, Empty, Spin, Tabs, Tooltip } from 'antd'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { FolderOutlined, PlusOutlined, RefreshOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { getMainOperatorPageBodyContainerOrBody } from '@/utils/getMainOperatorPageBodyContainer'
import useAIAgentStore from '../useContext/useStore'
import useAIAgentDispatcher from '../useContext/useDispatcher'
import { openAIAgentChatTab } from '../historyChat/HistoryChat'
import type { AISession } from '../type/aiChat'
import { listCodingSessions, listCodingWorktrees, queryCodingSessionDetails, queryCodingWorkspaces } from './api'
import type { CodingSession, CodingWorkspace, CodingWorktree } from './api'
import { selectCodingWorkspace, workspaceRoots } from './binding'
import { CodingWorkspaceCreate } from './CodingWorkspaceCreate'
import styles from './CodingAgentControls.module.scss'

export const CodingWorkspaceManager = ({
  locked,
  onClose,
  initialTab = 'sources',
}: {
  locked: boolean
  onClose: () => void
  initialTab?: 'sources' | 'worktrees'
}) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const { setting } = useAIAgentStore()
  const { setSetting } = useAIAgentDispatcher()
  const [workspaces, setWorkspaces] = useState<CodingWorkspace[]>([])
  const [selected, setSelected] = useState(setting.CodingWorkspaceID || '')
  const [trees, setTrees] = useState<CodingWorktree[]>([])
  const [sessions, setSessions] = useState<CodingSession[]>([])
  const [details, setDetails] = useState<AISession[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true)
  const [error, setError] = useState('')
  const [sessionError, setSessionError] = useState('')
  const [adding, setAdding] = useState(false)
  const [tab, setTab] = useState(initialTab)
  const request = useRef(0)
  const workspace = workspaces.find((item) => item.ID === selected)
  const roots = workspace ? workspaceRoots(workspace) : []

  useEffect(() => {
    let disposed = false
    queryCodingWorkspaces()
      .then(({ Data }) => {
        if (disposed) return
        const data = Data || []
        setWorkspaces(data)
        setSelected((current) => (data.some((item) => item.ID === current) ? current : data[0]?.ID || ''))
      })
      .catch((err) => {
        if (!disposed) setError(String(err))
      })
      .finally(() => {
        if (!disposed) setLoadingWorkspaces(false)
      })
    return () => {
      disposed = true
      request.current++
    }
  }, [])

  const refresh = async (id: string) => {
    const version = ++request.current
    setError('')
    setSessionError('')
    setTrees([])
    setSessions([])
    setDetails([])
    setLoading(!!id)
    if (!id) return
    try {
      const [treeResult, sessionResult] = await Promise.all([listCodingWorktrees(id), listCodingSessions(id)])
      if (version !== request.current) return
      setTrees(treeResult.Data || [])
      setSessions(sessionResult.Data || [])
      const ids = (sessionResult.Data || []).map((item) => item.SessionID)
      if (ids.length) {
        try {
          const result = await queryCodingSessionDetails(ids)
          if (version === request.current) setDetails(result.Data || [])
        } catch (err) {
          if (version === request.current) setSessionError(String(err))
        }
      }
    } catch (err) {
      if (version === request.current) setError(String(err))
    } finally {
      if (version === request.current) setLoading(false)
    }
  }
  useEffect(() => {
    void refresh(selected)
  }, [selected])

  const select = (tree?: CodingWorktree) => {
    if (locked || !workspace || loading) return
    setSetting((old) => ({ ...old, ...selectCodingWorkspace(workspace, tree) }))
    onClose()
  }
  const sessionLinks = (items: CodingSession[]) =>
    items.map((item) => {
      const session = details.find((detail) => detail.SessionID === item.SessionID)
      return (
        <Tooltip key={item.SessionID} title={session ? item.SessionID : t('CodingAgent.sessionUnavailable')}>
          <span>
            <YakitButton
              type="text2"
              size="small"
              disabled={!session}
              onClick={() => {
                if (session) {
                  openAIAgentChatTab(session)
                  onClose()
                }
              }}
            >
              <span className={styles.sessionTitle}>{session?.Title || item.SessionID}</span>
            </YakitButton>
          </span>
        </Tooltip>
      )
    })

  return (
    <YakitModal
      open
      title={t('CodingAgent.workspaces')}
      width={980}
      footer={null}
      onCancel={onClose}
      getContainer={getMainOperatorPageBodyContainerOrBody()}
    >
      <div className={styles.manager}>
        <p className={styles.hint}>{t('CodingAgent.enginePaths')}</p>
        {locked && <Alert type="info" showIcon message={t('CodingAgent.sessionLocked')} />}
        {error && <Alert type="error" showIcon message={error} />}
        <div className={styles.columns}>
          <aside className={styles.projects}>
            <YakitButton icon={<PlusOutlined />} disabled={locked || loadingWorkspaces} onClick={() => setAdding(true)}>
              {t('CodingAgent.createWorkspace')}
            </YakitButton>
            <Spin spinning={loadingWorkspaces}>
              {workspaces.map((item) => (
                <button
                  key={item.ID}
                  className={styles.project}
                  aria-pressed={item.ID === selected}
                  onClick={() => setSelected(item.ID)}
                >
                  <strong>
                    <FolderOutlined /> {item.Name}
                  </strong>
                  <span>{t('CodingAgent.directoryCount', { count: workspaceRoots(item).length })}</span>
                  <span title={item.RootPath}>{item.RootPath}</span>
                </button>
              ))}
            </Spin>
          </aside>
          <section className={styles.worktrees}>
            <div className={styles.heading}>
              <div>
                <strong>{workspace?.Name || t('CodingAgent.selectWorkspace')}</strong>
                {workspace && (
                  <p className={styles.hint}>
                    {t('CodingAgent.workspaceSummary', { directories: roots.length, sessions: sessions.length })}
                  </p>
                )}
              </div>
              <YakitButton
                type="text2"
                icon={<RefreshOutlined />}
                aria-label={t('CodingAgent.refresh')}
                disabled={!selected || loading}
                onClick={() => void refresh(selected)}
              />
              <YakitButton type="primary" disabled={!workspace || locked || loading} onClick={() => select()}>
                {t('CodingAgent.useWorkspace')}
              </YakitButton>
            </div>
            {!workspace ? (
              <Empty description={t('CodingAgent.empty')} />
            ) : (
              <Tabs
                activeKey={tab}
                onChange={(value) => setTab(value as 'sources' | 'worktrees')}
                items={[
                  {
                    key: 'sources',
                    label: t('CodingAgent.sourceDirectories'),
                    children: (
                      <>
                        <p className={styles.hint}>{t('CodingAgent.primaryRule')}</p>
                        <div className={styles.sourceList}>
                          {roots.map((root, index) => (
                            <div className={styles.sourceRow} key={root}>
                              <FolderOutlined />
                              <code>{root}</code>
                              <span className={index === 0 ? styles.badge : styles.muted}>
                                {t(index === 0 ? 'CodingAgent.primary' : 'CodingAgent.secondary')}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className={styles.sourceSessions}>
                          <strong>{t('CodingAgent.sourceSessions')}</strong>
                          {sessions.filter((item) => !item.WorktreeID).length > 0 ? (
                            sessionLinks(sessions.filter((item) => !item.WorktreeID))
                          ) : (
                            <p className={styles.hint}>{t('CodingAgent.noSourceSessions')}</p>
                          )}
                        </div>
                      </>
                    ),
                  },
                  {
                    key: 'worktrees',
                    label: `${t('CodingAgent.managedWorktrees')} (${trees.length})`,
                    children: (
                      <>
                        <p className={styles.hint}>{t('CodingAgent.managedTip')}</p>
                        <Spin spinning={loading}>
                          {!loading && !trees.length && <Empty description={t('CodingAgent.emptyWorktrees')} />}
                          {trees.map((tree) => {
                            const related = sessions.filter((item) => item.WorktreeID === tree.ID)
                            const owner = details.find((item) => item.SessionID === tree.OwnerSessionID)
                            return (
                              <div key={tree.ID} className={styles.tree}>
                                <div className={styles.treeDetails}>
                                  <div className={styles.treeTitle}>
                                    <strong>
                                      {owner?.Title || t('CodingAgent.worktreeLabel', { id: tree.ID.slice(0, 8) })}
                                    </strong>
                                    <span className={tree.State === 'ready' ? styles.ready : styles.muted}>
                                      {t(`CodingAgent.state_${tree.State}`)}
                                    </span>
                                  </div>
                                  <code>{tree.WorkingDirectory || tree.Path}</code>
                                  <span>
                                    {t('CodingAgent.fromDirectory')}: {tree.SourceDirectory}
                                  </span>
                                  <span>
                                    {t('CodingAgent.baseBranch')}: {tree.BaseRef || 'HEAD'} ·{' '}
                                    {tree.Branch || t('CodingAgent.detached')} ·{' '}
                                    {tree.Head?.slice(0, 8) || tree.BaseCommit?.slice(0, 8)}
                                  </span>
                                  {tree.LastError && <p className={styles.treeError}>{tree.LastError}</p>}
                                  <div className={styles.sessionLinks}>
                                    <span>{t('CodingAgent.relatedSessions', { count: related.length })}</span>
                                    {sessionLinks(related)}
                                  </div>
                                </div>
                                <YakitButton
                                  type="outline2"
                                  disabled={locked || tree.State !== 'ready' || tree.Prunable || tree.Bare || loading}
                                  onClick={() => select(tree)}
                                >
                                  {t('CodingAgent.reuseWorktree')}
                                </YakitButton>
                              </div>
                            )
                          })}
                        </Spin>
                      </>
                    ),
                  },
                ]}
              />
            )}
            {sessionError && (
              <Alert type="warning" showIcon message={t('CodingAgent.sessionLoadFailed')} description={sessionError} />
            )}
          </section>
        </div>
        {adding && !locked && (
          <CodingWorkspaceCreate
            onClose={() => setAdding(false)}
            onCreated={(item) => {
              setWorkspaces((old) => [item, ...old])
              setSelected(item.ID)
              setTab('sources')
              setAdding(false)
            }}
          />
        )}
      </div>
    </YakitModal>
  )
}
