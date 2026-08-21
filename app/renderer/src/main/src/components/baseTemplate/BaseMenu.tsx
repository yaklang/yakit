import type React from 'react'
import { type ReactNode } from 'react'
import { Menu, type MenuProps } from 'antd'
import type { ItemType } from 'antd/es/menu/interface'
import { randomString } from '../../utils/randomUtil'

import './BaseMenu.css'

export interface MenuItemProps {
  key: string
  title?: string
  render?: (info: any) => ReactNode
  disabled?: boolean
  icon?: ReactNode
  subMenu?: MenuItemProps[]
  isDivider?: boolean
  dashed?: boolean
}
export interface BaseMenuProps extends MenuProps {
  data?: MenuItemProps[]
}

const generateMenuItems = (data: MenuItemProps[]): ItemType[] => {
  return data.map((item) => {
    const { key, title, render, icon = <></>, disabled, isDivider = false } = item

    if (isDivider) return { type: 'divider', key: randomString(40) }

    if (item.subMenu && item.subMenu.length !== 0) {
      return {
        key,
        label: render ? render(item) : title || key,
        icon,
        disabled: !!disabled,
        children: generateMenuItems(item.subMenu),
      }
    }
    return {
      key,
      label: render ? render(item) : title || key,
      title: title || key,
      icon,
      disabled: !!disabled,
    }
  })
}

export const BaseMenu: React.FC<BaseMenuProps> = (props) => {
  const { data = [], onClick, ...restMenu } = props

  return (
    <Menu
      {...restMenu}
      items={generateMenuItems(data)}
      onClick={(e) => {
        if (onClick) onClick(e)
      }}
    />
  )
}
