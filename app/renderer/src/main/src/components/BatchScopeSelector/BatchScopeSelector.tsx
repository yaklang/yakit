import type React from 'react'
import { useMemo, useRef, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { yakitNotify } from '@/utils/notification'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { BATCH_SCOPE_SIZE, buildBatchScopes, type BatchScope } from './batchScope'
import styles from './BatchScopeSelector.module.scss'

type ScopeState = 'pending' | 'running' | 'success' | 'failed' | 'partial'

export interface BatchScopeResult {
  UpdatedCount?: number
}

export interface BatchScopeSelectorProps {
  total: number
  execute: (scope: BatchScope) => Promise<BatchScopeResult>
  onScopeSuccess?: (scope: BatchScope) => void
  onPartial?: (scope: BatchScope, updatedCount: number) => void
  onClose?: () => void
}

export const BatchScopeSelector: React.FC<BatchScopeSelectorProps> = (props) => {
  const { total, execute, onScopeSuccess, onPartial, onClose } = props
  const { t } = useI18nNamespaces(['yakitUi'])
  const [states, setStates] = useState<Record<number, ScopeState>>({})
  const [errors, setErrors] = useState<Record<number, string>>({})
  const runningRef = useRef(false)
  const scopes = useMemo(() => buildBatchScopes(total), [total])

  const runScope = useMemoizedFn(async (index: number) => {
    if (runningRef.current || states[index] === 'success' || states[index] === 'partial') return
    const scope = scopes[index]
    if (!scope) return
    runningRef.current = true
    setStates((current) => ({ ...current, [index]: 'running' }))
    setErrors((current) => ({ ...current, [index]: '' }))
    let completed = false
    let partialCount: number | undefined
    try {
      const response = await execute(scope)
      const updatedCount = Number(response?.UpdatedCount ?? 0)
      if (updatedCount !== scope.count) {
        const message = t('BatchScopeSelector.partialUpdate', {
          start: scope.start,
          end: scope.end,
          updatedCount,
          expectedCount: scope.count,
        })
        setStates((current) => ({ ...current, [index]: 'partial' }))
        setErrors((current) => ({ ...current, [index]: message }))
        yakitNotify('error', message)
        partialCount = updatedCount
      } else {
        setStates((current) => ({ ...current, [index]: 'success' }))
        completed = true
      }
    } catch (error) {
      setStates((current) => ({ ...current, [index]: 'failed' }))
      setErrors((current) => ({ ...current, [index]: String(error) }))
    } finally {
      runningRef.current = false
    }
    try {
      if (completed) onScopeSuccess?.(scope)
      if (partialCount !== undefined) onPartial?.(scope, partialCount)
    } catch (error) {
      yakitNotify('error', t('BatchScopeSelector.refreshFailed', { error: String(error) }))
    }
  })

  const closeSafely = useMemoizedFn(() => {
    if (runningRef.current) return
    onClose?.()
  })
  const hasRunning = Object.values(states).includes('running')

  return (
    <div className={styles['batch-scope-selector']}>
      <div className={styles['batch-scope-summary']}>
        {t('BatchScopeSelector.summary', { total, limit: BATCH_SCOPE_SIZE })}
      </div>
      <div className={styles['batch-scope-list']}>
        {scopes.map((scope) => {
          const state = states[scope.index] || 'pending'
          const disabled = hasRunning || state === 'success' || state === 'partial'
          const stateText =
            state === 'running'
              ? t('BatchScopeSelector.running')
              : state === 'success'
                ? t('BatchScopeSelector.success')
                : state === 'failed'
                  ? t('BatchScopeSelector.failed')
                  : state === 'partial'
                    ? t('BatchScopeSelector.partial')
                    : t('BatchScopeSelector.pending')
          return (
            <div className={styles['batch-scope-row']} key={scope.page}>
              <div>
                <div>
                  {scope.start}-{scope.end}
                </div>
                <div className={styles['batch-scope-state']}>{stateText}</div>
                {errors[scope.index] ? <div className={styles['batch-scope-error']}>{errors[scope.index]}</div> : null}
              </div>
              <YakitButton
                size="small"
                disabled={disabled}
                loading={state === 'running'}
                onClick={() => runScope(scope.index)}
              >
                {state === 'failed' ? t('BatchScopeSelector.retry') : t('BatchScopeSelector.execute')}
              </YakitButton>
            </div>
          )
        })}
      </div>
      <div className={styles['batch-scope-footer']}>
        <YakitButton type="outline2" disabled={hasRunning} onClick={closeSafely}>
          {t('BatchScopeSelector.close')}
        </YakitButton>
      </div>
    </div>
  )
}
