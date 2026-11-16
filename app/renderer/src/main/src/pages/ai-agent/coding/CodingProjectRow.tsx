import { useEffect, useRef, useState } from 'react'
import { useInViewport } from 'ahooks'
import { Tooltip } from 'antd'
import {
  CheckOutlined,
  ChevronDownOutlined,
  ChevronRightOutlined,
  CogOutlined,
  DotsHorizontalOutlined,
  FolderOutlined,
  ChatOutlined,
  PencilAltOutlined,
  PinOutlined,
  PinOffOutlined,
  XOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import { YakitDropdownMenu } from '@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu'
import type { YakitMenuProp } from '@/components/yakitUI/YakitMenu/YakitMenu'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { getPathBaseName } from '@/utils/str'
import { yakitNotify } from '@/utils/notification'
import { openCodingDirectory, type CodingWorkspace } from './api'
import { openCodingProject } from './navigation'
import { setCodingProjectPinned } from './projectPreferences'
import styles from './CodingProjects.module.scss'

interface Props {
  workspace: CodingWorkspace
  expanded: boolean
  selected: boolean
  disabled: boolean
  pinned: boolean
  sessionCount: number
  unreadCount: number
  onToggle: () => void
  onEdit: () => void
  onRemove: () => void
  onMarkRead: () => void
}

export const CodingProjectRow = ({
  workspace,
  expanded,
  selected,
  disabled,
  pinned,
  sessionCount,
  unreadCount,
  onToggle,
  onEdit,
  onRemove,
  onMarkRead,
}: Props) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const [menuOpen, setMenuOpen] = useState<'button' | 'context'>()
  const [hoverOpen, setHoverOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const [inViewport] = useInViewport(rootRef)
  useEffect(() => {
    if (inViewport === false) {
      setMenuOpen(undefined)
      setHoverOpen(false)
    }
  }, [inViewport])
  const roots = workspace.RootPaths
  const closePopups = () => {
    setMenuOpen(undefined)
    setHoverOpen(false)
  }
  const edit = () => {
    closePopups()
    onEdit()
  }
  const openDirectory = async (path: string) => {
    closePopups()
    try {
      await openCodingDirectory(path)
    } catch (err) {
      yakitNotify('error', String(err))
    }
  }
  const menu: YakitMenuProp = {
    width: 188,
    type: 'grey',
    data: [
      {
        key: 'pin',
        label: t(pinned ? 'CodingAgent.unpinProject' : 'CodingAgent.pinProject'),
        itemIcon: pinned ? <PinOffOutlined /> : <PinOutlined />,
      },
      { key: 'edit', label: t('CodingAgent.editProject'), itemIcon: <CogOutlined />, disabled },
      { type: 'divider' },
      {
        key: 'open',
        label: t('CodingAgent.openProjectDirectory'),
        itemIcon: <FolderOutlined />,
        ...(roots.length > 1
          ? {
              children: roots.map((path, index) => ({
                key: `open:${index}`,
                label: getPathBaseName(path) || path,
                title: path,
                itemIcon: <FolderOutlined />,
              })),
            }
          : {}),
      },
      { key: 'read', label: t('CodingAgent.markProjectRead'), itemIcon: <CheckOutlined />, disabled: !unreadCount },
      { type: 'divider' },
      { key: 'remove', label: t('CodingAgent.removeProject'), itemIcon: <XOutlined />, type: 'danger' },
    ],
    onClick: ({ key }) => {
      closePopups()
      if (key === 'pin') setCodingProjectPinned(workspace.ID, !pinned)
      if (key === 'edit') onEdit()
      if (key === 'read') onMarkRead()
      if (key === 'remove') onRemove()
      if (key === 'open') void openDirectory(roots[0])
      if (key.startsWith('open:')) void openDirectory(roots[Number(key.slice(5))])
    },
  }
  return (
    <YakitDropdownMenu
      menu={menu}
      dropdown={{
        trigger: ['contextMenu'],
        placement: 'bottomRight',
        open: menuOpen === 'context' && inViewport !== false,
        onOpenChange: (open) => {
          setMenuOpen(open ? 'context' : undefined)
          if (open) setHoverOpen(false)
        },
      }}
    >
      <div>
        <YakitPopover
          trigger="hover"
          placement="rightTop"
          arrow={false}
          mouseEnterDelay={0.55}
          mouseLeaveDelay={0.15}
          open={hoverOpen && !menuOpen && inViewport !== false}
          onOpenChange={setHoverOpen}
          content={
            <div className={styles.projectPreview}>
              <div className={styles.previewHeading}>
                <FolderOutlined />
                <strong>{workspace.Name}</strong>
                <button
                  aria-label={t(pinned ? 'CodingAgent.unpinProject' : 'CodingAgent.pinProject')}
                  onClick={() => setCodingProjectPinned(workspace.ID, !pinned)}
                >
                  {pinned ? <PinOffOutlined /> : <PinOutlined />}
                </button>
              </div>
              <div className={styles.previewCount}>
                <ChatOutlined />
                <span>
                  {t('CodingAgent.projectSessionCount', { count: sessionCount })}
                  {unreadCount > 0 && ` · ${t('CodingAgent.projectUnreadCount', { count: unreadCount })}`}
                </span>
              </div>
              <div className={styles.previewDirectories}>
                {roots.map((path) => (
                  <button key={path} title={path} onClick={() => void openDirectory(path)}>
                    <FolderOutlined />
                    <span>{path}</span>
                  </button>
                ))}
              </div>
              <button className={styles.previewEdit} onClick={edit} disabled={disabled}>
                <CogOutlined />
                {t('CodingAgent.editProject')}
              </button>
            </div>
          }
        >
          <div ref={rootRef} className={styles.projectRow} data-selected={selected} data-menu-open={!!menuOpen}>
            <button className={styles.projectName} aria-expanded={expanded} onClick={onToggle}>
              {expanded ? <ChevronDownOutlined /> : <ChevronRightOutlined />}
              <FolderOutlined />
              <span>{workspace.Name}</span>
              {pinned && <PinOutlined className={styles.pinned} />}
            </button>
            <YakitDropdownMenu
              menu={menu}
              dropdown={{
                trigger: ['click'],
                placement: 'bottomRight',
                open: menuOpen === 'button' && inViewport !== false,
                onOpenChange: (open) => {
                  setMenuOpen(open ? 'button' : undefined)
                  if (open) setHoverOpen(false)
                },
              }}
            >
              <Tooltip
                open={inViewport === false ? false : undefined}
                title={menuOpen ? undefined : t('CodingAgent.projectActions')}
              >
                <button
                  className={styles.addSession}
                  aria-label={t('CodingAgent.projectActionsFor', { name: workspace.Name })}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen === 'button'}
                >
                  <DotsHorizontalOutlined />
                </button>
              </Tooltip>
            </YakitDropdownMenu>
            <Tooltip open={inViewport === false ? false : undefined} title={t('CodingAgent.newProjectSession')}>
              <button
                className={styles.addSession}
                aria-label={t('CodingAgent.newSessionInProject', { name: workspace.Name })}
                disabled={disabled}
                onClick={() => {
                  closePopups()
                  openCodingProject(workspace)
                }}
              >
                <PencilAltOutlined />
              </button>
            </Tooltip>
          </div>
        </YakitPopover>
      </div>
    </YakitDropdownMenu>
  )
}
