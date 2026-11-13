import type { FC } from 'react'
import { useState } from 'react'
import type { AIReasoningEffortSelectProps } from './type'
import {
  CheckOutlined,
  ChevronRightOutlined,
  ExclamationOutlined,
  InformationCircleOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
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
  // configNetwork 命名空间：选项文案（ConfigNetworkPage.effortDefault/effortLow 等）与表单共用
  const { t } = useI18nNamespaces(['aiAgent', 'configNetwork'])
  const disabled = disabledProp || !model
  const effortValue = normalizeReasoningEffort(model?.Provider.ReasoningEffort)
  const effortOptions = buildReasoningEffortOptions(t, model?.ProbedExtendedEfforts, effortValue)
  const effortLabel = String(effortOptions.find((item) => item.value === effortValue)?.label || effortValue).replace(
    /（[^）]*）|\([^)]*\)/g,
    '',
  )
  const menuOptions = model?.ProbedExtendedEfforts
    ? buildReasoningEffortOptions(t, model.ProbedExtendedEfforts)
    : effortOptions
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

  const [requestedOpen, setOpen] = useState(false)
  const open = requestedOpen && !disabled

  const onSetOpen = (value: boolean) => {
    if (!value || !disabled) setOpen(value)
  }

  const onEffortSelect = (value: string) => {
    if (disabled) return
    setOpen(false)
    // no-set 不落库（undefined），与模型表单 formValueToAIConfigProvider 保存语义一致
    onChange((m) => ({
      ...m,
      Provider: { ...m.Provider, ReasoningEffort: value === 'no-set' ? undefined : value },
    }))
  }

  return (
    <div
      className={classNames(styles['reasoning-effort-select'], className, {
        [styles['reasoning-effort-select-open']]: open,
      })}
      onClick={(event) => event.stopPropagation()}
    >
      <YakitPopover
        arrow={false}
        placement="rightTop"
        trigger="click"
        open={open}
        onOpenChange={onSetOpen}
        getPopupContainer={(trigger) => trigger.ownerDocument.body}
        classNames={{ root: styles['effort-popover'] }}
        content={
          <div
            className={styles['effort-menu']}
            data-ai-reasoning-effort-menu
            role="menu"
            aria-label={t('AIReasoningEffort.selectQuality')}
          >
            {menuOptions.map((item) => (
              <div
                key={item.value}
                className={styles['effort-option']}
                role="menuitemradio"
                aria-checked={effortValue === item.value}
                onClick={() => onEffortSelect(String(item.value))}
              >
                <span>{item.label}</span>
                {effortValue === item.value && <CheckOutlined size={16} color="currentColor" />}
              </div>
            ))}
          </div>
        }
      >
        <div
          className={styles['effort-trigger']}
          role="button"
          aria-disabled={disabled}
          aria-label={t('AIReasoningEffort.selectQuality')}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span className={styles['effort-title']}>
            {t('AIReasoningEffort.selectQuality')}
            <Tooltip title={t('AIReasoningEffort.tooltip')}>
              <InformationCircleOutlined size={12} color="currentColor" />
            </Tooltip>
          </span>
          <span className={styles['effort-value']}>
            {probing && <YakitSolidLoading inline size={12} />}
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
                <YakitTag
                  className={styles['effort-error-tag']}
                  size="small"
                  color="serious"
                  fullRadius
                  border={false}
                  onClick={(event) => event.stopPropagation()}
                >
                  <ExclamationOutlined size={14} color="currentColor" />
                  Error
                </YakitTag>
              </Tooltip>
            )}
            {effortLabel}
            <ChevronRightOutlined size={12} color="currentColor" />
          </span>
        </div>
      </YakitPopover>
    </div>
  )
}
