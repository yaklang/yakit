import type { FC } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useKeyPress } from 'ahooks'
import { ArrowUpRightOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { AIAddMaterialsPopoverProps, MaterialCategory, MaterialMenuItem } from '../type'
import styles from '../AIAddMaterialsPopover.module.scss'

interface MaterialMenuProps {
  items: MaterialMenuItem[]
  filterMode?: AIAddMaterialsPopoverProps['filterMode']
  onOpenCategory: (category: MaterialCategory) => void
}

const MaterialMenu: FC<MaterialMenuProps> = ({ items, filterMode, onOpenCategory }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
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
    <>
      <header className={`${styles.header} ${styles['menu-header']}`}>
        <span className={styles['title']}>{t('AIChatTextarea.addMaterials')}</span>
        <span className={styles['description']}>{t('AIAddMaterialsPopover.contextHint')}</span>
      </header>
      <div ref={menuRef} role="menu" aria-label={t('AIChatTextarea.addMaterials')} className={styles.menu}>
        {visibleItems.map(({ label, description, icon, action, external, current, category }, index) => (
          <YakitButton
            type="text2"
            key={label}
            role="menuitem"
            tabIndex={index === activeIndex ? 0 : -1}
            aria-haspopup={category ? 'dialog' : undefined}
            className={styles['item']}
            onFocus={() => setActiveIndex(index)}
            onClick={action ?? (() => category && onOpenCategory(category))}
          >
            <span className={styles['icon']} aria-hidden="true">
              {icon}
            </span>
            <span className={styles['item-title']}>{label}</span>
            <span className={styles['description']}>{description}</span>
            {external && <ArrowUpRightOutlined size={16} className={styles['external']} />}
            {current && (
              <YakitTag
                className={styles['current']}
                size="small"
                color="success"
                border={false}
                fullRadius
                title={current}
              >
                <span className={styles['current-prefix']}>{t('AIAddMaterialsPopover.current')}</span>
                <span className={styles['current-name']}>{current}</span>
              </YakitTag>
            )}
          </YakitButton>
        ))}
      </div>
    </>
  )
}

export default MaterialMenu
