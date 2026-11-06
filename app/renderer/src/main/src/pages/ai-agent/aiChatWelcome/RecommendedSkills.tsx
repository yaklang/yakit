import { useSessionModal } from '../sessionTabs/useSessionModal'
import React, { useEffect, useRef, useState } from 'react'
import { Checkbox, Input, Modal } from 'antd'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import type { AIEnabledCapability, AIReActRecommendedSkill } from '@/pages/ai-re-act/hooks/grpcApi'
import {
  restoreRecommendedSkillSelection,
  serializeRecommendedSkillSelection,
} from '../utils/recommendedSkillSelection'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'

const invoke = (method: string, ...args: unknown[]): Promise<any> =>
  Promise.resolve().then(() => window.require('electron').ipcRenderer.invoke(method, ...args))
export function RecommendedSkills({
  cacheKey,
  onChange,
}: {
  cacheKey: string
  onChange: (skills: AIEnabledCapability[]) => void
}) {
  const { t, i18n } = useI18nNamespaces(['aiAgent'])
  const { active, ownDialog } = useSessionModal()
  const previousActive = useRef(active)
  const [list, setList] = useState<AIReActRecommendedSkill[]>([])
  const [selected, setSelected] = useState<AIReActRecommendedSkill[]>([])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<AIReActRecommendedSkill>()
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const alive = useRef(true)
  const epoch = useRef(0)
  useEffect(() => {
    if (!active) {
      epoch.current++
      setBusy(false)
      setEditing(undefined)
    } else if (!previousActive.current) setRefresh((v) => v + 1)
    previousActive.current = active
  }, [active])
  const writeQueue = useRef<Promise<unknown>>(Promise.resolve())
  useEffect(() => {
    let active = true
    epoch.current++
    alive.current = true
    setReady(false)
    setBusy(false)
    setError('')
    setList([])
    setSelected([])
    setEditing(undefined)
    onChange([])
    Promise.all([invoke('GetAIReActRecommendedSkills'), getRemoteValue(cacheKey)])
      .then(([result, cached]) => {
        if (!active) return
        const data: AIReActRecommendedSkill[] = result?.Data || []
        const restored = restoreRecommendedSkillSelection(data, cached || '')
        setList(data)
        setSelected(restored)
        onChange(restored)
        setReady(true)
      })
      .catch((reason) => {
        if (active) setError(String(reason))
      })
    return () => {
      active = false
      alive.current = false
    }
  }, [cacheKey, refresh])
  const change = (item: AIReActRecommendedSkill) => {
    const same = (s: AIReActRecommendedSkill) => s.Name === item.Name && s.Type === item.Type
    const next = selected.some(same) ? selected.filter((s) => !same(s)) : [...selected, item]
    setSelected(next)
    onChange(next)
    const request = epoch.current
    // Serialize selection writes, including explicit empty selection.
    writeQueue.current = writeQueue.current
      .catch(() => {})
      .then(() => setRemoteValue(cacheKey, serializeRecommendedSkillSelection(next)))
      .catch((reason) => {
        if (alive.current && request === epoch.current) setError(String(reason))
      })
  }
  const update = async (reset: boolean) => {
    if (!editing || busy) return
    setBusy(true)
    setError('')
    const name = editing.Name
    const request = epoch.current
    try {
      const updated: AIReActRecommendedSkill = await invoke(
        reset ? 'ResetAIReActRecommendedSkill' : 'UpdateAIReActRecommendedSkill',
        reset ? { Name: name } : { Name: name, Content: content },
      )
      if (!alive.current || request !== epoch.current) return
      setList((items) => items.map((item) => (item.Name === name ? updated : item)))
      if (reset) setContent(updated.Content)
      else setEditing(undefined)
    } catch (reason) {
      if (alive.current && request === epoch.current) setError(String(reason))
    } finally {
      if (alive.current && request === epoch.current) setBusy(false)
    }
  }
  return (
    <section aria-label={t('Parity.recommendedSkills')} style={{ margin: '12px 0' }}>
      <strong>{t('Parity.recommendedSkills')}</strong>
      {error && (
        <div role="alert">
          {error} <button onClick={() => setRefresh((v) => v + 1)}>{t('SessionSkills.refresh')}</button>
        </div>
      )}
      {!ready && !error && <span role="status">{t('SessionSkills.loading')}</span>}
      <div style={{ maxHeight: 176, overflow: 'auto' }}>
        {list.map((item) => (
          <div key={`${item.Type}:${item.Name}`} style={{ padding: '4px 0' }}>
            <Checkbox
              disabled={!ready}
              checked={selected.some((s) => s.Name === item.Name && s.Type === item.Type)}
              onChange={() => change(item)}
            >
              {i18n.language.startsWith('zh') ? item.DisplayNameZhCN || item.Name : item.Name}
            </Checkbox>
            <YakitButton
              type="text2"
              onClick={() => {
                setEditing(item)
                setContent(item.Content)
              }}
            >
              {t('Parity.editSkill')}
            </YakitButton>
            <div>{item.Description}</div>
          </div>
        ))}
      </div>
      <Modal
        visible={!!editing && active}
        title={editing?.DisplayNameZhCN || editing?.Name}
        width={800}
        destroyOnClose
        onCancel={() => {
          if (!busy) setEditing(undefined)
        }}
        footer={[
          <YakitButton
            key="reset"
            disabled={busy}
            onClick={() => ownDialog(Modal.confirm({ title: t('Parity.resetSkillConfirm'), onOk: () => update(true) }))}
          >
            {t('Parity.resetSkill')}
          </YakitButton>,
          <YakitButton key="save" loading={busy} onClick={() => update(false)}>
            {t('Parity.save')}
          </YakitButton>,
        ]}
      >
        <Input.TextArea
          aria-label={t('Parity.skillContent')}
          value={content}
          rows={16}
          onChange={(e) => setContent(e.target.value)}
        />
      </Modal>
    </section>
  )
}
