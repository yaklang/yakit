import { useState } from 'react'
import { ChevronDownOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitDropdownMenu } from '@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu'
import type { YakitMenuItemType } from '@/components/yakitUI/YakitMenu/YakitMenu'

export type RiskBatchAction = 'modify-mark' | 'export-csv' | 'export-html' | 'delete'

interface RiskBatchOperationsMenuProps {
  selectedCount: number
  isEnterprise: boolean
  onAction: (action: RiskBatchAction) => void
}

export const RiskBatchOperationsMenu: React.FC<RiskBatchOperationsMenuProps> = ({
  selectedCount,
  isEnterprise,
  onAction,
}) => {
  const { t } = useI18nNamespaces(['risk', 'yakitUi'])
  const contextKey = `${selectedCount}:${isEnterprise}`
  const [dropdownState, setDropdownState] = useState({ contextKey, open: false })
  if (dropdownState.contextKey !== contextKey) {
    setDropdownState({ contextKey, open: false })
  }
  const open = dropdownState.contextKey === contextKey && dropdownState.open

  const menuData: YakitMenuItemType[] = [
    ...(isEnterprise
      ? [
          {
            key: 'modify-mark',
            label: t('YakitRiskTable.batch_modify_mark'),
          } satisfies YakitMenuItemType,
        ]
      : []),
    {
      key: 'export-csv',
      label: t('YakitRiskTable.export_csv'),
    },
    {
      key: 'export-html',
      label: t('YakitRiskTable.export_html'),
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      label: t('YakitRiskTable.delete_selected_risks'),
      type: 'danger',
    },
  ]

  const handleAction = (action: RiskBatchAction) => {
    setDropdownState({ contextKey, open: false })
    if (selectedCount === 0 || (action === 'modify-mark' && !isEnterprise)) return
    onAction(action)
  }

  return (
    <YakitDropdownMenu
      menu={{
        data: menuData,
        onClick: ({ key }) => handleAction(key as RiskBatchAction),
      }}
      dropdown={{
        trigger: ['click'],
        placement: 'bottomLeft',
        open,
        onOpenChange: (nextOpen) => setDropdownState({ contextKey, open: nextOpen }),
        disabled: selectedCount === 0,
      }}
    >
      <YakitButton type="outline2" disabled={selectedCount === 0}>
        {t('YakitButton.batchOperation')}
        <ChevronDownOutlined color="currentColor" />
      </YakitButton>
    </YakitDropdownMenu>
  )
}
