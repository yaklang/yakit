import type React from 'react'
import { Tooltip } from 'antd'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import {
  ArrowsTransferDownOutlined,
  ArrowsTransferUpOutlined,
  ArrowsUpDownOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import type { AISkillSortButtonProps } from './type'

export const AISkillSortButton: React.FC<AISkillSortButtonProps> = ({ sortOrder, onChange }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const title = t(
    {
      asc: 'AISkillLoadingPane.sortByTokensAscending',
      desc: 'AISkillLoadingPane.sortByTokensDescending',
      default: 'AISkillLoadingPane.sortByTokens',
    }[sortOrder || 'default'],
  )
  const renderSortIcon = () => {
    switch (sortOrder) {
      case 'asc':
        return <ArrowsTransferUpOutlined style={{ color: 'var(--Colors-Use-Main-Primary)' }} />
      case 'desc':
        return <ArrowsTransferDownOutlined style={{ color: 'var(--Colors-Use-Main-Primary)' }} />
      default:
        return <ArrowsUpDownOutlined style={{ color: 'var(--Colors-Use-Neutral-Text-4-Help-text)' }} />
    }
  }
  return (
    <Tooltip title={title}>
      <YakitButton
        type="text2"
        aria-label={title}
        icon={renderSortIcon()}
        onClick={() => onChange(sortOrder === undefined ? 'asc' : sortOrder === 'asc' ? 'desc' : undefined)}
      />
    </Tooltip>
  )
}
