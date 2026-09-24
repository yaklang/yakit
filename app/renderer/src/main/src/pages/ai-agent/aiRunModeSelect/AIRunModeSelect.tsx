import type React from 'react'
import { memo, useState } from 'react'
import { Dropdown } from 'antd'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { ChevronDownOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { useCreation } from 'ahooks'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from './AIRunModeSelect.module.scss'
import { AIRunModeMenu } from './AIRunModeMenu'
import { useAIRunMode } from './useAIRunMode'
import { Grid2x2CheckOutlined, MODE_LABEL_KEY, OutlineViewGridIcon } from './aiRunModeConstants'

const AIRunModeSelect: React.FC = memo(() => {
  const { selectedModes } = useAIRunMode()
  const { t, i18nRefresh } = useI18nNamespaces(['aiAgent'])
  const [modeVisible, setModeVisible] = useState(false)

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

  return (
    <Dropdown
      trigger={['click']}
      open={modeVisible}
      onOpenChange={setModeVisible}
      rootClassName={styles['mode-dropdown']}
      popupRender={() => <AIRunModeMenu />}
    >
      <YakitButton
        type="outline2"
        radius="28px"
        isHover={modeVisible}
        icon={<TriggerIcon />}
        onClick={(e) => e.stopPropagation()}
        className={styles['mode-btn']}
        title={triggerDisplay.label}
      >
        <span className={styles['mode-btn-label']}>{triggerDisplay.label}</span>
        <ChevronDownOutlined className={styles['mode-btn-arrow']} color="currentColor" />
      </YakitButton>
    </Dropdown>
  )
})

export default AIRunModeSelect
