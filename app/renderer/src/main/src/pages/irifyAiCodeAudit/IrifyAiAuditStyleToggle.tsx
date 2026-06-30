import React from 'react'
import classNames from 'classnames'
import { IrifyAiCodeAuditStyle } from '@/constants/focusMode'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from './IrifyAiAuditStyleToggle.module.scss'

export interface IrifyAiAuditStyleToggleProps {
  /** 当前风格（受控） */
  value: IrifyAiCodeAuditStyle
  /** 切换风格 */
  onChange: (style: IrifyAiCodeAuditStyle) => void
  /** 审计开始后锁定，禁止切换 */
  locked?: boolean
  className?: string
}

/**
 * 右侧 AI 输入框「代码审计 / Skill」二选一切换。
 *
 * - 未开始（locked=false）时允许在 code / skill 间切换
 * - 开始后（locked=true）锁定为当前值，禁止切换
 */
export const IrifyAiAuditStyleToggle: React.FC<IrifyAiAuditStyleToggleProps> = (props) => {
  const { value, onChange, locked = false, className } = props
  const { t } = useI18nNamespaces(['irifyAiCodeAudit'])

  return (
    <div className={classNames(styles['audit-style-toggle'], { [styles['locked']]: locked }, className)}>
      <div
        className={classNames(styles['toggle-item'], { [styles['toggle-item-active']]: value === 'code' })}
        onClick={() => !locked && onChange('code')}
      >
        {t('styleToggle.code')}
      </div>
      <div
        className={classNames(styles['toggle-item'], { [styles['toggle-item-active']]: value === 'skill' })}
        onClick={() => !locked && onChange('skill')}
      >
        {t('styleToggle.skill')}
      </div>
    </div>
  )
}
