import React, {ReactNode} from "react"
import {Menu, MenuProps} from "antd"
import "@ant-design/compatible/assets/index.css"
import {randomString} from "../../utils/randomUtil"

import "./BaseMenu.css"

const {SubMenu, Item, Divider} = Menu

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

export const BaseMenu: React.FC<BaseMenuProps> = (props) => {
    const {data = [], onClick, ...restMenu} = props

    const generateMenu = (data: MenuItemProps[]) => {
        const menus = data.map((item) => {
            const {key, title, render, icon = <></>, disabled, isDivider = false, dashed} = item

            if (!!isDivider) return <Divider key={randomString(40)} dashed={!!dashed} />

            if (item.subMenu && item.subMenu.length !== 0) {
                return (
                    <SubMenu key={key} title={render ? render(item) : title || key} icon={icon} disabled={!!disabled}>
                        {generateMenu(item.subMenu)}
                    </SubMenu>
                )
            } else {
                return (
                    <Item key={key} title={title || key} icon={icon} disabled={!!disabled}>
                        {render ? render(item) : title || key}
                    </Item>
                )
            }
        })
        return menus
    }

    return (
        <Menu
            {...restMenu}
            onClick={(e) => {
                if (onClick) onClick(e)
            }}
        >
            {generateMenu(data)}
        </Menu>
    )
}
