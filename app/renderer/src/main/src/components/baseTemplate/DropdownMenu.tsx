import React, {ReactNode} from "react"
import {Dropdown, DropDownProps} from "antd"
import "@ant-design/compatible/assets/index.css"
import {BaseMenu, BaseMenuProps} from "./BaseMenu"

import "./DropdownMenu.css"

type Partial<T> = {
    [P in keyof T]?: T[P]
}
type OptionalDropDownProps = Partial<DropDownProps>
interface DropdownProps extends OptionalDropDownProps {}

export interface DropdownMenuProps {
    dropdown?: DropdownProps
    menu: BaseMenuProps
    onClick?: (info: string) => any
    children?: ReactNode,
}
export const DropdownMenu: React.FC<DropdownMenuProps> = (props) => {
    // @ts-ignore
    const {
        dropdown: {overlay, ...restDropdown} = {},
        menu: {data = [], onClick: onclick, ...restMenu} = {},
        onClick,
        children,
    } = props

    const Menus = () => {
        return (
            <BaseMenu
                data={data || []}
                {...restMenu}
                onClick={(e) => {
                    const {item, key, keyPath, domEvent} = e
                    if (onClick) onClick(key)
                    if (onclick) onclick(e)
                }}
            ></BaseMenu>
        )
    }

    return (
        <Dropdown overlay={overlay ? overlay : Menus} {...restDropdown}>
            {children ? children : <></>}
        </Dropdown>
    )
}
