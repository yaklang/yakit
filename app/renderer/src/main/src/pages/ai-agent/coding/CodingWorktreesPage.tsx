import React, { useMemo, useState } from 'react'
import { Alert, Spin, Tooltip } from 'antd'
import {
  FolderOutlined,
  GitMergeOutlined,
  MessageCirclePlusOutlined,
  RefreshOutlined,
  SearchOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { yakitNotify } from '@/utils/notification'
import { openAIAgentChatTab } from '../historyChat/HistoryChat'
import { useCodingCatalog } from './useCodingCatalog'
import { useExperimentalCoding } from './experimentalCodingStore'
import { openCodingDirectory } from './api'
import { openCodingProject } from './navigation'
import styles from './CodingWorktreesPage.module.scss'

const shortRef = (ref: string) => ref.replace(/^refs\/(heads|remotes)\//, '')

const CodingWorktreesPage = () => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const { projects, details, loading, error, sessionError, refresh } = useCodingCatalog(true)
  const enabled = useExperimentalCoding()
  const [search, setSearch] = useState('')
  const [projectId, setProjectId] = useState<string>()
  const count = projects.reduce((total, p) => total + p.trees.length, 0)
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return projects
      .filter((p) => !projectId || p.workspace.ID === projectId)
      .map((project) => ({
        ...project,
        trees: project.trees.filter((tree) => {
          const titles = project.sessions
            .filter((s) => s.WorktreeID === tree.ID)
            .map((s) => details.get(s.SessionID)?.Title || s.SessionTitle || s.SessionID)
          return [project.workspace.Name, tree.Branch, tree.BaseRef, tree.Path, ...titles]
            .join(' ')
            .toLowerCase()
            .includes(query)
        }),
      }))
      .filter((project) => project.trees.length)
  }, [projects, projectId, search, details])
  const openDirectory = async (path: string) => {
    try {
      await openCodingDirectory(path)
    } catch (err) {
      yakitNotify('error', String(err))
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>{t('CodingAgent.managedWorktrees')}</h1>
          <p>{t('CodingAgent.worktreesDescription')}</p>
        </div>
        <YakitButton type="outline2" icon={<RefreshOutlined />} loading={loading} onClick={refresh}>
          {t('CodingAgent.refresh')}
        </YakitButton>
      </header>
      <div className={styles.toolbar}>
        <YakitInput
          prefix={<SearchOutlined />}
          aria-label={t('CodingAgent.searchWorktrees')}
          placeholder={t('CodingAgent.searchWorktrees')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          allowClear
        />
        <YakitSelect
          aria-label={t('CodingAgent.filterProject')}
          value={projectId}
          placeholder={t('CodingAgent.allProjects')}
          allowClear
          onChange={setProjectId}
          options={projects.map(({ workspace }) => ({ value: workspace.ID, label: workspace.Name }))}
        />
        <span className={styles.total}>{t('CodingAgent.worktreeTotal', { count })}</span>
      </div>
      {error && <Alert type="error" showIcon message={error} />}
      {sessionError && (
        <Alert type="warning" showIcon message={t('CodingAgent.sessionLoadFailed')} description={sessionError} />
      )}
      <div className={styles.scroll}>
        <Spin spinning={loading}>
          {!loading && !error && !filtered.length && (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>
                <GitMergeOutlined />
              </div>
              <h2>{t(count ? 'CodingAgent.noMatchingWorktrees' : 'CodingAgent.emptyWorktrees')}</h2>
              <p>{t(count ? 'CodingAgent.tryAnotherSearch' : 'CodingAgent.createWorktreeHint')}</p>
            </div>
          )}
          {filtered.map(({ workspace, trees, sessions }) => (
            <section className={styles.project} key={workspace.ID} aria-label={workspace.Name}>
              <div className={styles.projectHeading}>
                <FolderOutlined />
                <h2>{workspace.Name}</h2>
                <span className={styles.count}>{trees.length}</span>
                <span className={styles.sourcePath} title={workspace.RootPath}>
                  {workspace.RootPath}
                </span>
              </div>
              <div className={styles.columnHead}>
                <span>{t('CodingAgent.branchAndLocation')}</span>
                <span>{t('CodingAgent.sessions')}</span>
                <span>{t('CodingAgent.actions')}</span>
              </div>
              {trees.map((tree) => {
                const related = sessions.filter((session) => session.WorktreeID === tree.ID)
                const available = tree.State === 'ready' && !tree.Prunable && !tree.Bare
                return (
                  <article className={styles.treeRow} key={tree.ID}>
                    <div className={styles.treeInfo}>
                      <div className={styles.branch}>
                        <GitMergeOutlined />
                        <strong title={tree.Branch || tree.Head}>
                          {tree.Branch ? shortRef(tree.Branch) : t('CodingAgent.detachedHead')}
                        </strong>
                        {!tree.Branch && <code>{(tree.Head || tree.BaseCommit).slice(0, 8)}</code>}
                        {!available && <span className={styles.state}>{t(`CodingAgent.state_${tree.State}`)}</span>}
                      </div>
                      <span className={styles.base}>
                        {t('CodingAgent.basedOn', { ref: shortRef(tree.BaseRef || 'HEAD') })}
                      </span>
                      <span className={styles.path} title={tree.Path}>
                        {tree.Path}
                      </span>
                      {tree.LastError && <span className={styles.error}>{tree.LastError}</span>}
                    </div>
                    <div className={styles.sessions}>
                      {related.map((binding) => {
                        const session = details.get(binding.SessionID)
                        const deleted = Number(binding.SessionDeletedAt) > 0
                        const title = session?.Title || binding.SessionTitle || binding.SessionID
                        return (
                          <div key={binding.SessionID} className={styles.sessionRow}>
                            <button
                              disabled={loading || !!error || deleted || !session || !!sessionError}
                              onClick={() => session && openAIAgentChatTab(session)}
                              title={title}
                            >
                              {title}
                            </button>
                            {deleted ? (
                              <span className={styles.deleted}>{t('CodingAgent.sessionDeleted')}</span>
                            ) : (
                              !loading &&
                              !session && (
                                <span className={styles.unavailable}>
                                  {t(sessionError ? 'CodingAgent.sessionLoadFailed' : 'CodingAgent.sessionUnavailable')}
                                </span>
                              )
                            )}
                          </div>
                        )
                      })}
                      {!related.length && (
                        <span className={styles.unavailable}>{t('CodingAgent.noRelatedSessions')}</span>
                      )}
                    </div>
                    <div className={styles.actions}>
                      <Tooltip title={t('CodingAgent.openDirectory')}>
                        <YakitButton
                          type="text2"
                          aria-label={t('CodingAgent.openDirectory')}
                          disabled={!available}
                          icon={<FolderOutlined />}
                          onClick={() => openDirectory(tree.Path)}
                        />
                      </Tooltip>
                      <Tooltip title={t('CodingAgent.newSessionInWorktree')}>
                        <YakitButton
                          type="text2"
                          aria-label={t('CodingAgent.newSessionInWorktree')}
                          disabled={!available || !enabled}
                          icon={<MessageCirclePlusOutlined />}
                          onClick={() => openCodingProject(workspace, tree)}
                        />
                      </Tooltip>
                    </div>
                  </article>
                )
              })}
            </section>
          ))}
        </Spin>
      </div>
    </div>
  )
}
export default CodingWorktreesPage
