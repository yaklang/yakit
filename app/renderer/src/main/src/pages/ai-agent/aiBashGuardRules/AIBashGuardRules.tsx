import React, { useEffect, useMemo, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitSegmented } from '@/components/yakitUI/YakitSegmented/YakitSegmented'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { showYakitModal } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { yakitNotify } from '@/utils/notification'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from './AIBashGuardRules.module.scss'
import type { AIBashGuardAction, AIBashGuardRuleRow, AIBashGuardRuleValidationError } from './utils'
import { createRuleRow, readRulesFromEngine, validateRuleRows, writeRulesToEngine } from './utils'

export const AIBashGuardRules: React.FC = React.memo(() => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const [rows, setRows] = useState<AIBashGuardRuleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})

  const actionOptions = useMemo(
    () => [
      { label: t('AIBashGuardRules.actionDeny'), value: 'deny' },
      { label: t('AIBashGuardRules.actionAsk'), value: 'ask' },
      { label: t('AIBashGuardRules.actionWarn'), value: 'warn' },
    ],
    [t],
  )

  const errorMessage = useMemoizedFn((error: AIBashGuardRuleValidationError) => {
    switch (error.code) {
      case 'patternRequired':
        return t('AIBashGuardRules.errorPatternRequired')
      case 'patternSyntax':
        return t('AIBashGuardRules.errorPatternSyntax', { error: error.message })
      case 'patternLookaround':
        return t('AIBashGuardRules.errorPatternLookaround')
      case 'patternBackreference':
        return t('AIBashGuardRules.errorPatternBackreference')
      case 'patternDuplicate':
        return t('AIBashGuardRules.errorPatternDuplicate', { pattern: error.pattern })
      default:
        return ''
    }
  })

  const patchRow = useMemoizedFn((uid: string, patch: Partial<AIBashGuardRuleRow>) => {
    setRows((prev) => prev.map((row) => (row.uid === uid ? { ...row, ...patch } : row)))
    setRowErrors((prev) => {
      if (!prev[uid]) return prev
      const next = { ...prev }
      delete next[uid]
      return next
    })
    setDirty(true)
  })

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      const { rows: loaded, error } = await readRulesFromEngine()
      if (cancelled) return
      setRows(loaded)
      if (error) {
        yakitNotify('error', t('AIBashGuardRules.loadFailed', { error }))
      }
      setLoading(false)
    }
    init()
    return () => {
      cancelled = true
    }
  }, [t])

  const onAddRule = useMemoizedFn(() => {
    setRows((prev) => [...prev, createRuleRow()])
    setDirty(true)
  })

  const onRemoveRule = useMemoizedFn((row: AIBashGuardRuleRow, index: number) => {
    const modal = showYakitModal({
      title: t('AIBashGuardRules.removeConfirmTitle'),
      content: t('AIBashGuardRules.removeConfirmContent', {
        index: index + 1,
        pattern: row.pattern.trim() || t('AIBashGuardRules.untitledRule'),
      }),
      onOkText: t('AIBashGuardRules.removeConfirmOk'),
      onCancel: () => modal.destroy(),
      onOk: () => {
        modal.destroy()
        setRows((prev) => prev.filter((item) => item.uid !== row.uid))
        setRowErrors((prev) => {
          const next = { ...prev }
          delete next[row.uid]
          return next
        })
        setDirty(true)
      },
      width: 460,
    })
  })

  const onReload = useMemoizedFn(async () => {
    setLoading(true)
    const { rows: loaded, error } = await readRulesFromEngine()
    if (error) {
      yakitNotify('error', t('AIBashGuardRules.loadFailed', { error }))
    } else {
      setRows(loaded)
      setRowErrors({})
      setDirty(false)
      yakitNotify('success', t('AIBashGuardRules.reloadSuccess'))
    }
    setLoading(false)
  })

  const onSave = useMemoizedFn(async () => {
    const errors = validateRuleRows(rows)
    if (errors.length > 0) {
      const next: Record<string, string> = {}
      errors.forEach((error) => {
        if (!next[error.uid]) next[error.uid] = errorMessage(error)
      })
      setRowErrors(next)
      yakitNotify('error', t('AIBashGuardRules.errorFixRows', { count: errors.length }))
      return
    }
    setSaving(true)
    try {
      await writeRulesToEngine(rows)
      setRowErrors({})
      setDirty(false)
      yakitNotify('success', t('AIBashGuardRules.saveSuccess', { count: rows.filter((row) => !row.disabled).length }))
    } catch (error) {
      yakitNotify('error', t('AIBashGuardRules.saveFailed', { error: `${error}` }))
    } finally {
      setSaving(false)
    }
  })

  return (
    <div className={styles['ai-bash-guard-rules']}>
      <div className={styles['header']}>
        <div className={styles['title']}>{t('AIBashGuardRules.title')}</div>
        <div className={styles['description']}>{t('AIBashGuardRules.description')}</div>
        <div className={styles['tips']}>
          <div className={styles['tip-item']}>{t('AIBashGuardRules.tipMatch')}</div>
          <div className={styles['tip-item']}>{t('AIBashGuardRules.tipAction')}</div>
          <div className={styles['tip-item']}>{t('AIBashGuardRules.tipEnable')}</div>
        </div>
      </div>
      <div className={styles['toolbar']}>
        <div className={styles['toolbar-left']}>
          <YakitButton size="middle" onClick={onAddRule} disabled={loading}>
            {t('AIBashGuardRules.addRule')}
          </YakitButton>
          <YakitButton
            type="outline2"
            size="middle"
            onClick={onSave}
            loading={saving}
            disabled={loading || rows.length === 0}
          >
            {t('AIBashGuardRules.save')}
          </YakitButton>
          <YakitButton type="text" size="middle" onClick={onReload} disabled={loading}>
            {t('AIBashGuardRules.reload')}
          </YakitButton>
        </div>
        <div className={styles['toolbar-right']}>
          {dirty ? <span className={styles['dirty']}>{t('AIBashGuardRules.unsaved')}</span> : null}
        </div>
      </div>
      <div className={styles['rule-list']}>
        {rows.length === 0 && !loading ? (
          <YakitEmpty
            title={t('AIBashGuardRules.emptyTitle')}
            descriptionReactNode={t('AIBashGuardRules.emptyDescription')}
          />
        ) : null}
        {rows.map((row, index) => (
          <div className={`${styles['rule-row']} ${row.disabled ? styles['rule-row-disabled'] : ''}`} key={row.uid}>
            <div className={styles['row-main']}>
              <div className={styles['row-index']}>{index + 1}</div>
              <div className={styles['row-content']}>
                <div className={styles['row-line']}>
                  <YakitInput
                    className={styles['pattern-input']}
                    value={row.pattern}
                    placeholder={t('AIBashGuardRules.patternPlaceholder')}
                    onChange={(e) => patchRow(row.uid, { pattern: e.target.value })}
                    spellCheck={false}
                  />
                  <YakitSegmented
                    options={actionOptions}
                    value={row.action}
                    onChange={(value) => patchRow(row.uid, { action: value as AIBashGuardAction })}
                    disabled={row.disabled}
                  />
                </div>
                <div className={styles['row-line']}>
                  <YakitInput
                    className={styles['name-input']}
                    value={row.name}
                    placeholder={t('AIBashGuardRules.namePlaceholder')}
                    onChange={(e) => patchRow(row.uid, { name: e.target.value })}
                  />
                  <YakitInput
                    value={row.description}
                    placeholder={t('AIBashGuardRules.descriptionPlaceholder')}
                    onChange={(e) => patchRow(row.uid, { description: e.target.value })}
                  />
                </div>
                {rowErrors[row.uid] ? <div className={styles['row-error']}>{rowErrors[row.uid]}</div> : null}
              </div>
              <div className={styles['row-side']}>
                <YakitSwitch
                  size="small"
                  checked={!row.disabled}
                  onChange={(checked) => patchRow(row.uid, { disabled: !checked })}
                />
                <YakitButton type="text" colors="danger" size="small" onClick={() => onRemoveRule(row, index)}>
                  {t('AIBashGuardRules.remove')}
                </YakitButton>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})

export default AIBashGuardRules
