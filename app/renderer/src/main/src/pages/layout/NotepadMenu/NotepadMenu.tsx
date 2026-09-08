import React, { useMemo, useState } from 'react'
import classNames from 'classnames'
import { useMemoizedFn } from 'ahooks'
import { Tooltip } from 'antd'
import { ClipboardListOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitMenu, type YakitMenuItemProps } from '@/components/yakitUI/YakitMenu/YakitMenu'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitRoute } from '@/enums/yakitRoute'
import { isEnpriTrace, isEnpriTraceAgent, isIRify } from '@/utils/envfile'
import emiter from '@/utils/eventBus/eventBus'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import extraStyles from '../publicMenu/ExtraMenu.module.scss'
import funcDomainStyles from '@/components/layout/funcDomain.module.scss'
import { getNotepadAdd, getNotepadManage, getNotepadNameByEditionMulLang, openLatestOrNewNotepad } from './utils'

export const NotepadMenu: React.FC = React.memo(() => {
  const { i18nRefresh } = useI18nNamespaces(['yakitRoute'])
  const [open, setOpen] = useState(false)
  const isYakitEE = isEnpriTrace() && !isIRify()
  const name = useMemo(() => getNotepadNameByEditionMulLang(), [i18nRefresh])

  const menuData = useMemo<YakitMenuItemProps[]>(
    () => [
      { key: YakitRoute.Notepad_Manage, label: getNotepadManage() },
      { key: YakitRoute.Modify_Notepad, label: getNotepadAdd() },
    ],
    [i18nRefresh],
  )

  const onMenuClick = useMemoizedFn((key: string) => {
    setOpen(false)
    if (key === YakitRoute.Modify_Notepad) {
      openLatestOrNewNotepad()
      return
    }
    emiter.emit('menuOpenPage', JSON.stringify({ route: YakitRoute.Notepad_Manage }))
  })

  if (isEnpriTraceAgent()) return null

  const iconBtn = (
    <Tooltip placement="bottom" title={name}>
      <div
        className={funcDomainStyles['ui-op-btn-wrapper']}
        onClick={isYakitEE ? undefined : () => openLatestOrNewNotepad()}
      >
        <div
          className={classNames(funcDomainStyles['op-btn-body'], {
            [funcDomainStyles['op-btn-body-hover']]: open,
          })}
        >
          <ClipboardListOutlined
            className={classNames(
              funcDomainStyles['size-style'],
              open ? funcDomainStyles['icon-hover-style'] : funcDomainStyles['icon-style'],
            )}
          />
        </div>
      </div>
    </Tooltip>
  )

  if (!isYakitEE) return iconBtn

  return (
    <YakitPopover
      classNames={{ root: classNames(extraStyles['menu-popover'], extraStyles['menu-popover-no-arrow']) }}
      placement="bottomRight"
      trigger="click"
      content={<YakitMenu selectedKeys={[]} data={menuData} onClick={({ key }) => onMenuClick(String(key))} />}
      open={open}
      onOpenChange={(visible) => setOpen(visible)}
    >
      {iconBtn}
    </YakitPopover>
  )
})
