import type React from 'react'
import { useControllableValue } from 'ahooks'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { AtomOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import styles from './AIRunModeSelect.module.scss'
import { AIRunModeMenu } from './AIRunModeMenu'
import { useAIRunMode } from './useAIRunMode'

interface AIRunModeSelectProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const AIRunModeSelect: React.FC<AIRunModeSelectProps> = (props) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const { selectedModes } = useAIRunMode()
  const [open, setOpen] = useControllableValue<boolean>(props, {
    defaultValue: false,
    valuePropName: 'open',
    trigger: 'onOpenChange',
  })

  return (
    <YakitPopover
      content={<AIRunModeMenu />}
      trigger="click"
      placement="topLeft"
      arrow={false}
      open={open}
      onOpenChange={setOpen}
      destroyOnHidden
      classNames={{ root: styles['mode-popover'] }}
    >
      <YakitButton
        type="text2"
        className={styles['run-mode-select']}
        isActive={selectedModes.length > 0}
        title={t('AIRunModeSelect.configuration')}
        aria-label={t('AIRunModeSelect.configuration')}
        aria-haspopup="dialog"
        aria-expanded={open}
        icon={<AtomOutlined size={16} color="currentColor" />}
        onClick={(event) => event.stopPropagation()}
      />
    </YakitPopover>
  )
}

export default AIRunModeSelect
