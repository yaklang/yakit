import { useEffect, useRef, useState } from 'react'
import { Tooltip } from 'antd'
import { PlusOutlined, RefreshOutlined, TrashOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
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
  const [drafting, setDrafting] = useState({ request: false, response: false })
  // 点击工具栏/取消按钮时先触发 blur，避免失焦提交抢先执行。
  const skipBlurCommitRef = useRef(false)
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

  const resetInput = (role: HeaderRole) => {
    setInput((current) => ({ ...current, [role]: '' }))
    setErrors((current) => ({ ...current, [role]: '' }))
  }

  const startAdd = (role: HeaderRole) => {
    skipBlurCommitRef.current = false
    setDrafting((current) => ({ ...current, [role]: true }))
    resetInput(role)
  }

  const cancelAdd = (role: HeaderRole) => {
    setDrafting((current) => ({ ...current, [role]: false }))
    resetInput(role)
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
    setDrafting((current) => ({ ...current, [role]: false }))
    resetInput(role)
  }

  const commitOnBlur = (role: HeaderRole) => {
    if (skipBlurCommitRef.current) {
      skipBlurCommitRef.current = false
      return
    }
    if (!input[role].trim()) {
      cancelAdd(role)
      return
    }
    void add(role)
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
                <div className={styles.title}>
                  <h3>{t(`HTTPHeaderVisibilitySettings.${role}`)}</h3>
                  <span className={styles.count}>
                    {t('HTTPHeaderVisibilitySettings.count', { count: headers[role].length })}
                  </span>
                </div>
                <div className={styles.actions}>
                  <YakitButton
                    size="small"
                    type="text"
                    icon={<PlusOutlined color="currentColor" />}
                    aria-label={t('HTTPHeaderVisibilitySettings.add')}
                    disabled={saving || drafting[role]}
                    onClick={() => startAdd(role)}
                  >
                    {t('HTTPHeaderVisibilitySettings.add')}
                  </YakitButton>
                  <Tooltip title={t('HTTPHeaderVisibilitySettings.clear')} mouseLeaveDelay={0} destroyOnHidden>
                    <YakitButton
                      size="small"
                      type="text"
                      colors="danger"
                      icon={<TrashOutlined color="currentColor" />}
                      aria-label={t('HTTPHeaderVisibilitySettings.clear')}
                      disabled={saving || !headers[role].length}
                      onMouseDown={() => {
                        if (drafting[role]) skipBlurCommitRef.current = true
                      }}
                      onClick={() => {
                        skipBlurCommitRef.current = false
                        cancelAdd(role)
                        void persist(role, [])
                      }}
                    />
                  </Tooltip>
                  <Tooltip
                    title={t('HTTPHeaderVisibilitySettings.restoreDefaults')}
                    mouseLeaveDelay={0}
                    destroyOnHidden
                  >
                    <YakitButton
                      size="small"
                      type="text2"
                      icon={<RefreshOutlined color="currentColor" />}
                      aria-label={t('HTTPHeaderVisibilitySettings.restoreDefaults')}
                      disabled={saving}
                      onMouseDown={() => {
                        if (drafting[role]) skipBlurCommitRef.current = true
                      }}
                      onClick={() => {
                        skipBlurCommitRef.current = false
                        cancelAdd(role)
                        void persist(role, [...DEFAULT_HIDDEN_HTTP_HEADERS[role]])
                      }}
                    />
                  </Tooltip>
                </div>
              </div>
              <div className={styles.list}>
                {drafting[role] && (
                  <div className={styles.row}>
                    <YakitInput
                      autoFocus
                      size="small"
                      className={styles.draftInput}
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
                      onBlur={() => commitOnBlur(role)}
                    />
                    <YakitButton
                      size="small"
                      type="text2"
                      colors="danger"
                      disabled={saving}
                      icon={<TrashOutlined />}
                      aria-label={t('HTTPHeaderVisibilitySettings.cancelAdd')}
                      onMouseDown={() => {
                        if (drafting[role]) skipBlurCommitRef.current = true
                      }}
                      onClick={() => {
                        skipBlurCommitRef.current = false
                        cancelAdd(role)
                      }}
                    />
                  </div>
                )}
                {headers[role].length
                  ? headers[role].map((header) => (
                      <div key={header} className={styles.row}>
                        <span>{header}</span>
                        <YakitButton
                          size="small"
                          type="text"
                          colors="danger"
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
                  : !drafting[role] && (
                      <div className={styles.emptyState}>
                        <YakitEmpty imageStyle={{ height: 96, width: 96, margin: '0 auto 8px' }} />
                      </div>
                    )}
              </div>
              {errors[role] && (
                <div role="alert" className={styles.error}>
                  {errors[role]}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
