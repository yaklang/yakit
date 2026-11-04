import React, { useEffect, useRef, useState } from 'react'
import { useStore } from 'zustand'
import { useMemoizedFn } from 'ahooks'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import useAIAgentDispatcher from '@/pages/ai-agent/useContext/useDispatcher'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useCurrentMeta, useCurrentRawData, useCurrentStore } from '../hooks/useCurrentDataBySession'
import useCurrentSessionId from '../hooks/useCurrentSessionId'
import { AIInputEventSyncTypeEnum as Sync } from '../hooks/grpcApi'
import { randomString } from '@/utils/randomUtil'
import styles from './SessionSkills.module.scss'

type Request = {
  id: string
  kind: 'loaded' | 'available' | 'detail' | 'load'
  name?: string
  dataVersion: number
  refreshed?: boolean
  timer: ReturnType<typeof setTimeout>
}

/** A receipt only acknowledges transport. Lists and load success wait for actual skill data. */
export function SessionSkills() {
  const { t } = useI18nNamespaces(['aiAgent'])
  const id = useCurrentSessionId()
  const store = useCurrentStore(),
    raw = useCurrentRawData(),
    meta = useCurrentMeta()
  const { onSend } = useAIAgentDispatcher()
  const loadedVersion = useStore(store, (s) => s.loadedSkillsUpdate)
  const availableVersion = useStore(store, (s) => s.availableSkillsUpdate)
  const detailVersion = useStore(store, (s) => s.skillDetailsUpdate)
  const syncVersion = useStore(store, (s) => s.syncIDUpdate)
  const execute = useStore(store, (s) => s.execute)
  const [tab, setTab] = useState<'loaded' | 'available'>('loaded')
  const [query, setQuery] = useState(''),
    [appliedQuery, setAppliedQuery] = useState('')
  const [visibleQuery, setVisibleQuery] = useState('')
  const [selected, setSelected] = useState(''),
    [error, setError] = useState(''),
    [message, setMessage] = useState('')
  const [version, setVersion] = useState(0)
  const requests = useRef(new Map<Request['kind'], Request>())
  const clear = useMemoizedFn((kind: Request['kind']) => {
    const req = requests.current.get(kind)
    if (req) {
      clearTimeout(req.timer)
      requests.current.delete(kind)
      setVersion((v) => v + 1)
    }
  })
  const request = useMemoizedFn((kind: Request['kind'], type: Sync, payload = {}, name?: string) => {
    if (!id || !execute || requests.current.has(kind)) return false
    const syncId = `skill-${randomString(16)}`
    setError('')
    setMessage('')
    const sent = onSend({
      token: id,
      type: '',
      params: { IsSyncMessage: true, SyncType: type, SyncID: syncId, SyncJsonInput: JSON.stringify(payload) },
    })
    if (!sent) {
      setError(t('SessionSkills.sendFailed'))
      return false
    }
    requests.current.set(kind, {
      id: syncId,
      kind,
      name,
      dataVersion: kind === 'loaded' ? loadedVersion : kind === 'available' ? availableVersion : detailVersion,
      timer: setTimeout(() => {
        clear(kind)
        setError(t('SessionSkills.timeout'))
      }, 30000),
    })
    setVersion((v) => v + 1)
    return true
  })
  const available = useMemoizedFn((page: number, value = appliedQuery) =>
    request('available', Sync.SYNC_TYPE_SKILL_AVAILABLE, { page, page_size: 50, query: value }),
  )
  const refresh = useMemoizedFn(() => {
    request('loaded', Sync.SYNC_TYPE_SKILL_LOADED)
    available(1)
  })
  useEffect(() => {
    setQuery('')
    setAppliedQuery('')
    setVisibleQuery('')
    setVersion((v) => v + 1)
    setSelected('')
    setError('')
    setMessage('')
    if (id && execute) refresh()
    return () => {
      requests.current.forEach((req) => clearTimeout(req.timer))
      requests.current.clear()
    }
  }, [id, meta, execute])
  useEffect(() => {
    const req = requests.current.get('loaded')
    if (req && loadedVersion > req.dataVersion) clear('loaded')
  }, [loadedVersion])
  useEffect(() => {
    const req = requests.current.get('available')
    if (req && availableVersion > req.dataVersion) {
      clear('available')
      if (!raw.availableSkills.error) setVisibleQuery(appliedQuery)
    }
    if (raw.availableSkills.error) setError(raw.availableSkills.error)
  }, [availableVersion])
  useEffect(() => {
    if (
      requests.current.get('detail')?.name === selected &&
      detailVersion > (requests.current.get('detail')?.dataVersion ?? detailVersion) &&
      raw.skillDetails.has(selected)
    )
      clear('detail')
  }, [detailVersion, selected])
  useEffect(() => {
    const req = requests.current.get('load')
    if (!req) return
    if (raw.loadedSkills.skills.some((s) => s.name === req.name)) {
      clear('load')
      setMessage(t('SessionSkills.loadedSuccess', { name: req.name }))
      available(1)
    } else if (!req.refreshed && !meta.syncIDMap.has(req.id)) {
      // An acknowledgement does not imply the skill loaded; fetch the authoritative list.
      req.refreshed = request('loaded', Sync.SYNC_TYPE_SKILL_LOADED)
      available(1)
    }
  }, [loadedVersion, syncVersion])
  const busy = (kind: Request['kind']) => {
    void version
    return requests.current.has(kind)
  }
  const open = (name: string) => {
    clear('detail')
    setSelected(name)
    if (!raw.skillDetails.has(name)) request('detail', Sync.SYNC_TYPE_SKILL_DETAIL, { skill_name: name }, name)
  }
  const detail = raw.skillDetails.get(selected)
  const list =
    tab === 'loaded'
      ? raw.loadedSkills.skills.filter((s) => `${s.name} ${s.description}`.toLowerCase().includes(query.toLowerCase()))
      : visibleQuery === appliedQuery
        ? raw.availableSkills.skills
        : []
  return (
    <div className={styles.panel}>
      <div className={styles.toolbar}>
        <YakitButton type={tab === 'loaded' ? 'primary' : 'outline1'} onClick={() => setTab('loaded')}>
          {t('SessionSkills.loaded')} ({raw.loadedSkills.total})
        </YakitButton>
        <YakitButton type={tab === 'available' ? 'primary' : 'outline1'} onClick={() => setTab('available')}>
          {t('SessionSkills.available')} ({raw.availableSkills.total})
        </YakitButton>
        <YakitButton type="outline1" disabled={!execute} loading={busy(tab)} onClick={refresh}>
          {t('SessionSkills.refresh')}
        </YakitButton>
      </div>
      <form
        className={styles.toolbar}
        onSubmit={(e) => {
          e.preventDefault()
          if (tab === 'available' && available(1, query.trim())) setAppliedQuery(query.trim())
        }}
      >
        <YakitInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('SessionSkills.searchPlaceholder')}
          wrapperStyle={{ flex: 1, minWidth: 120 }}
        />
        {tab === 'available' && (
          <YakitButton htmlType="submit" disabled={!execute || busy('load')} loading={busy('available')}>
            {t('SessionSkills.search')}
          </YakitButton>
        )}
      </form>
      {!execute && <p role="status">{t('SessionSkills.disconnected')}</p>}
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <div className={styles.columns}>
        <div className={styles.list}>
          {list.map((skill) => (
            <article key={skill.name} className={styles.item}>
              <button className={styles.name} onClick={() => open(skill.name)}>
                {skill.name}
              </button>
              <p>{skill.description}</p>
              <span>{skill.token_count === undefined ? '' : `${skill.token_count} tokens`}</span>
              {tab === 'available' && !raw.loadedSkills.skills.some((s) => s.name === skill.name) && (
                <YakitButton
                  disabled={!execute || busy('load') || busy('available')}
                  loading={requests.current.get('load')?.name === skill.name}
                  onClick={() => request('load', Sync.SYNC_TYPE_LOAD_SKILL, { skill_names: [skill.name] }, skill.name)}
                >
                  {t('SessionSkills.load')}
                </YakitButton>
              )}
            </article>
          ))}
          {!list.length && <p>{busy(tab) ? t('SessionSkills.loading') : t('SessionSkills.empty')}</p>}
          {tab === 'available' && raw.availableSkills.has_more && (
            <YakitButton
              loading={busy('available')}
              disabled={!execute || query.trim() !== appliedQuery || !!raw.availableSkills.error || busy('load')}
              onClick={() => available(raw.availableSkills.page + 1)}
            >
              {t('SessionSkills.more')}
            </YakitButton>
          )}
        </div>
        <div className={styles.detail}>
          {selected ? (
            <>
              <h3>{selected}</h3>
              {busy('detail') && <p>{t('SessionSkills.loading')}</p>}
              {detail?.error ? (
                <p role="alert">{detail.error}</p>
              ) : (
                <>
                  <p>{detail?.meta?.description}</p>
                  <pre>{detail?.prompt_content || detail?.skill_md || detail?.meta?.body}</pre>
                  {detail?.file_tree && (
                    <>
                      <h4>{t('SessionSkills.fileTree')}</h4>
                      <pre>{detail.file_tree}</pre>
                    </>
                  )}
                  {detail?.url && <p>{detail.url}</p>}
                </>
              )}
              <YakitButton
                disabled={!execute}
                loading={busy('detail')}
                onClick={() => {
                  clear('detail')
                  request('detail', Sync.SYNC_TYPE_SKILL_DETAIL, { skill_name: selected }, selected)
                }}
              >
                {t('SessionSkills.refreshDetail')}
              </YakitButton>
            </>
          ) : (
            <p>{t('SessionSkills.selectDetail')}</p>
          )}
        </div>
      </div>
    </div>
  )
}
