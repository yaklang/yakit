import ReactDOM from "react-dom"
import {Card, Menu} from "antd"
import "./showByCursor.css"
import React from "react";

export interface ByCursorContainerProp {
    content: JSX.Element
}

const cursorContainerId = "yakit-cursor-container"
export const showByCursorContainer = (props: ByCursorContainerProp, x: number, y: number) => {
    const divExisted = document.getElementById(cursorContainerId)
    const div: HTMLDivElement = divExisted ? (divExisted as HTMLDivElement) : document.createElement("div")
    div.style.left = `${x}px`
    div.style.top = `${y}px`
    div.style.position = "absolute"
    div.id = cursorContainerId
    div.className = "popup"
    document.body.appendChild(div)

    const destory = () => {
        const unmountResult = ReactDOM.unmountComponentAtNode(div)
        if (unmountResult && div.parentNode) {
            div.parentNode.removeChild(div)
        }
    }

    const render = () => {
        setTimeout(() => {
            document.addEventListener("click", function onClickOutsize() {
                destory()
                document.removeEventListener("click", onClickOutsize)
            })
            ReactDOM.render(
                <Card bodyStyle={{padding: 0}} bordered={true} hoverable={true}>
                    {props.content}
                </Card>,
                div
            )
        })
    }
    render()

    return {destroy: destory}
}

interface MenuItemProps {
    id?: string
    title: string
    render?: React.ReactNode
    onClick: () => void
    disabled?: boolean
    subMenuItems?: MenuItemProps[]
}

function menuItemWalker(list: MenuItemProps[], handler: (item: MenuItemProps) => any) {
    list.forEach(i => {
        handler(i)
        if (i?.subMenuItems && i.subMenuItems.length > 0) {
            menuItemWalker(i.subMenuItems, handler)
        }
    })
}

export interface ByCursorMenuProp {
    content: MenuItemProps[]
}

const cursorMenuId = "yakit-cursor-menu"
export const showByCursorMenu = (props: ByCursorMenuProp, x: number, y: number) => {
    const divExisted = document.getElementById(cursorMenuId)
    const div: HTMLDivElement = divExisted ? (divExisted as HTMLDivElement) : document.createElement("div")
    div.style.left = `${x}px`
    div.style.top = `${y}px`
    div.style.position = "absolute"
    div.style.zIndex = "9999"
    div.id = cursorMenuId
    div.className = "popup"
    document.body.appendChild(div)

    const destory = () => {
        const unmountResult = ReactDOM.unmountComponentAtNode(div)
        if (unmountResult && div.parentNode) {
            div.parentNode.removeChild(div)
        }
    }

    const render = () => {
        setTimeout(() => {
            document.addEventListener("click", function onClickOutsize() {
                destory()
                document.removeEventListener("click", onClickOutsize)
            })
            if ((props.content || []).length > 0)
                ReactDOM.render(
                    <Menu
                        className={"right-cursor-menu"}
                        onClick={(item: { key: string }) => {
                            const {key} = item;
                            menuItemWalker(props.content, item => {
                                if (item?.id === key) {
                                    item.onClick()
                                    return
                                }

                                if (item.title === key) {
                                    item.onClick()
                                    return
                                }
                            })
                        }}
                    >
                        {props.content.map((item, index) => {
                            const {title, disabled, id} = item;
                            if (item?.subMenuItems && item.subMenuItems.length > 0) {
                                return <Menu.SubMenu popupClassName="right-cursor-submenu" key={`${title}-${index}`} title={title} disabled={!!disabled}>
                                    {(item.subMenuItems || []).map((subItem, index) => {
                                        const {title, render, disabled} = subItem;
                                        const subId = subItem?.id;
                                        return <Menu.Item
                                            key={subId || subItem.title}
                                            disabled={!!disabled}>
                                            {render || subItem.title}
                                        </Menu.Item>
                                    })}
                                </Menu.SubMenu>
                            }
                            return (
                                <Menu.Item key={item?.id || item.title} disabled={!!disabled}>
                                    {item.title}
                                </Menu.Item>
                            )
                        })}
                    </Menu>,
                    div
                )
        })
    }
    render()

    return {destroy: destory}
}
