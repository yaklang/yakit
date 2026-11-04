/**
 * YakitDropdownMenu 兼容层：主项目旧 API → @yakit-libs/yakit-ui YakitDropdownMenu
 *
 * 旧 menu prop 适配：
 * - data: YakitMenuItemType[] → items: 库菜单项（label/key/disabled/children/title 透传；
 *   itemIcon→icon、单项 type:'success'|'danger'|'info'|'text'→itemType、type:'divider'→{type:'divider'}）
 * - size: 'rightMenu' → 库 'medium'（右键紧凑高度对齐 md 项高）
 * - type/isHint/parentTitleClick/submenuWidth/popupClassName：库暂无对应实现， submenuWidth/
 *   parentTitleClick/noStyle/itemIcon tooltip 语义先忽略（主项目使用面未出现）
 * - dropdown 配置透传（trigger/placement/open/onOpenChange 等）
 */
import React, { useMemo, type ReactNode } from 'react'
import { YakitDropdownMenu as LibYakitDropdownMenu } from '@yakit-libs/yakit-ui'
import type {
  DropdownMenuProps as LibDropdownMenuProps,
  DropdownMenuItem,
  DropdownMenuItemType,
  DropdownProps as LibDropdownProps,
} from '@yakit-libs/yakit-ui'
import classNames from 'classnames'

/** 旧 YakitMenuItem 面的主项目侧子集 */
export interface YakitMenuItemProps {
  label: string | ReactNode
  key: string
  disabled?: boolean
  children?: YakitMenuItemProps[]
  itemIcon?: ReactNode
  title?: string
  type?: 'success' | 'danger' | 'info' | 'text'
  noStyle?: boolean
}

export interface YakitMenuItemDividerProps {
  type: 'divider'
}

export type YakitMenuItemType = YakitMenuItemProps | YakitMenuItemDividerProps

export interface YakitMenuProp {
  data?: YakitMenuItemType[]
  width?: number
  submenuWidth?: number
  type?: 'primary' | 'grey'
  isHint?: boolean
  popupClassName?: string
  size?: 'default' | 'rightMenu'
  parentTitleClick?: boolean
  menuWrapperClassName?: string
  className?: string
  onClick?: (info: { key: string; keyPath: string[]; domEvent: any }) => void
  selectedKeys?: string[]
  selectable?: boolean
}

interface YakitDropdownMenuProps {
  dropdown?: Omit<LibDropdownProps, 'menu' | 'children' | 'overlay' | 'popupRender'> & {
    /** 旧 antd 兼容层可能回填的字段，忽略 */
    visible?: boolean
    onVisibleChange?: (open: boolean) => void
    dropdownClassName?: string
  }
  menu: YakitMenuProp
  children?: ReactNode
}

const ITEM_TYPE_MAP: Record<string, DropdownMenuItemType> = {
  success: 'success',
  danger: 'danger',
  info: 'info',
  text: 'text',
}

const convertItems = (data: YakitMenuItemType[]): DropdownMenuItem[] =>
  data
    .filter((item): item is YakitMenuItemProps => true)
    .map((item) => {
      if ('label' in item) {
        const { itemIcon, type, noStyle, ...rest } = item
        return {
          ...rest,
          icon: itemIcon,
          itemType: type ? ITEM_TYPE_MAP[type] : undefined,
          children: item.children ? convertItems(item.children) : undefined,
        } as DropdownMenuItem
      }
      // divider
      return { type: 'divider' as const, key: `divider-${Math.random().toString(36).slice(2)}` }
    })

export const YakitDropdownMenu: React.FC<YakitDropdownMenuProps> = React.memo((props) => {
  const { dropdown = {}, menu, children } = props

  const {
    data,
    width,
    type,
    size,
    isHint,
    submenuWidth,
    popupClassName,
    parentTitleClick,
    menuWrapperClassName,
    onClick,
    selectedKeys,
    selectable,
    ...restMenu
  } = menu

  const libMenu = useMemo(
    () =>
      ({
        ...(restMenu as LibDropdownMenuProps),
        items: data ? convertItems(data) : (restMenu as LibDropdownMenuProps).items,
        width,
        type,
        selectable,
        selectedKeys,
        onClick: onClick as LibDropdownMenuProps['onClick'],
        size: size === 'rightMenu' ? 'medium' : undefined,
      }) as LibDropdownMenuProps & { menuWrapperClassName?: string },
    [data, width, type, size, onClick, selectable, selectedKeys, restMenu],
  )

  const { visible, onVisibleChange, dropdownClassName, ...dropdownProps } = dropdown

  return (
    <LibYakitDropdownMenu
      dropdown={{
        ...(dropdownProps as LibDropdownProps),
        ...(visible !== undefined ? { open: visible } : {}),
        ...(onVisibleChange ? { onOpenChange: (o) => onVisibleChange(o) } : {}),
      }}
      menu={libMenu}
    >
      {children as never}
    </LibYakitDropdownMenu>
  )
})
