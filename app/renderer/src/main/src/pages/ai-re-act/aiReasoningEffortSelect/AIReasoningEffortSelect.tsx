import type { FC } from 'react'
import { useId } from 'react'
import type { AIReasoningEffortSelectProps } from './type'
import { ExclamationOutlined, InformationCircleOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import YakitSolidLoading from '@/components/yakitUI/YakitSolidLoading/YakitSolidLoading'
import classNames from 'classnames'
import { Tooltip } from 'antd'
import {
  buildReasoningEffortOptions,
  normalizeReasoningEffort,
} from '@/pages/ai-agent/aiModelList/aiModelForm/reasoningEffort'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { JSONParseLog } from '@/utils/tool'
import styles from './AIReasoningEffortSelect.module.scss'

const getProbeErrorMessage = (message: string) => {
  const result: { error?: { message?: unknown } } | undefined = JSONParseLog(message, {
    page: 'AIReasoningEffortSelect',
    fun: 'getProbeErrorMessage',
    throwOnError: false,
  })
  const detail = result?.error?.message
  return typeof detail === 'string' ? detail : message
}

export const AIReasoningEffortSelect: FC<AIReasoningEffortSelectProps> = ({
  className,
  model,
  disabled: disabledProp,
  probing,
  probeResponse,
  onChange,
}) => {
  const { t } = useI18nNamespaces(['aiAgent', 'configNetwork'])
  const titleId = useId()
  const disabled = disabledProp || !model
  const effortValue = normalizeReasoningEffort(model?.Provider.ReasoningEffort)
  const effortOptions = buildReasoningEffortOptions(
    t,
    model?.ProbedExtendedEfforts,
    model?.ProbedExtendedEfforts ? undefined : effortValue,
  )
  const compactLabels: Partial<Record<string, string>> = {
    'no-set': t('AIReasoningEffort.effortDefault'),
    low: t('AIReasoningEffort.effortLow'),
    max: t('AIReasoningEffort.effortMax'),
  }
  const probeErrors =
    !probing && probeResponse
      ? [
          {
            label: t('ConfigNetworkPage.effortMax'),
            supported: probeResponse.MaxSupported,
            message: probeResponse.MaxErrorMessage,
          },
          {
            label: t('ConfigNetworkPage.effortXhigh'),
            supported: probeResponse.XhighSupported,
            message: probeResponse.XhighErrorMessage,
          },
        ].filter(({ supported }) => supported === false)
      : []

  const onEffortSelect = (value: string) => {
    if (disabled || value === effortValue) return
    // no-set 不落库（undefined），与模型表单 formValueToAIConfigProvider 保存语义一致
    onChange((m) => ({
      ...m,
      Provider: { ...m.Provider, ReasoningEffort: value === 'no-set' ? undefined : value },
    }))
  }

  return (
    <div
      className={classNames(styles['reasoning-effort-select'], className)}
      onClick={(event) => event.stopPropagation()}
    >
      <div className={styles['effort-heading']}>
        <span id={titleId}>{t('AIReasoningEffort.selectQuality')}</span>
        <Tooltip title={t('AIReasoningEffort.tooltip')}>
          <InformationCircleOutlined className={styles['effort-info-icon']} size={12} color="currentColor" />
        </Tooltip>
        {probing && <YakitSolidLoading inline size={12} aria-label={t('AIReasoningEffort.probing')} />}
        {probeErrors.length > 0 && (
          <Tooltip
            classNames={{ root: styles['effort-error-tooltip'] }}
            title={
              <div className={styles['effort-error-details']}>
                {probeErrors.map(({ label, message }) => (
                  <div key={label}>
                    <strong>{label}</strong>
                    <div>{message ? getProbeErrorMessage(message) : t('AIReasoningEffort.probeUnsupported')}</div>
                  </div>
                ))}
              </div>
            }
            destroyOnHidden
          >
            <YakitTag className={styles['effort-error-tag']} size="small" color="serious" fullRadius border={false}>
              <ExclamationOutlined size={12} color="currentColor" />
              Error
            </YakitTag>
          </Tooltip>
        )}
      </div>
      <div className={styles['effort-options']} role="group" aria-labelledby={titleId}>
        {effortOptions.map((item) => {
          const value = String(item.value)
          return (
            <YakitButton
              key={value}
              className={styles['effort-pill']}
              type={effortValue === value ? 'primary' : 'secondary2'}
              size="small"
              radius="9999px"
              aria-pressed={effortValue === value}
              disabled={disabled}
              onClick={() => onEffortSelect(value)}
            >
              {compactLabels[value] ?? item.label}
            </YakitButton>
          )
        })}
      </div>
    </div>
  )
}
