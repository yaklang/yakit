import { useState } from 'react'
import type { FC } from 'react'
import { useRequest } from 'ahooks'
import { Tooltip } from 'antd'
import classNames from 'classnames'
import { BoxOutlined, QuestionMarkCircleOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { grpcQueryAIFocus } from '@/pages/ai-agent/grpc'
import { sceneMentionRow } from '@/pages/ai-agent/components/aiChatMention/mentionListData'
import { AIChatSelect } from '../aiReviewRuleSelect/AIReviewRuleSelect'
import selectStyles from '../aiReviewRuleSelect/AIReviewRuleSelect.module.scss'
import type { AIFocusModeOption, AIFocusModeProps } from './type'
import styles from './AIFocusMode.module.scss'

export const AIFocusMode: FC<AIFocusModeProps> = ({
  value,
  onChange,
  className,
  disabled,
  iconOnly,
  options,
  allowClear = true,
}) => {
  const { t, i18n } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const [open, setOpen] = useState(false)
  const canClear = allowClear && !!value && !disabled
  const { data, loading } = useRequest(() => grpcQueryAIFocus(undefined, true), {
    ready: options === undefined && (open || !!value),
  })
  const isChinese = i18n.language === 'zh' || i18n.language === 'zh-TW'
  const sceneOptions: AIFocusModeOption[] =
    options ??
    (data?.Data ?? []).map((item) => {
      const { row } = sceneMentionRow(item, isChinese)
      return { value: item.Name, label: row.name ?? item.Name, description: row.description }
    })
  const heading = t('AiAgengt.focusMode')
  const renderLabel = (label: string) => (
    <span className={selectStyles['select-option']} title={iconOnly ? label : undefined}>
      <BoxOutlined
        size={16}
        color="var(--Colors-Use-Neutral-Text-2-Primary)"
        className={selectStyles['select-icon-wrapper']}
      />
      {!iconOnly && (
        <span className={styles.label} title={label}>
          {label}
        </span>
      )}
    </span>
  )

  return (
    <div
      className={className}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <AIChatSelect
        aria-label={heading}
        className={classNames(styles.trigger, { [styles['with-clear']]: canClear && !iconOnly })}
        variant="borderless"
        open={open && !disabled}
        setOpen={setOpen}
        onOpenChange={setOpen}
        onInputKeyDown={(event) => {
          if (!open && (event.key === 'Enter' || event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault()
            setOpen(true)
          }
        }}
        disabled={disabled}
        loading={loading}
        value={value}
        placeholder={renderLabel(heading)}
        optionLabelProp="label"
        labelRender={({ label, value }) => renderLabel(String(label ?? value))}
        allowClear={canClear}
        onChange={(next: string | undefined) => {
          onChange(next)
          setOpen(false)
        }}
        dropdownRender={(menu) => (
          <div className={selectStyles['drop-select-wrapper']}>
            <div className={selectStyles['select-title']}>
              <BoxOutlined />
              {heading}
              <Tooltip title={t('AIFocusMode.focusModeTooltip')}>
                <QuestionMarkCircleOutlined />
              </Tooltip>
            </div>
            {menu}
          </div>
        )}
      >
        {sceneOptions.map(({ value, label, description }) => (
          <YakitSelect.Option key={value} value={value} label={label}>
            <Tooltip title={description || t('YakitEmpty.noDescription')} placement="right">
              <div>{label}</div>
            </Tooltip>
          </YakitSelect.Option>
        ))}
      </AIChatSelect>
    </div>
  )
}
