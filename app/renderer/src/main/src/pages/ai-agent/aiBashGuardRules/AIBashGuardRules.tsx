import React, { useEffect, useMemo, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'
import { YakitSegmented } from '@/components/yakitUI/YakitSegmented/YakitSegmented'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { yakitNotify } from '@/utils/notification'
import styles from './AIBashGuardRules.module.scss'
import { createRuleRow, readRulesFromEngine, validateRuleRows, writeRulesToEngine } from './utils'
import type { AIBashGuardAction, AIBashGuardMatch, AIBashGuardRuleRow, AIBashGuardRuleValidationError } from './utils'

export const AIBashGuardRules: React.FC = React.memo(() => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const [rows, setRows] = useState<AIBashGuardRuleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})

  const actionOptions = useMemo(
    () => [
      { label: t('AIBashGuardRules.actionDeny'), value: 'deny' },
      { label: t('AIBashGuardRules.actionAsk'), value: 'ask' },
      { label: t('AIBashGuardRules.actionWarn'), value: 'warn' },
    ],
    [t],
  )

  const matchOptions = useMemo(
    () => [
      { label: t('AIBashGuardRules.matchRegex'), value: 'regex' },
      { label: t('AIBashGuardRules.matchExact'), value: 'exact' },
      { label: t('AIBashGuardRules.matchPrefix'), value: 'prefix' },
    ],
    [t],
  )

  const errorMessage = (error: AIBashGuardRuleValidationError) => {
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
    }
  }

  const patchRow = useMemoizedFn((uid: string, patch: Partial<AIBashGuardRuleRow>) => {
    setRows((prev) => prev.map((row) => (row.uid === uid ? { ...row, ...patch } : row)))
    setRowErrors((prev) => {
      if (!prev[uid]) return prev
      const next = { ...prev }
      delete next[uid]
      return next
    })
  })

  useEffect(() => {
    let cancelled = false
    readRulesFromEngine().then(({ rows: loaded, error }) => {
      if (cancelled) return
      setRows(loaded)
      if (error) yakitNotify('error', t('AIBashGuardRules.loadFailed', { error }))
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [t])

  const onAddRule = useMemoizedFn(() => {
    setRows((prev) => [...prev, createRuleRow()])
  })

  const onRemoveRule = useMemoizedFn((uid: string) => {
    setRows((prev) => prev.filter((row) => row.uid !== uid))
    setRowErrors((prev) => {
      const next = { ...prev }
      delete next[uid]
      return next
    })
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
      </div>

      <div className={styles['toolbar']}>
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
      </div>

      <div className={styles['rule-list']}>
        {rows.length === 0 && !loading ? <div className={styles['empty']}>{t('AIBashGuardRules.empty')}</div> : null}
        {rows.map((row, index) => (
          <div key={row.uid} className={`${styles['rule-row']} ${row.disabled ? styles['rule-row-disabled'] : ''}`}>
            <div className={styles['rule-head']}>
              <span className={styles['rule-index']}>{index + 1}</span>
              <YakitInput
                className={styles['name-input']}
                size="small"
                value={row.name}
                placeholder={t('AIBashGuardRules.namePlaceholder')}
                onChange={(e) => patchRow(row.uid, { name: e.target.value })}
              />
              <YakitSwitch
                size="small"
                checked={!row.disabled}
                aria-label={t('AIBashGuardRules.enableRule')}
                onChange={(checked) => patchRow(row.uid, { disabled: !checked })}
              />
              <YakitPopconfirm
                placement="bottomRight"
                title={t('AIBashGuardRules.removeConfirm', {
                  index: index + 1,
                  pattern: row.pattern.trim() || row.name.trim() || '-',
                })}
                onConfirm={() => onRemoveRule(row.uid)}
              >
                <YakitButton type="text" colors="danger" size="small">
                  {t('AIBashGuardRules.remove')}
                </YakitButton>
              </YakitPopconfirm>
            </div>

            <div className={styles['rule-body']}>
              <YakitInput
                className={styles['pattern-input']}
                value={row.pattern}
                placeholder={t('AIBashGuardRules.patternPlaceholder')}
                onChange={(e) => patchRow(row.uid, { pattern: e.target.value })}
                disabled={row.disabled}
                spellCheck={false}
              />
              <YakitSegmented
                options={matchOptions}
                value={row.match}
                onChange={(value) => patchRow(row.uid, { match: value as AIBashGuardMatch })}
                disabled={row.disabled}
              />
              <YakitSegmented
                options={actionOptions}
                value={row.action}
                onChange={(value) => patchRow(row.uid, { action: value as AIBashGuardAction })}
                disabled={row.disabled}
              />
            </div>
            <YakitInput
              size="small"
              value={row.description}
              placeholder={t('AIBashGuardRules.descriptionPlaceholder')}
              onChange={(e) => patchRow(row.uid, { description: e.target.value })}
              disabled={row.disabled}
            />
            {rowErrors[row.uid] ? <div className={styles['row-error']}>{rowErrors[row.uid]}</div> : null}
          </div>
        ))}
      </div>
    </div>
  )
})
