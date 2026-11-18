import { useEffect, useState } from 'react'
import { TrashOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useEditorHeaderVisibility, type HeaderRole } from '@/store/editorHeaderVisibility'
import { DEFAULT_HIDDEN_HTTP_HEADERS, isValidHTTPHeaderName } from '@/utils/hiddenHTTPHeaders'
import { yakitFailed } from '@/utils/notification'
import styles from './HTTPHeaderVisibilitySettings.module.scss'

const roles: HeaderRole[] = ['request', 'response']

export const HTTPHeaderVisibilitySettings = () => {
  const { t } = useI18nNamespaces(['setting'])
  const { initialize, saveSettings, hidden, headers, ready } = useEditorHeaderVisibility()
  const [input, setInput] = useState({ request: '', response: '' })
  const [errors, setErrors] = useState({ request: '', response: '' })
  const [saving, setSaving] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const loaded = ready.request && ready.response

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

  // 改动即时写入远端配置；隐藏开关仍由编辑器维护，写入时保留其实时值。
  const persist = async (role: HeaderRole, nextHeaders: readonly string[]) => {
    if (!loaded || saving) return false
    setSaving(true)
    try {
      await saveSettings({
        request: { hidden: hidden.request, headers: role === 'request' ? nextHeaders : headers.request },
        response: { hidden: hidden.response, headers: role === 'response' ? nextHeaders : headers.response },
      })
      return true
    } catch (error) {
      yakitFailed(t('HTTPHeaderVisibilitySettings.saveFailed', { error: String(error) }))
      return false
    } finally {
      setSaving(false)
    }
  }

  const add = async (role: HeaderRole) => {
    const name = input[role].trim().toLowerCase()
    if (!name) return
    const error = !isValidHTTPHeaderName(name)
      ? t('HTTPHeaderVisibilitySettings.invalidName')
      : headers[role].includes(name)
        ? t('HTTPHeaderVisibilitySettings.duplicateName')
        : ''
    setErrors((current) => ({ ...current, [role]: error }))
    if (error) return
    if (!(await persist(role, [name, ...headers[role]]))) return
    setInput((current) => ({ ...current, [role]: '' }))
  }

  const resetInput = (role: HeaderRole) => {
    setInput((current) => ({ ...current, [role]: '' }))
    setErrors((current) => ({ ...current, [role]: '' }))
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
      ) : !loaded ? (
        <div className={styles.loading}>
          <YakitSpin spinning />
        </div>
      ) : (
        <div className={styles.panels}>
          {roles.map((role) => (
            <section key={role} className={styles.panel} aria-label={t(`HTTPHeaderVisibilitySettings.${role}`)}>
              <div className={styles.heading}>
                <h3>{t(`HTTPHeaderVisibilitySettings.${role}`)}</h3>
                <span className={styles.count}>
                  {t('HTTPHeaderVisibilitySettings.count', { count: headers[role].length })}
                </span>
              </div>
              <div className={styles.list}>
                {headers[role].length ? (
                  headers[role].map((header) => (
                    <div key={header} className={styles.row}>
                      <span>{header}</span>
                      <YakitButton
                        size="small"
                        type="text2"
                        className={styles.remove}
                        disabled={saving}
                        icon={<TrashOutlined />}
                        aria-label={t('HTTPHeaderVisibilitySettings.remove', { header })}
                        onClick={() =>
                          void persist(
                            role,
                            headers[role].filter((name) => name !== header),
                          )
                        }
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
                  onPressEnter={() => void add(role)}
                />
                <YakitButton type="outline2" disabled={saving || !input[role].trim()} onClick={() => void add(role)}>
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
                  disabled={saving || !headers[role].length}
                  onClick={() => {
                    resetInput(role)
                    void persist(role, [])
                  }}
                >
                  {t('HTTPHeaderVisibilitySettings.clear')}
                </YakitButton>
                <YakitButton
                  type="text2"
                  disabled={saving}
                  onClick={() => {
                    resetInput(role)
                    void persist(role, [...DEFAULT_HIDDEN_HTTP_HEADERS[role]])
                  }}
                >
                  {t('HTTPHeaderVisibilitySettings.restoreDefaults')}
                </YakitButton>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
