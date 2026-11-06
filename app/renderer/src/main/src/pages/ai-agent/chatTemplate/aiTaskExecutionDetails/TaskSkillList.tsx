import { useSessionModal } from '../../sessionTabs/useSessionModal'
import React, { useEffect, useMemo, useState } from 'react'
import { Modal, Radio, Select } from 'antd'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { grpcGetAIForge } from '../../grpc'
import type { FileNodeProps } from '@/pages/yakRunner/FileTree/FileTreeType'
import type { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'
import styles from './TaskSkillList.module.scss'

const FilePreview = React.lazy(() => import('../../components/aiFileSystemList/FilePreview/FilePreview'))

type Skill = { name: string; description?: string; skill_load_state?: string; token_count?: number }
export const selectTaskSkills = (skills: Skill[], state: string, query: string, order: string) => {
  const keyword = query.trim().toLowerCase()
  return skills
    .filter(
      (s) =>
        (state === 'all' || s.skill_load_state === state) &&
        `${s.name} ${s.description || ''}`.toLowerCase().includes(keyword),
    )
    .sort((a, b) => ((a.token_count ?? 0) - (b.token_count ?? 0)) * (order === 'asc' ? 1 : -1))
}

function SkillDocument({ name }: { name: string }) {
  const { t } = useI18nNamespaces(['aiAgent'])
  const [path, setPath] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    setPath('')
    setError('')
    grpcGetAIForge({ ForgeName: name, InflateSkillPath: true }, true)
      .then((forge) => {
        if (!active) return
        if (!forge.SkillPath) {
          setError(t('SessionSkills.empty'))
          return
        }
        const separator = forge.SkillPath.includes('\\') && !forge.SkillPath.includes('/') ? '\\' : '/'
        setPath(`${forge.SkillPath.replace(/[\\/]+$/, '')}${separator}SKILL.md`)
      })
      .catch((reason) => {
        if (active) setError(String(reason))
      })
    return () => {
      active = false
    }
  }, [name])
  if (error) return <div role="alert">{error}</div>
  if (!path) return <div role="status">{t('SessionSkills.loading')}</div>
  // Use the existing permission-aware preview and size checks for SKILL.md too.
  return (
    <div style={{ height: '60vh' }}>
      <React.Suspense fallback={<p>{t('SessionSkills.loading')}</p>}>
        <FilePreview data={{ path, name: 'SKILL.md', isFolder: false } as FileNodeProps} />
      </React.Suspense>
    </div>
  )
}

export function TaskSkillList({
  skills,
  taskId,
}: {
  skills?: {
    fixed: AIAgentGrpcApi.PlanItemDetailsFixedItem[]
    dynamic: AIAgentGrpcApi.PlanItemDetailsDynamicSkillsItem[]
  }
  taskId: string
}) {
  const { t } = useI18nNamespaces(['aiAgent'])
  const { active } = useSessionModal()
  const [state, setState] = useState('all')
  const [query, setQuery] = useState('')
  const [order, setOrder] = useState('desc')
  const [selected, setSelected] = useState('')
  useEffect(() => {
    if (!active) setSelected('')
  }, [active])
  useEffect(() => {
    setSelected('')
    setQuery('')
    setState('all')
  }, [taskId])
  const list = useMemo(
    () => selectTaskSkills([...(skills?.fixed || []), ...(skills?.dynamic || [])], state, query, order),
    [skills, state, query, order],
  )
  return (
    <section className={styles.section} aria-label={t('AITabs.skills')}>
      <strong>{t('AITabs.skills')}</strong>
      <div className={styles.controls}>
        <Radio.Group value={state} onChange={(e) => setState(e.target.value)}>
          <Radio.Button value="all">{t('Parity.all')}</Radio.Button>
          <Radio.Button value="loaded">{t('SessionSkills.loaded')}</Radio.Button>
          <Radio.Button value="metadata">{t('SessionSkills.available')}</Radio.Button>
        </Radio.Group>
        <input
          className={styles.search}
          aria-label={t('SessionSkills.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Select
          aria-label={t('Parity.tokenSort')}
          value={order}
          onChange={setOrder}
          options={[
            { value: 'asc', label: t('Parity.tokensAsc') },
            { value: 'desc', label: t('Parity.tokensDesc') },
          ]}
        />
      </div>
      {list.map((s, i) => (
        <div key={`${s.name}-${i}`} className={styles.row}>
          <button className={styles.document} onClick={() => setSelected(s.name)}>
            {s.name}
          </button>{' '}
          · {s.token_count ?? '—'} Tokens
          <p>{s.description}</p>
        </div>
      ))}
      {!list.length && <p>{t('SessionSkills.empty')}</p>}
      <Modal
        visible={!!selected && active}
        title={selected}
        width={850}
        footer={null}
        destroyOnClose
        onCancel={() => setSelected('')}
      >
        {selected && <SkillDocument key={selected} name={selected} />}
      </Modal>
    </section>
  )
}
