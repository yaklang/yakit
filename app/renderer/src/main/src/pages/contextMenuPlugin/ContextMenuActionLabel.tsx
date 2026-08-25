import React from 'react'
import { IconSolidAIIcon, IconSolidAIWhiteIcon } from '@/assets/icon/colors'
import type { ContextMenuAction } from './types'

export const ContextMenuActionLabel: React.FC<{
  action: Pick<ContextMenuAction, 'IsAIPlugin'>
  label: React.ReactNode
}> = React.memo(({ action, label }) => (
  <>
    {action.IsAIPlugin ? (
      <>
        <IconSolidAIIcon className="ai-plugin-menu-icon-default" />
        <IconSolidAIWhiteIcon className="ai-plugin-menu-icon-hover" />
      </>
    ) : null}
    {label}
  </>
))
