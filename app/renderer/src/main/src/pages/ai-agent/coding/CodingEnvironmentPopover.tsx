import React, { useEffect, useState } from 'react'
import { Alert, Spin } from 'antd'
import {
  CheckOutlined,
  ChevronLeftOutlined,
  ChevronRightOutlined,
  CogOutlined,
  SearchOutlined,
  GitMergeOutlined,
  GitPullRequestCreateArrowOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import useAIAgentStore from '../useContext/useStore'
import useAIAgentDispatcher from '../useContext/useDispatcher'
import { useExperimentalCoding } from './experimentalCodingStore'
import { listCodingBranches, type CodingBranches, type CodingWorkspace, type CodingBranch } from './api'
import styles from './CodingAgentControls.module.scss'

const branchName = (ref: string) => ref.replace(/^refs\/(heads|remotes)\//, '')

export const CodingEnvironmentPopover = ({
  workspace,
  roots,
  locked,
}: {
  workspace?: CodingWorkspace
  roots: string[]
  locked: boolean
}) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const { setting, pendingChat } = useAIAgentStore()
  const { setSetting } = useAIAgentDispatcher()
  const enabled = useExperimentalCoding()
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState<'environment' | 'branches'>('environment')
  const [search, setSearch] = useState('')
  const [branches, setBranches] = useState<CodingBranches>()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    if (!open || locked || !workspace?.IsGit) return
    let disposed = false
    setLoading(true)
    setError('')
    setBranches(undefined)
    listCodingBranches(workspace.ID)
      .then((result) => {
        if (!disposed) setBranches(result)
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
  }, [open, locked, workspace?.ID, workspace?.IsGit, refresh])

  const selectedRef = setting.CodingWorktreeBaseRef || branches?.DefaultRef || 'HEAD'
  const selectedName =
    selectedRef === 'HEAD'
      ? branches?.CurrentBranch || branches?.CurrentCommit?.slice(0, 8) || 'HEAD'
      : branchName(selectedRef)
  const changePage = (next: 'environment' | 'branches') => {
    setPage(next)
    setSearch('')
  }
  const selectBranch = (Ref: string) => {
    if (locked || !enabled) return
    setSetting((old) => ({ ...old, CodingWorktreeBaseRef: Ref }))
    changePage('environment')
  }
  const renderBranch = (branch: CodingBranch, subtitle?: string) => (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selectedRef === branch.Ref}
      key={branch.Ref}
      className={styles.branchOption}
      onClick={() => selectBranch(branch.Ref)}
      title={branch.Name}
    >
      <GitMergeOutlined />
      <span className={styles.branchText}>
        <span>{branch.Name}</span>
        {subtitle && <small>{subtitle}</small>}
      </span>
      {selectedRef === branch.Ref && <CheckOutlined className={styles.branchCheck} />}
    </button>
  )
  const filter = (branch: CodingBranch) => branch.Name.toLowerCase().includes(search.trim().toLowerCase())
  const current: CodingBranch = {
    Ref: 'HEAD',
    Name: branches?.CurrentBranch || branches?.CurrentCommit?.slice(0, 8) || 'HEAD',
    Commit: branches?.CurrentCommit || '',
    Remote: false,
  }
  const defaultBranch = branches?.Data?.find((branch) => branch.Ref === branches.DefaultRef)
  const remaining = (branches?.Data || []).filter((branch) => branch.Ref !== defaultBranch?.Ref)
  const groups = [
    {
      label: 'currentCheckout',
      items: [...(branches?.CurrentCommit ? [current] : []), ...(defaultBranch ? [defaultBranch] : [])],
    },
    { label: 'localBranches', items: remaining.filter((branch) => !branch.Remote) },
    { label: 'remoteBranches', items: remaining.filter((branch) => branch.Remote) },
  ].map((group) => ({ ...group, items: group.items.filter(filter) }))

  return (
    <YakitPopover
      trigger="click"
      placement="topRight"
      arrow={false}
      open={open}
      onOpenChange={(value) => {
        setOpen(value)
        changePage('environment')
      }}
      classNames={{ root: styles.environmentPopover }}
      content={
        <div className={styles.environment}>
          {page === 'branches' && !locked ? (
            <>
              <button
                type="button"
                className={styles.backButton}
                onClick={() => changePage('environment')}
                aria-label={t('CodingAgent.backToEnvironment')}
              >
                <ChevronLeftOutlined />
                {t('CodingAgent.branch')}
              </button>
              <YakitInput
                autoFocus
                variant="borderless"
                aria-label={t('CodingAgent.searchBranches')}
                placeholder={t('CodingAgent.searchBranches')}
                prefix={<SearchOutlined />}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                allowClear
              />
              <div className={styles.branchList} role="menu" aria-label={t('CodingAgent.branch')}>
                {groups.map(
                  (group) =>
                    group.items.length > 0 && (
                      <div key={group.label}>
                        <div className={styles.branchGroup}>{t(`CodingAgent.${group.label}`)}</div>
                        {group.items.map((branch) =>
                          renderBranch(branch, branch.Ref === 'HEAD' ? t('CodingAgent.committedOnly') : undefined),
                        )}
                      </div>
                    ),
                )}
                {!groups.some((group) => group.items.length > 0) && (
                  <p className={styles.emptyBranches}>{t('CodingAgent.noBranches')}</p>
                )}
              </div>
              {branches?.HasLocalChanges && (
                <p className={styles.branchNotice}>{t('CodingAgent.localChangesNotCopied')}</p>
              )}
            </>
          ) : (
            <>
              <div className={styles.environmentTitle}>
                {locked ? t('CodingAgent.sessionEnvironment') : t('CodingAgent.configureEnvironment')}
              </div>
              {locked ? (
                <>
                  <p className={styles.hint}>{t('CodingAgent.sessionLocked')}</p>
                  <code>{setting.CodingWorkingDirectory || t('CodingAgent.resolving')}</code>
                </>
              ) : (
                <>
                  <div className={styles.environmentRow}>
                    <GitPullRequestCreateArrowOutlined />
                    <span>{t('CodingAgent.newWorktree')}</span>
                    <YakitSwitch
                      aria-label={t('CodingAgent.newWorktree')}
                      checked={!!setting.CodingCreateWorktree}
                      disabled={!enabled || !workspace?.IsGit || loading || !branches?.CurrentCommit}
                      onChange={(value) =>
                        setSetting((old) => ({
                          ...old,
                          CodingCreateWorktree: value,
                          CodingWorktreeID: '',
                          CodingWorktreeBaseRef: value ? branches?.DefaultRef || 'HEAD' : '',
                          CodingWorkingDirectory: '',
                          CodingWorkspaceRoots: [],
                          CodingSourceRoots: roots,
                        }))
                      }
                    />
                  </div>
                  {setting.CodingCreateWorktree && (
                    <button
                      type="button"
                      className={styles.environmentRow}
                      onClick={() => changePage('branches')}
                      disabled={loading || !branches || !enabled}
                    >
                      <GitMergeOutlined />
                      <span>{t('CodingAgent.branch')}</span>
                      <span className={styles.branchValue} title={selectedName}>
                        {selectedName}
                      </span>
                      <ChevronRightOutlined />
                    </button>
                  )}
                  {loading && (
                    <div className={styles.branchLoading}>
                      <Spin size="small" />
                      {t('CodingAgent.loadingBranches')}
                    </div>
                  )}
                  {error && (
                    <Alert
                      type="error"
                      message={error}
                      action={
                        <YakitButton type="text2" onClick={() => setRefresh((value) => value + 1)}>
                          {t('CodingAgent.retry')}
                        </YakitButton>
                      }
                    />
                  )}
                  {workspace && !workspace.IsGit && <p className={styles.hint}>{t('CodingAgent.noGit')}</p>}
                  {branches && !branches.CurrentCommit && <p className={styles.hint}>{t('CodingAgent.noCommit')}</p>}
                  {!workspace && <p className={styles.hint}>{t('CodingAgent.selectWorkspace')}</p>}
                  {setting.CodingWorktreeID && (
                    <>
                      <code>{setting.CodingWorkingDirectory}</code>
                      <YakitButton
                        type="text2"
                        onClick={() =>
                          setSetting((old) => ({
                            ...old,
                            CodingWorktreeID: '',
                            CodingWorkingDirectory: '',
                            CodingWorkspaceRoots: [],
                          }))
                        }
                      >
                        {t('CodingAgent.useSources')}
                      </YakitButton>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      }
    >
      <YakitButton
        className={styles.environmentTrigger}
        type="text2"
        icon={<CogOutlined />}
        aria-label={t('CodingAgent.configureEnvironment')}
        title={t('CodingAgent.configureEnvironment')}
        disabled={!!pendingChat}
      />
    </YakitPopover>
  )
}
