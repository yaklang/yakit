import { useEffect, useState } from 'react'
import { TrashOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitCheckbox } from '@/components/yakitUI/YakitCheckbox/YakitCheckbox'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import {
  useEditorHeaderVisibility,
  type HeaderRole,
  type HeaderVisibilitySettings,
} from '@/store/editorHeaderVisibility'
import { DEFAULT_HIDDEN_HTTP_HEADERS, isValidHTTPHeaderName } from '@/utils/hiddenHTTPHeaders'
import { yakitFailed, yakitNotify } from '@/utils/notification'
import styles from './HTTPHeaderVisibilitySettings.module.scss'

const roles: HeaderRole[] = ['request', 'response']

export const HTTPHeaderVisibilitySettings = () => {
  const { t } = useI18nNamespaces(['setting'])
  const { initialize, saveSettings, hidden, headers, ready } = useEditorHeaderVisibility()
  const [draftOverride, setDraftOverride] = useState<Record<HeaderRole, HeaderVisibilitySettings>>()
  // Global settings stay mounted when switching tabs. Follow saved preferences until the user starts editing.
  const savedSettings: Record<HeaderRole, HeaderVisibilitySettings> = {
    request: { hidden: hidden.request, headers: headers.request },
    response: { hidden: hidden.response, headers: headers.response },
  }
  const draft = draftOverride || (ready.request && ready.response ? savedSettings : undefined)
  const [input, setInput] = useState({ request: '', response: '' })
  const [errors, setErrors] = useState({ request: '', response: '' })
  const [saving, setSaving] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    void initialize().then(() => {
      if (!active) return
      const state = useEditorHeaderVisibility.getState()
      if (!state.ready.request || !state.ready.response) {
        setLoadFailed(true)
        return
      }
    })
    return () => {
      active = false
    }
  }, [initialize, attempt])

  const resetDraft = () => {
    setDraftOverride(undefined)
    setInput({ request: '', response: '' })
    setErrors({ request: '', response: '' })
  }

  const update = (role: HeaderRole, settings: Partial<HeaderVisibilitySettings>) => {
    setDraftOverride((current) => {
      const previous = current || savedSettings
      return { ...previous, [role]: { ...previous[role], ...settings } }
    })
  }

  const headersWithInput = (role: HeaderRole) => {
    const headers = draft?.[role].headers || []
    const name = input[role].trim().toLowerCase()
    if (!name) return headers
    const error = !isValidHTTPHeaderName(name)
      ? t('HTTPHeaderVisibilitySettings.invalidName')
      : headers.includes(name)
        ? t('HTTPHeaderVisibilitySettings.duplicateName')
        : ''
    setErrors((current) => ({ ...current, [role]: error }))
    return error ? undefined : [...headers, name]
  }

  const add = (role: HeaderRole) => {
    const headers = headersWithInput(role)
    if (!headers) return
    update(role, { headers })
    setInput((current) => ({ ...current, [role]: '' }))
  }

  const save = async () => {
    if (!draft || saving) return
    const request = headersWithInput('request')
    const response = headersWithInput('response')
    if (!request || !response) return
    setSaving(true)
    try {
      await saveSettings({
        request: { ...draft.request, headers: request },
        response: { ...draft.response, headers: response },
      })
      resetDraft()
      yakitNotify('success', t('HTTPHeaderVisibilitySettings.saved'))
    } catch (error) {
      yakitFailed(t('HTTPHeaderVisibilitySettings.saveFailed', { error: String(error) }))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <p className={styles.description}>{t('HTTPHeaderVisibilitySettings.description')}</p>
      {loadFailed ? (
        <div className={styles.loading}>
          <span>{t('HTTPHeaderVisibilitySettings.loadFailed')}</span>
          <YakitButton
            type="outline2"
            onClick={() => {
              setLoadFailed(false)
              setAttempt((value) => value + 1)
            }}
          >
            {t('HTTPHeaderVisibilitySettings.retry')}
          </YakitButton>
        </div>
      ) : !draft ? (
        <div className={styles.loading}>
          <YakitSpin spinning />
        </div>
      ) : (
        <div className={styles.panels}>
          {roles.map((role) => (
            <section key={role} className={styles.panel} aria-label={t(`HTTPHeaderVisibilitySettings.${role}`)}>
              <div className={styles.heading}>
                <h3>{t(`HTTPHeaderVisibilitySettings.${role}`)}</h3>
                <span>{t('HTTPHeaderVisibilitySettings.count', { count: draft[role].headers.length })}</span>
              </div>
              <YakitCheckbox
                checked={draft[role].hidden}
                disabled={saving}
                onChange={(event) => update(role, { hidden: event.target.checked })}
              >
                {t('HTTPHeaderVisibilitySettings.hideByDefault')}
              </YakitCheckbox>
              <div className={styles.list}>
                {draft[role].headers.length ? (
                  draft[role].headers.map((header) => (
                    <div key={header} className={styles.row}>
                      <span>{header}</span>
                      <YakitButton
                        size="small"
                        type="text2"
                        disabled={saving}
                        icon={<TrashOutlined />}
                        aria-label={t('HTTPHeaderVisibilitySettings.remove', { header })}
                        onClick={() => update(role, { headers: draft[role].headers.filter((name) => name !== header) })}
                      />
                    </div>
                  ))
                ) : (
                  <div className={styles.empty}>{t('HTTPHeaderVisibilitySettings.empty')}</div>
                )}
              </div>
              <div className={styles.add}>
                <YakitInput
                  value={input[role]}
                  disabled={saving}
                  placeholder={t('HTTPHeaderVisibilitySettings.placeholder')}
                  aria-label={t('HTTPHeaderVisibilitySettings.newHeader', {
                    role: t(`HTTPHeaderVisibilitySettings.${role}`),
                  })}
                  onChange={(event) => {
                    const value = event.target.value
                    setInput((current) => ({ ...current, [role]: value }))
                    setErrors((current) => ({ ...current, [role]: '' }))
                  }}
                  onPressEnter={() => add(role)}
                />
                <YakitButton type="outline2" disabled={saving || !input[role].trim()} onClick={() => add(role)}>
                  {t('HTTPHeaderVisibilitySettings.add')}
                </YakitButton>
              </div>
              {errors[role] && (
                <div role="alert" className={styles.error}>
                  {errors[role]}
                </div>
              )}
              <div className={styles.actions}>
                <YakitButton
                  type="text2"
                  disabled={saving || !draft[role].headers.length}
                  onClick={() => {
                    update(role, { headers: [] })
                    setInput((current) => ({ ...current, [role]: '' }))
                    setErrors((current) => ({ ...current, [role]: '' }))
                  }}
                >
                  {t('HTTPHeaderVisibilitySettings.clear')}
                </YakitButton>
                <YakitButton
                  type="text2"
                  disabled={saving}
                  onClick={() => {
                    update(role, { hidden: false, headers: [...DEFAULT_HIDDEN_HTTP_HEADERS[role]] })
                    setInput((current) => ({ ...current, [role]: '' }))
                    setErrors((current) => ({ ...current, [role]: '' }))
                  }}
                >
                  {t('HTTPHeaderVisibilitySettings.restoreDefaults')}
                </YakitButton>
              </div>
            </section>
          ))}
        </div>
      )}
      <div className={styles.footer}>
        <span className={styles['save-hint']}>{t('HTTPHeaderVisibilitySettings.saveHint')}</span>
        <YakitButton disabled={!draft} loading={saving} onClick={() => void save()}>
          {t('HTTPHeaderVisibilitySettings.save')}
        </YakitButton>
      </div>
    </div>
  )
}
