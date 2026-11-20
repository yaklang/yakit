import type { FC } from 'react'
import { useRef, useState } from 'react'
import { Progress, Tooltip } from 'antd'
import classNames from 'classnames'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import YakitStripedProgress from '@/components/YakitStripedProgress/YakitStripedProgress'
import AIModelContextSettings from '../../components/AIModelContextSettings/AIModelContextSettings'
import type { AIModelContextSettingsRef } from '../../components/AIModelContextSettings/type'
import useAIModelContext from '../../useContext/useAIModelContext'
import { formatModelContextTokens, getModelContextUsage } from '../../utils/modelContextFormat'
import type { AIContextUsageProps } from './type'
import styles from './AIContextUsage.module.scss'

const usageColor = 'var(--Colors-Use-Main-Primary)'

const AIContextUsage: FC<AIContextUsageProps> = ({ className }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const [open, setOpen] = useState(false)
  const settingsRef = useRef<AIModelContextSettingsRef>(null)
  const onOpenChange = (next: boolean) => {
    if (!next) settingsRef.current?.save()
    setOpen(next)
  }
  const context = useAIModelContext('stream')
  const usage = getModelContextUsage(context.enabled, context.promptTokens, context.thresholdTokens)

  if (!usage) {
    if (open) setOpen(false)
    if (context.identityRetryAvailable) {
      return (
        <Tooltip title={context.error} trigger={['hover', 'focus']}>
          <YakitButton
            type="outline2"
            htmlType="button"
            data-ai-context-usage
            className={classNames(styles.badge, className)}
            onClick={(event) => {
              event.stopPropagation()
              context.retry()
            }}
          >
            {t('AIContextUsage.retryUsage')}
          </YakitButton>
        </Tooltip>
      )
    }
    return null
  }

  const { promptTokens, thresholdTokens, percent, remaining } = usage
  const usageRatio = promptTokens / thresholdTokens
  const alertColor =
    usageRatio >= 1
      ? 'var(--Colors-Use-Error-Primary)'
      : usageRatio >= 0.8
        ? 'var(--Colors-Use-Warning-Primary)'
        : undefined
  const percentText = `${percent}%`
  const label = t('AIContextUsage.label', { percent })

  return (
    <YakitPopover
      open={open}
      onOpenChange={onOpenChange}
      trigger="click"
      placement="top"
      arrow={false}
      destroyOnHidden
      classNames={{ root: styles.popoverRoot }}
      content={
        <div
          className={styles.panel}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            event.stopPropagation()
            if (event.key === 'Escape') onOpenChange(false)
          }}
        >
          <div className={styles.header}>
            <span>{t('AIContextUsage.title')}</span>
            <span>{t('AIContextUsage.usedPercent', { percent: percentText })}</span>
          </div>
          <div className={styles.usage}>
            <div className={styles.summary}>
              <span>
                {t('AIContextUsage.summary', {
                  used: formatModelContextTokens(promptTokens),
                  remaining: formatModelContextTokens(remaining),
                })}
              </span>
              <span className={styles.limit}>
                {t('AIContextUsage.limit', { threshold: formatModelContextTokens(thresholdTokens) })}
              </span>
            </div>
            <YakitStripedProgress
              percent={percent}
              color={usageColor}
              label={t('AIContextUsage.title')}
              valueText={percentText}
            />
          </div>
          <div className={styles.settings}>
            <AIModelContextSettings ref={settingsRef} source="stream" />
          </div>
        </div>
      }
    >
      <YakitButton
        type="outline2"
        htmlType="button"
        data-ai-context-usage
        className={classNames(styles.badge, className)}
        aria-label={label}
        aria-expanded={open}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key === 'Escape') onOpenChange(false)
        }}
      >
        <Progress
          type="circle"
          percent={Math.min(100, percent)}
          size={16}
          strokeWidth={12}
          showInfo={false}
          strokeColor={alertColor ?? usageColor}
          trailColor="var(--Colors-Use-Neutral-Border)"
          aria-label={label}
          aria-valuenow={Math.min(100, percent)}
          aria-valuetext={percentText}
        />
        <span className={styles.label} style={{ color: alertColor }} aria-hidden="true">
          {label}
        </span>
      </YakitButton>
    </YakitPopover>
  )
}

export default AIContextUsage
