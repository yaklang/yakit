import type React from 'react'
import { memo, useState } from 'react'
import { useCreation, useMemoizedFn } from 'ahooks'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { AIChatSelect } from '@/pages/ai-re-act/aiReviewRuleSelect/AIReviewRuleSelect'
import styles from './AIRunModeSelect.module.scss'
import { AIRunModeMenu } from './AIRunModeMenu'
import { useAIRunMode } from './useAIRunMode'
import { Grid2x2CheckOutlined, MODE_LABEL_KEY, OutlineViewGridIcon } from './aiRunModeConstants'

const AIRunModeSelect: React.FC = memo(() => {
  const { selectedModes } = useAIRunMode()
  const { t, i18nRefresh } = useI18nNamespaces(['aiAgent'])
  const [open, setOpen] = useState(false)

  const triggerDisplay = useCreation(() => {
    const count = selectedModes.length
    if (count === 0) {
      return { Icon: OutlineViewGridIcon, label: t('AIRunModeSelect.mode') }
    }
    if (count === 1) {
      const labelKey = MODE_LABEL_KEY[selectedModes[0].key]
      return { Icon: selectedModes[0].icon, label: labelKey ? t(labelKey) : selectedModes[0].label }
    }
    return { Icon: Grid2x2CheckOutlined, label: t('AIRunModeSelect.multiMode') }
  }, [selectedModes, i18nRefresh])

  const TriggerIcon = triggerDisplay.Icon

  const onSetOpen = useMemoizedFn((v: boolean) => {
    setOpen(v)
  })

  /** 与 AIReasoningEffortSelect 收起态 pill 结构一致：图标 + 文案 */
  const renderPill = useMemoizedFn(() => (
    <div className={styles['select-option']}>
      <TriggerIcon className={styles['icon-wrapper']} color="currentColor" />
      <span className={styles['select-option-text']}>{triggerDisplay.label}</span>
    </div>
  ))

  return (
    <div className={styles['run-mode-select']} title={triggerDisplay.label}>
      <AIChatSelect
        dropdownRender={() => <AIRunModeMenu />}
        value="mode"
        optionLabelProp="label"
        open={open}
        setOpen={onSetOpen}
        dropdownClassName={styles['mode-dropdown']}
      >
        <YakitSelect.Option key="mode" value="mode" label={renderPill()}>
          {triggerDisplay.label}
        </YakitSelect.Option>
      </AIChatSelect>
    </div>
  )
})

export default AIRunModeSelect
