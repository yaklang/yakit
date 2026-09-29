import React, { useEffect, useRef } from 'react'
import { useMemoizedFn } from 'ahooks'
import classNames from 'classnames'
import { Tooltip } from 'antd'
import { YakitDropdownMenu } from '@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu'
import type { YakitMenuItemType } from '@/components/yakitUI/YakitMenu/YakitMenu'
import { AITabsEnum } from '../../../defaultConstant'
import type { AITabsEnumType } from '../../../aiAgentType'
import type { FileNodeProps } from '@/pages/yakRunner/FileTree/FileTreeType'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import {
  BugOutlined,
  FigmaIcon348196674Outlined,
  ListTodoOutlined,
  NewspaperOutlined,
  XOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import { FileDefault, KeyToIcon } from '@/pages/yakRunner/FileTree/icon'
import styles from '../AIChatWorkspace.module.scss'

export interface AIChatWorkspaceTab {
  key: string
  type: AITabsEnumType
  label: string
  file?: FileNodeProps
  taskId?: string
  taskGoal?: string
  runtimeId?: string
}

export interface AIChatWorkspaceTabsProps {
  tabs: AIChatWorkspaceTab[]
  activeKey: string
  onActiveChange: (key: string) => void
  onClose: (key: string) => void
  onCloseOthers: (key: string) => void
  onCloseRight: (key: string) => void
  onCloseAll: () => void
}

const TabIcons: Record<AITabsEnumType, React.ReactNode> = {
  [AITabsEnum.File_Preview]: null,
  [AITabsEnum.Task_Detail]: <ListTodoOutlined color="currentColor" />,
  [AITabsEnum.HTTP]: <FigmaIcon348196674Outlined />,
  [AITabsEnum.Risk]: <BugOutlined color="currentColor" />,
  [AITabsEnum.Operation_Log]: <NewspaperOutlined color="currentColor" />,
}

const getFileTabIcon = (file?: FileNodeProps) => {
  const iconKey = file?.icon && KeyToIcon[file.icon] ? file.icon : FileDefault
  return <img src={KeyToIcon[iconKey].iconPath} alt="" />
}

/** 工作区页签栏：展示页签列表与右键关闭菜单（关闭/关闭其他/关闭右侧/关闭全部） */
export const AIChatWorkspaceTabs: React.FC<AIChatWorkspaceTabsProps> = React.memo((props) => {
  const { tabs, activeKey, onActiveChange, onClose, onCloseOthers, onCloseRight, onCloseAll } = props
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi', 'yakitRoute'])
  const tabBarRef = useRef<HTMLDivElement>(null)
  const activeTabRef = useRef<HTMLDivElement>(null)

  /** 仅在 activeKey 实际变化时滚入可视区域；勿依赖 tabs 引用，避免打断用户滚轮或滚到旧激活页签 */
  useEffect(() => {
    if (!activeKey) return
    const bar = tabBarRef.current
    const fromRef = activeTabRef.current?.getAttribute('data-tab-key') === activeKey ? activeTabRef.current : null
    const el =
      fromRef ??
      (bar
        ? Array.from(bar.querySelectorAll<HTMLElement>('[data-tab-key]')).find(
            (node) => node.getAttribute('data-tab-key') === activeKey,
          )
        : undefined)
    el?.scrollIntoView?.({ inline: 'nearest', block: 'nearest' })
  }, [activeKey])

  /** 在页签栏上滚动鼠标滚轮时，将纵向 delta 转为横向滚动 */
  useEffect(() => {
    const el = tabBarRef.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
      if (el.scrollWidth <= el.clientWidth) return
      event.preventDefault()
      el.scrollLeft += event.deltaY
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const getTabContextMenu = useMemoizedFn((tabKey: string): YakitMenuItemType[] => {
    const index = tabs.findIndex((item) => item.key === tabKey)
    const hasRight = index >= 0 && index < tabs.length - 1
    return [
      { key: 'close', label: t('AIChatWorkspace.close') },
      { key: 'closeOthers', label: t('AIChatWorkspace.closeOthers') },
      { key: 'closeRight', label: t('AIChatWorkspace.closeRight'), disabled: !hasRight },
      { key: 'closeAll', label: t('AIChatWorkspace.closeAll') },
    ]
  })

  const onTabContextMenuClick = useMemoizedFn((action: string, tabKey: string) => {
    switch (action) {
      case 'close':
        onClose(tabKey)
        break
      case 'closeOthers':
        onCloseOthers(tabKey)
        break
      case 'closeRight':
        onCloseRight(tabKey)
        break
      case 'closeAll':
        onCloseAll()
        break
      default:
        break
    }
  })

  const onCloseTab = useMemoizedFn((event: React.MouseEvent, key: string) => {
    event.stopPropagation()
    onClose(key)
  })

  return (
    <div className={styles['workspace-tab-bar']} ref={tabBarRef} data-testid="workspace-tab-bar">
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey
        return (
          <YakitDropdownMenu
            key={tab.key}
            menu={{
              data: getTabContextMenu(tab.key),
              width: 160,
              size: 'rightMenu',
              onClick: ({ key, domEvent }) => {
                domEvent.preventDefault()
                domEvent.stopPropagation()
                onTabContextMenuClick(key, tab.key)
              },
            }}
            dropdown={{
              trigger: ['contextMenu'],
              placement: 'bottomLeft',
            }}
          >
            <Tooltip title={tab.label} placement="top">
              <div
                ref={isActive ? activeTabRef : undefined}
                data-tab-key={tab.key}
                className={classNames(styles['workspace-tab'], {
                  [styles['workspace-tab-active']]: isActive,
                })}
                onClick={() => onActiveChange(tab.key)}
              >
                <div className={styles['workspace-tab-main']}>
                  <span className={styles['workspace-tab-icon']}>
                    {tab.type === AITabsEnum.File_Preview ? getFileTabIcon(tab.file) : TabIcons[tab.type]}
                  </span>
                  <span className={classNames(styles['workspace-tab-label'], 'content-ellipsis')}>{tab.label}</span>
                </div>
                <span
                  className={classNames(styles['workspace-tab-close'], {
                    [styles['workspace-tab-close-show']]: isActive,
                  })}
                  onClick={(event) => onCloseTab(event, tab.key)}
                >
                  <XOutlined color="currentColor" />
                </span>
              </div>
            </Tooltip>
          </YakitDropdownMenu>
        )
      })}
    </div>
  )
})
