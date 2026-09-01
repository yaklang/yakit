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
  const { dropdown = {}, menu, children } = props
  const { rootClassName, ...dropdownProps } = normalizeDropdownProps(dropdown)

  const overlay = useMemo(() => {
    const { menuWrapperClassName, ...resetMenu } = menu
    return (
      <YakitMenu
        {...resetMenu}
        menuWrapperClassName={classNames(styles['yakit-dropdown-menu-div'], menuWrapperClassName)}
      />
    )
  }, [menu])

  return (
    <Dropdown
      {...dropdownProps}
      popupRender={() => overlay}
      rootClassName={classNames(styles['yakit-dropdown-menu'], rootClassName)}
    >
      {children}
    </Dropdown>
  )
})
