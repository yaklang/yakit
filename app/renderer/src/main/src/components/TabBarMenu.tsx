import React from "react"
import {Menu, Dropdown} from "antd"

export interface MenuInfoProps {
    key: string
    title: string
}

export const TabBarMenu = (
    props: any,
    TabBarDefault: any,
    menuList: MenuInfoProps[],
    callback: (id: any, key: any) => void
) => {
    const tabBarMenu = (id: any) => {
        return (
            <Menu onClick={({key}) => callback(id, key)}>
                {menuList.map((item) => {
                    return <Menu.Item key={item.key}>{item.title}</Menu.Item>
                })}
            </Menu>
        )
    }

    return (
        <TabBarDefault
            {...props}
            children={(barNode: React.ReactElement) => {
                return (
                    <Dropdown overlay={tabBarMenu(barNode.key)} trigger={["contextMenu"]}>
                        {barNode}
                    </Dropdown>
                )
            }}
        />
    )
}
