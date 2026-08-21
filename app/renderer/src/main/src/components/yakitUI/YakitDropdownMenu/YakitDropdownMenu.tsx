import { Dropdown, type DropdownProps } from 'antd'
import classNames from 'classnames'
import { memo, type ReactNode, useMemo } from 'react'
import { normalizeDropdownProps } from '@/utils/antdCompat'
import { YakitMenu, type YakitMenuProp } from '../YakitMenu/YakitMenu'
import styles from './YakitDropdownMenu.module.scss'

/** 可能准备写成基础组件 */
interface YakitDropdownMenuProps {
  dropdown?: Omit<DropdownProps, 'overlay'>
  menu: YakitMenuProp
  children?: ReactNode
}
/** 可能准备写成基础组件 */
export const YakitDropdownMenu: React.FC<YakitDropdownMenuProps> = memo((props) => {
  const {
    dropdown = {},
    menu: { menuWrapperClassName, ...resetMenu },
    children,
  } = props
  const { overlayClassName, ...dropdownProps } = normalizeDropdownProps(dropdown)

  const overlay = useMemo(() => {
    return (
      <YakitMenu
        {...resetMenu}
        menuWrapperClassName={classNames(styles['yakit-dropdown-menu-div'], menuWrapperClassName)}
      />
    )
  }, [resetMenu, menuWrapperClassName])

  return (
    <Dropdown
      {...dropdownProps}
      popupRender={() => overlay}
      overlayClassName={classNames(styles['yakit-dropdown-menu'], overlayClassName)}
    >
      {children}
    </Dropdown>
  )
})
