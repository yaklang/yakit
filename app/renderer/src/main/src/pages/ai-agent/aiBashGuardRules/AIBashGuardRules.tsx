import React, { useEffect, useMemo, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import classNames from 'classnames'
import { YakitAlert } from '@/components/yakitUI/YakitAlert/YakitAlert'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitCard } from '@/components/yakitUI/YakitCard/YakitCard'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'
import { YakitSegmented } from '@/components/yakitUI/YakitSegmented/YakitSegmented'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { yakitNotify } from '@/utils/notification'
import styles from './AIBashGuardRules.module.scss'
import type { AIBashGuardAction, AIBashGuardMatch, AIBashGuardRuleRow, AIBashGuardRuleValidationError } from './utils'
import { createRuleRow, readRulesFromEngine, validateRuleRows, writeRulesToEngine } from './utils'

const ACTION_TAG_COLOR: Record<AIBashGuardAction, 'danger' | 'warning' | 'info'> = {
  deny: 'danger',
  ask: 'warning',
  warn: 'info',
}

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

  const matchOptions = useMemo(
    () => [
      { label: t('AIBashGuardRules.matchExact'), value: 'exact' },
      { label: t('AIBashGuardRules.matchPrefix'), value: 'prefix' },
      { label: t('AIBashGuardRules.matchRegex'), value: 'regex' },
    ],
    [t],
  )

  const actionLabels = useMemo(
    () => ({
      deny: t('AIBashGuardRules.actionDeny'),
      ask: t('AIBashGuardRules.actionAsk'),
      warn: t('AIBashGuardRules.actionWarn'),
    }),
    [t],
  )

  const matchHints = useMemo(
    () => ({
      exact: t('AIBashGuardRules.matchExactHint'),
      prefix: t('AIBashGuardRules.matchPrefixHint'),
      regex: t('AIBashGuardRules.matchRegexHint'),
    }),
    [t],
  )

  const patternPlaceholders = useMemo(
    () => ({
      exact: t('AIBashGuardRules.patternExactPlaceholder'),
      prefix: t('AIBashGuardRules.patternPrefixPlaceholder'),
      regex: t('AIBashGuardRules.patternPlaceholder'),
    }),
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

  const onRemoveRule = useMemoizedFn((row: AIBashGuardRuleRow) => {
    setRows((prev) => prev.filter((item) => item.uid !== row.uid))
    setRowErrors((prev) => {
      const next = { ...prev }
      delete next[row.uid]
      return next
    })
    setDirty(true)
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
        <div className={styles['title-row']}>
          <div className={styles['title']}>{t('AIBashGuardRules.title')}</div>
          <YakitTag size="small" color="blue">
            {t('AIBashGuardRules.ruleCount', { count: rows.length })}
          </YakitTag>
        </div>
        <div className={styles['description']}>{t('AIBashGuardRules.description')}</div>
      </div>

      <YakitAlert
        type="info"
        showIcon
        className={styles['tips']}
        message={t('AIBashGuardRules.tipTitle')}
        description={
          <div className={styles['tip-list']}>
            <div className={styles['tip-item']}>{t('AIBashGuardRules.tipMatch')}</div>
            <div className={styles['tip-item']}>{t('AIBashGuardRules.tipAction')}</div>
            <div className={styles['tip-item']}>{t('AIBashGuardRules.tipEnable')}</div>
          </div>
        }
      />

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

      <YakitSpin spinning={loading} wrapperClassName={styles['rule-list-wrapper']}>
        <div className={styles['rule-list']}>
          {rows.length === 0 && !loading ? (
            <YakitEmpty
              title={t('AIBashGuardRules.emptyTitle')}
              descriptionReactNode={t('AIBashGuardRules.emptyDescription')}
            />
          ) : null}
          {rows.map((row, index) => (
            <YakitCard
              key={row.uid}
              className={classNames(styles['rule-card'], { [styles['rule-card-disabled']]: row.disabled })}
              style={{ height: 'auto' }}
              headClassName={styles['rule-card-head']}
              bodyClassName={styles['rule-card-body']}
              title={
                <div className={styles['rule-card-title']}>
                  <span className={styles['rule-index']}>{index + 1}</span>
                  <YakitInput
                    className={styles['name-input']}
                    value={row.name}
                    placeholder={t('AIBashGuardRules.namePlaceholder')}
                    onChange={(e) => patchRow(row.uid, { name: e.target.value })}
                  />
                </div>
              }
              extra={
                <div className={styles['rule-card-extra']}>
                  <YakitTag size="small" color={ACTION_TAG_COLOR[row.action]}>
                    {actionLabels[row.action]}
                  </YakitTag>
                  <YakitSwitch
                    size="small"
                    checked={!row.disabled}
                    onChange={(checked) => patchRow(row.uid, { disabled: !checked })}
                  />
                  <YakitPopconfirm
                    placement="bottomRight"
                    title={t('AIBashGuardRules.removeConfirmContent', {
                      index: index + 1,
                      pattern: row.pattern.trim() || t('AIBashGuardRules.untitledRule'),
                    })}
                    onConfirm={() => onRemoveRule(row)}
                  >
                    <YakitButton type="text" colors="danger" size="small">
                      {t('AIBashGuardRules.remove')}
                    </YakitButton>
                  </YakitPopconfirm>
                </div>
              }
            >
              <div className={styles['field-row']}>
                <div className={styles['field-label']}>{t('AIBashGuardRules.matchLabel')}</div>
                <YakitSegmented
                  options={matchOptions}
                  value={row.match}
                  onChange={(value) => patchRow(row.uid, { match: value as AIBashGuardMatch })}
                  disabled={row.disabled}
                />
                <span className={styles['field-hint']}>{matchHints[row.match]}</span>
              </div>
              <div className={styles['field-row']}>
                <div className={styles['field-label']}>{t('AIBashGuardRules.patternLabel')}</div>
                <YakitInput
                  className={styles['pattern-input']}
                  value={row.pattern}
                  placeholder={patternPlaceholders[row.match]}
                  onChange={(e) => patchRow(row.uid, { pattern: e.target.value })}
                  disabled={row.disabled}
                  spellCheck={false}
                />
                <YakitSegmented
                  options={actionOptions}
                  value={row.action}
                  onChange={(value) => patchRow(row.uid, { action: value as AIBashGuardAction })}
                  disabled={row.disabled}
                />
              </div>
              <div className={styles['field-row']}>
                <div className={styles['field-label']}>{t('AIBashGuardRules.descriptionLabel')}</div>
                <YakitInput
                  value={row.description}
                  placeholder={t('AIBashGuardRules.descriptionPlaceholder')}
                  onChange={(e) => patchRow(row.uid, { description: e.target.value })}
                  disabled={row.disabled}
                />
              </div>
              {rowErrors[row.uid] ? <div className={styles['row-error']}>{rowErrors[row.uid]}</div> : null}
            </YakitCard>
          ))}
        </div>
      </YakitSpin>
    </div>
  )
})

export default AIBashGuardRules
