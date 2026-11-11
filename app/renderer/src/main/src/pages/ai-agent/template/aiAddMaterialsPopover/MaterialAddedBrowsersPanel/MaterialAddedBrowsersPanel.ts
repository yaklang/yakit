import { createElement } from 'react'
import type { FC } from 'react'
import { ChromeOutlined, TrashOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { BrowserInstanceCard } from '../../../browserInstances/BrowserInstancesPanel'
import { useBrowserInstances } from '../../../browserInstances/browserInstanceStore'
import type { AIBrowserInstance } from '../../../browserInstances/browserInstanceStore'
import MaterialListPanel from '../materialListPanel/MaterialListPanel'
import type { MaterialAddedBrowsersPanelProps } from './type'
import styles from './MaterialAddedBrowsersPanel.module.scss'

const MaterialAddedBrowsersPanel: FC<MaterialAddedBrowsersPanelProps> = ({ browsers, onRemove }) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const { instances } = useBrowserInstances()
  const cards = browsers.map((material) => {
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
    return createElement(BrowserInstanceCard, {
      key: material.mentionId,
      instance,
      variant: 'material',
      actions: createElement(YakitButton, {
        className: styles.remove,
        type: 'text2',
        size: 'small',
        icon: createElement(TrashOutlined, { size: 16, color: 'currentColor' }),
        'aria-label': `${t('YakitButton.delete')} ${material.mentionName || instance.name}`,
        disabled: material.lock,
        onClick: () => onRemove(material),
      }),
    })
  })

  return createElement(MaterialListPanel, {
    title: `${t('AIAddMaterialsPopover.addedBrowsers')} (${browsers.length})`,
    description: '',
    icon: createElement(ChromeOutlined, { size: 16, color: 'var(--Colors-Use-Neutral-Text-2-Primary)' }),
    variant: 'attachments',
    children: createElement(
      'div',
      { className: styles.list },
      cards.length ? cards : createElement('div', { className: styles.empty }, t('YakitEmpty.noData')),
    ),
  })
}

export default MaterialAddedBrowsersPanel
