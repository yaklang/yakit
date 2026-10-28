import type React from 'react'
import { useMemo, useRef, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { yakitNotify } from '@/utils/notification'
import { buildBatchScopes, type BatchScope } from './batchScope'
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
        const message = `范围 ${scope.start}-${scope.end} 仅更新 ${updatedCount}/${scope.count} 条。为避免重复处理已成功记录，本范围已停止自动重试。`
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
      yakitNotify('error', `数据刷新失败，请手动刷新列表：${String(error)}`)
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
        共 {total} 条数据。每个范围最多 1000 条，完成后弹窗会继续保留。
      </div>
      <div className={styles['batch-scope-list']}>
        {scopes.map((scope) => {
          const state = states[scope.index] || 'pending'
          const disabled = hasRunning || state === 'success' || state === 'partial'
          const stateText =
            state === 'running'
              ? '执行中'
              : state === 'success'
                ? '已完成'
                : state === 'failed'
                  ? '失败，可重试'
                  : state === 'partial'
                    ? '部分更新，请核对'
                    : '未执行'
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
                {state === 'failed' ? '重试' : '执行'}
              </YakitButton>
            </div>
          )
        })}
      </div>
      <div className={styles['batch-scope-footer']}>
        <YakitButton type="outline2" disabled={hasRunning} onClick={closeSafely}>
          完成/关闭
        </YakitButton>
      </div>
    </div>
  )
}
