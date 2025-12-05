import {Dropdown, DropdownProps} from "antd"
import classNames from "classnames"
import {memo, ReactNode, useMemo} from "react"
import {YakitMenu, YakitMenuProp} from "../YakitMenu/YakitMenu"
import styles from "./YakitDropdownMenu.module.scss"

/** 可能准备写成基础组件 */
interface YakitDropdownMenuProps {
    dropdown?: Omit<DropdownProps, "overlay">
    menu: YakitMenuProp
    children?: ReactNode
}
/** 可能准备写成基础组件 */
export const YakitDropdownMenu: React.FC<YakitDropdownMenuProps> = memo((props) => {
    const {dropdown: {overlayClassName, ...restProps} = {}, menu, children} = props

    const overlay = useMemo(() => {
        return <YakitMenu {...menu} />
    }, [menu])

    return (
        <Dropdown
            {...restProps}
            overlay={overlay}
            overlayClassName={classNames(styles["yakit-dropdown-menu"], overlayClassName)}
        >
            {children}
        </Dropdown>
    )
})
