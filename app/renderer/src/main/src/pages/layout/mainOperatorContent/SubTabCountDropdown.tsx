import React, { useMemo, useRef, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitMenu } from '@/components/yakitUI/YakitMenu/YakitMenu'
import emiter from '@/utils/eventBus/eventBus'
import type { PageCache } from './MainOperatorContentType'
import { buildSubTabOverviewMenu, countSubTabs, isSubTabLeaf, isSubTabOverviewRoute } from './subTabOverview'
import styles from './MainOperatorContent.module.scss'

interface SubTabCountDropdownProps {
  item: PageCache
  onSelect: (item: PageCache, key: string) => void
}

export const SubTabCountDropdown: React.FC<SubTabCountDropdownProps> = React.memo((props) => {
  const { item, onSelect } = props
  const [show, setShow] = useState(false)
  const menuAnchorRef = useRef<HTMLDivElement>(null)
  const nodes = item.multipleNode || []
  const count = useMemo(() => countSubTabs(nodes), [nodes])
  const menuData = useMemo(() => buildSubTabOverviewMenu(nodes), [nodes])

  const onMenuClick = useMemoizedFn((key: string) => {
    if (!isSubTabLeaf(nodes, key)) return
    setShow(false)
    onSelect(item, item.routeKey)
    emiter.emit('switchSubMenuItem', JSON.stringify({ pageId: key }))
    emiter.emit('expandSubTabGroupByPageId', key)
  })

  if (!isSubTabOverviewRoute(item.route) || count <= 0) return null

  const menu = (
    <div ref={menuAnchorRef} onClick={(e) => e.stopPropagation()}>
      <YakitMenu
        width={206}
        selectedKeys={[]}
        data={menuData}
        menuWrapperClassName={styles['sub-tab-count-menu']}
        popupClassName={styles['sub-tab-count-submenu']}
        onClick={({ key }) => onMenuClick(key)}
        getPopupContainer={() => menuAnchorRef.current || document.body}
      />
    </div>
  )

  return (
    <YakitPopover
      classNames={{ root: styles['sub-tab-count-dropdown'] }}
      styles={{ root: { paddingBottom: 0 } }}
      placement="bottomLeft"
      content={menu}
      open={show}
      onOpenChange={(visible) => setShow(visible)}
      trigger="hover"
      mouseEnterDelay={0.1}
      mouseLeaveDelay={0.3}
    >
      <div className={styles['tab-menu-first-sub-count']} onMouseDown={(e) => e.stopPropagation()}>
        {count}
      </div>
    </YakitPopover>
  )
})
