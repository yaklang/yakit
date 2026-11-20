import type { FC } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useKeyPress } from 'ahooks'
import { ArrowUpRightOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { AIAddMaterialsPopoverProps, MaterialCategory, MaterialMenuItem, MaterialShortcut } from '../type'
import styles from '../AIAddMaterialsPopover.module.scss'

interface MaterialMenuProps {
  items: MaterialMenuItem[]
  filterMode?: AIAddMaterialsPopoverProps['filterMode']
  onOpenCategory: (category: MaterialCategory) => void
  onShortcut: (shortcut: MaterialShortcut) => void
}

const shortcuts = [
  { symbol: '@', label: 'AIAddMaterialsPopover.mentionShortcut' },
  { symbol: '/', label: 'AIAddMaterialsPopover.modeShortcut' },
] as const

const MaterialMenu: FC<MaterialMenuProps> = ({ items, filterMode, onOpenCategory, onShortcut }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const shortcutsLabel = t('AIAddMaterialsPopover.shortcuts')
  const materialsLabel = t('AIChatTextarea.addMaterials')
  const menuRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const visibleItems = items.filter(({ tab }) => !tab || !filterMode?.includes(tab))

  useEffect(() => {
    menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()
  }, [])

  const handleMenuKeyPress = (event: KeyboardEvent) => {
    if (event.isComposing) return
    const buttons = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
    if (!buttons?.length) return
    event.preventDefault()
    event.stopPropagation()
    if (event.key === 'Enter') {
      buttons[activeIndex]?.click()
      return
    }
    const step = event.key === 'ArrowDown' ? 1 : -1
    const nextIndex = (activeIndex + step + buttons.length) % buttons.length
    buttons[nextIndex].focus()
    buttons[nextIndex].scrollIntoView({ block: 'nearest' })
  }

  useKeyPress(['uparrow', 'downarrow', 'enter'], handleMenuKeyPress, {
    target: menuRef,
    exactMatch: true,
    useCapture: true,
  })

  return (
    <div ref={menuRef} role="menu" aria-label={materialsLabel}>
      <div role="group" aria-label={shortcutsLabel} className={styles['shortcut-group']}>
        <header className={`${styles.header} ${styles['menu-header']}`}>
          <span className={styles['title']}>{shortcutsLabel}</span>
        </header>
        {shortcuts.map(({ symbol, label }, index) => (
          <YakitButton
            type="text2"
            key={symbol}
            role="menuitem"
            tabIndex={index === activeIndex ? 0 : -1}
            className={styles.item}
            onFocus={() => setActiveIndex(index)}
            onClick={() => onShortcut(symbol)}
          >
            <span className={styles['shortcut-symbol']} aria-hidden="true">
              {symbol}
            </span>
            <span className={styles['item-title']}>{t(label)}</span>
          </YakitButton>
        ))}
      </div>
      <div role="group" aria-label={materialsLabel} className={styles.menu}>
        <header className={`${styles.header} ${styles['menu-header']}`}>
          <span className={styles['title']}>{materialsLabel}</span>
          <span className={styles['description']}>{t('AIAddMaterialsPopover.contextHint')}</span>
        </header>
        {visibleItems.map(({ label, description, icon, action, external, category }, index) => (
          <YakitButton
            type="text2"
            key={label}
            role="menuitem"
            tabIndex={index + shortcuts.length === activeIndex ? 0 : -1}
            aria-haspopup={category ? 'dialog' : undefined}
            className={styles['item']}
            onFocus={() => setActiveIndex(index + shortcuts.length)}
            onClick={action ?? (() => category && onOpenCategory(category))}
          >
            <span className={styles['icon']} aria-hidden="true">
              {icon}
            </span>
            <span className={styles['item-title']}>{label}</span>
            <span className={styles['description']}>{description}</span>
            {external && <ArrowUpRightOutlined size={16} className={styles['external']} />}
          </YakitButton>
        ))}
      </div>
    </div>
  )
}

export default MaterialMenu
