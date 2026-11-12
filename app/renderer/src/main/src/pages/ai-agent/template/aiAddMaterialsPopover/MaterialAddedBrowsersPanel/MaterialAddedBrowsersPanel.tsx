import type { FC } from 'react'
import { ChromeOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import BrowserMaterialList from '../../../browserInstances/BrowserMaterialList/BrowserMaterialList'
import { useBrowserInstances } from '../../../browserInstances/browserInstanceStore'
import type { AIBrowserInstance } from '../../../browserInstances/browserInstanceStore'
import MaterialListPanel from '../materialListPanel/MaterialListPanel'
import type { MaterialAddedBrowsersPanelProps } from './type'
import styles from './MaterialAddedBrowsersPanel.module.scss'

const MaterialAddedBrowsersPanel: FC<MaterialAddedBrowsersPanelProps> = ({ browsers, onRemove }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const { instances } = useBrowserInstances()
  const instancesById = new Map(instances.map((instance) => [instance.id, instance]))
  const materialsById = new Map(browsers.map((material) => [material.mentionId, material]))
  const items = Array.from(materialsById.values(), (material) => {
    const instance: AIBrowserInstance = instancesById.get(material.mentionId) ?? {
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
    return {
      instance,
      removal: { name: material.mentionName || instance.name, disabled: material.lock },
    }
  })

  return (
    <MaterialListPanel
      title={`${t('AIAddMaterialsPopover.addedBrowsers')} (${browsers.length})`}
      description=""
      icon={<ChromeOutlined size={16} color="var(--Colors-Use-Neutral-Text-2-Primary)" />}
      variant="attachments"
    >
      <div className={styles.list}>
        <BrowserMaterialList
          items={items}
          onRemove={(id) => {
            const material = materialsById.get(id)
            if (material) onRemove(material)
          }}
        />
      </div>
    </MaterialListPanel>
  )
}

export default MaterialAddedBrowsersPanel
