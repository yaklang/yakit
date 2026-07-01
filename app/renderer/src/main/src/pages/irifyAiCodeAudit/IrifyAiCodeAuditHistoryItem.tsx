import React from 'react'
import classNames from 'classnames'
import { OutlineAIIcon, OutlineQuestionmarkcircleIcon } from '@/assets/icon/outline'
import { PublicAIAuditCodeIcon } from '@/routes/publicIcon'
import { IrifyAiCodeAuditStyle } from '@/constants/focusMode'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { YakRunnerHistoryProps } from './YakRunnerIrifyAiCodeAuditType'
import styles from './IrifyAiCodeAuditHistoryItem.module.scss'

export interface IrifyAiCodeAuditHistoryItemProps {
  item: YakRunnerHistoryProps
  active?: boolean
  onClick?: () => void
  className?: string
}

const resolveHistoryStyle = (style?: IrifyAiCodeAuditStyle): IrifyAiCodeAuditStyle => style ?? 'unset'

/** 历史目录行：风格 logo + 名称 + path */
export const IrifyAiCodeAuditHistoryItem: React.FC<IrifyAiCodeAuditHistoryItemProps> = (props) => {
  const { item, active, onClick, className } = props
  const { t } = useI18nNamespaces(['irifyAiCodeAudit'])
  const style = resolveHistoryStyle(item.auditStyle)

  return (
    <div
      className={classNames(styles['history-item'], { [styles['history-item-active']]: active }, className)}
      onClick={onClick}
    >
      <div className={styles['history-item-main']}>
        {!item.isFile && (
          <span
            className={classNames(styles['style-badge'], {
              [styles['style-badge-skill']]: style === 'skill',
              [styles['style-badge-code']]: style === 'code',
              [styles['style-badge-unset']]: style === 'unset',
            })}
          >
            <span className={styles['style-badge-icon']}>
              {style === 'skill' ? (
                <OutlineAIIcon />
              ) : style === 'code' ? (
                <PublicAIAuditCodeIcon />
              ) : (
                <OutlineQuestionmarkcircleIcon />
              )}
            </span>
            <span className={styles['style-badge-label']}>
              {style === 'skill'
                ? t('styleToggle.skill')
                : style === 'code'
                  ? t('styleToggle.code')
                  : t('styleToggle.unset')}
            </span>
          </span>
        )}
        <div className={styles['history-item-name']}>{item.name}</div>
      </div>
      <div className={classNames(styles['history-item-path'], 'yakit-single-line-ellipsis')}>{item.path}</div>
    </div>
  )
}
