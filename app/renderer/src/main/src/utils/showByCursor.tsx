import ReactDOM from "react-dom"
import { Card, Menu } from "antd"
import "./showByCursor.css"

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
                <Card bodyStyle={{ padding: 0 }} bordered={true} hoverable={true}>
                    {props.content}
                </Card>,
                div
            )
        })
    }
    render()

    return { destroy: destory }
}

interface MenuItemProps {
    title: string
    onClick: () => void
    disabled?: boolean
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
                        onClick={({ key }) => {
                            const index = +(key.split("-").reverse().shift() as string)
                            props.content[index].onClick()
                        }}
                    >
                        {props.content.map((item, index) => {
                            return (
                                <Menu.Item key={`${item.title}-${index}`} disabled={!!item.disabled}>
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

    return { destroy: destory }
}
