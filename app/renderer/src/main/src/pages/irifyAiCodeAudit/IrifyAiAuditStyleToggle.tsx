import React from 'react'
import classNames from 'classnames'
import { IrifyAiCodeAuditStyle, normalizeIrifyAuditStyleForSidebar } from '@/constants/focusMode'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from './IrifyAiAuditStyleToggle.module.scss'

export interface IrifyAiAuditStyleToggleProps {
  value: IrifyAiCodeAuditStyle
  onChange: (style: 'code' | 'skill') => void
  locked?: boolean
  className?: string
}

/** 右侧 AI 侧边栏 focus：仅代码审计 / 技能审计（unset 默认展示为 code） */
export const IrifyAiAuditStyleToggle: React.FC<IrifyAiAuditStyleToggleProps> = (props) => {
  const { value, onChange, locked = false, className } = props
  const { t } = useI18nNamespaces(['irifyAiCodeAudit'])
  const activeStyle = normalizeIrifyAuditStyleForSidebar(value)

  return (
    <div className={classNames(styles['audit-style-toggle'], { [styles['locked']]: locked }, className)}>
      <div
        className={classNames(styles['toggle-item'], { [styles['toggle-item-active']]: activeStyle === 'code' })}
        onClick={() => !locked && onChange('code')}
      >
        {t('styleToggle.code')}
      </div>
      <div
        className={classNames(styles['toggle-item'], { [styles['toggle-item-active']]: activeStyle === 'skill' })}
        onClick={() => !locked && onChange('skill')}
      >
        {t('styleToggle.skill')}
      </div>
    </div>
  )
}
