import type { FC } from 'react'
import { useMemo } from 'react'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import type { MCPToolConfig } from '@/pages/ai-agent/type/aiMCP'
import { resolveMCPToolDescriptionLabel } from '@/pages/ai-agent/aiMCP/utils'
import useAINodeLabel from '@/pages/ai-re-act/hooks/useAINodeLabel'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import classNames from 'classnames'
import styles from './YakMcpSettings.module.scss'

interface AIMCPToolDetailPopoverProps {
  item: MCPToolConfig
}

export const AIMCPToolDetailPopover: FC<AIMCPToolDetailPopoverProps> = (props) => {
  const { item } = props
  const { t, i18nRefresh } = useI18nNamespaces(['utils'])
  const { getLabelByParams } = useAINodeLabel()
  const description = useMemo(
    () => resolveMCPToolDescriptionLabel(item, getLabelByParams),
    [item, getLabelByParams, i18nRefresh],
  )

  return (
    <div className={styles['mcp-tool-detail-popover']}>
      <div className={styles['detail-title']}>{item.ToolName}</div>
      <div className={styles['detail-description']}>{description}</div>
      {item.Params && item.Params.length > 0 && (
        <div className={styles['param-section']}>
          <div className={styles['param-section-title']}>{t('ConfigSystemMcp.parameters_title')}</div>
          <div className={styles['param-list']}>
            {item.Params.map((p) => (
              <div key={p.Name} className={styles['param-item']}>
                <div
                  className={classNames(styles['param-item-header'], {
                    [styles['param-item-required']]: p.Required,
                  })}
                >
                  <span>{p.Name}</span>
                  <YakitTag color="green">{p.Type}</YakitTag>
                </div>
                <div className={styles['param-description']}>{p.Description}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
