import type React from 'react'
import { type ReactNode } from 'react'
import { Dropdown, type DropDownProps } from 'antd'
import { normalizeDropdownProps } from '@/utils/antdCompat'
import { BaseMenu, type BaseMenuProps } from './BaseMenu'

import './DropdownMenu.css'

type Partial<T> = {
  [P in keyof T]?: T[P]
}
type OptionalDropDownProps = Partial<DropDownProps>
interface DropdownProps extends OptionalDropDownProps {}

export interface DropdownMenuProps {
  dropdown?: DropdownProps
  menu: BaseMenuProps
  onClick?: (info: string) => any
  children?: ReactNode
}
export const DropdownMenu: React.FC<DropdownMenuProps> = (props) => {
  const {
    dropdown: { popupRender, overlay, ...restDropdown } = {},
    menu: { data = [], onClick: onclick, ...restMenu } = {},
    onClick,
    children,
  } = props
  const dropdownProps = normalizeDropdownProps(restDropdown)

  const Menus = () => {
    return (
      <BaseMenu
        data={data || []}
        {...restMenu}
        onClick={(e) => {
          const { key, keyPath, domEvent } = e
          if (onClick) onClick(key)
          if (onclick) onclick(e)
        }}
      ></BaseMenu>
    )
  }

  const renderPopup = (originNode: React.ReactNode) => {
    if (popupRender) return popupRender(originNode)
    if (overlay) return typeof overlay === 'function' ? overlay() : overlay
    return Menus()
  }

  return (
    <Dropdown popupRender={renderPopup} {...dropdownProps}>
      {children ? children : <></>}
    </Dropdown>
  )
}
