import { useState } from 'react'
import type { FC } from 'react'
import { ChromeOutlined, TrashOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { BrowserInstanceCard } from '../../../browserInstances/BrowserInstancesPanel'
import { useBrowserInstances } from '../../../browserInstances/browserInstanceStore'
import type { AIBrowserInstance } from '../../../browserInstances/browserInstanceStore'
import MaterialListPanel from '../materialListPanel/MaterialListPanel'
import type { MaterialBrowserListProps } from './type'
import styles from './MaterialBrowserList.module.scss'

const MaterialBrowserList: FC<MaterialBrowserListProps> = ({ browsers, onRemove }) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const [search, setSearch] = useState('')
  const { instances } = useBrowserInstances()
  const query = search.trim().toLowerCase()
  const rows = browsers.map((material) => {
    const instance: AIBrowserInstance = instances.find((item) => item.id === material.mentionId) ?? {
      id: material.mentionId,
      installationId: '',
      name: material.mentionName || material.mentionId,
      client: '',
      clientVersion: '',
      origin: '',
      createdAt: 0,
      lastSeenAt: 0,
      online: false,
      running: false,
    }
    return { material, instance }
  })
  const visibleRows = rows.filter(({ material, instance }) =>
    [material.mentionName, instance.name, instance.identity, instance.tab?.title, instance.tab?.url].some((value) =>
      value?.toLowerCase().includes(query),
    ),
  )

  return (
    <MaterialListPanel
      title={`${t('AIAddMaterialsPopover.addedBrowsers')} (${browsers.length})`}
      description=""
      icon={<ChromeOutlined size={16} color="var(--Colors-Use-Neutral-Text-2-Primary)" />}
      search={search}
      onSearchChange={setSearch}
      variant="attachments"
    >
      <div className={styles.list}>
        {visibleRows.map(({ material, instance }) => (
          <BrowserInstanceCard
            key={material.mentionId}
            instance={instance}
            variant="material"
            actions={
              <YakitButton
                className={styles.remove}
                type="text2"
                size="small"
                icon={<TrashOutlined size={16} color="currentColor" />}
                aria-label={`${t('YakitButton.delete')} ${material.mentionName || instance.name}`}
                disabled={material.lock}
                onClick={() => onRemove(material)}
              />
            }
          />
        ))}
        {!visibleRows.length && <div className={styles.empty}>{t('YakitEmpty.noData')}</div>}
      </div>
    </MaterialListPanel>
  )
}

export default MaterialBrowserList
