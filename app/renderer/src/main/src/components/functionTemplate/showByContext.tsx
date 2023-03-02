import {CSSProperties, ReactNode} from "react"
import ReactDOM from "react-dom"
import {coordinate} from "../../pages/globalVariable"
import {BaseMenu, BaseMenuProps} from "../baseTemplate/BaseMenu"
import "./showByContext.css"

const ContextMenuId = "yakit-cursor-menu"
export const showByContextMenu = (props: BaseMenuProps, x?: number, y?: number) => {
    const {data = [], onClick, ...restMenu} = props

    const divExisted = document.getElementById(ContextMenuId)
    const div: HTMLDivElement = divExisted ? (divExisted as HTMLDivElement) : document.createElement("div")
    div.style.left = `${x || coordinate.clientX}px`
    div.style.top = `${y || coordinate.clientY}px`
    div.style.position = "absolute"
    div.id = ContextMenuId
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
            if ((props.data || []).length > 0)
                ReactDOM.render(
                    <BaseMenu
                        className='right-context-menu'
                        data={data || []}
                        {...restMenu}
                        onClick={onClick}
                    ></BaseMenu>,
                    div
                )
        })
    }
    render()

    return {destroy: destory}
}

const FullScreenMask = "full-screen-mask"
export const showFullScreenMask = (
    content: ReactNode,
    maskClassName?: string,
    maskStyle?: CSSProperties,
    onCancel?: (e: MouseEvent) => any
) => {
    const fullScreenDiv = document.getElementById(FullScreenMask)
    const div: HTMLDivElement = fullScreenDiv ? (fullScreenDiv as HTMLDivElement) : document.createElement("div")
    if (onCancel) div.onclick = (e) => onCancel(e)
    div.id = FullScreenMask
    div.className = FullScreenMask
    document.body.appendChild(div)

    const destory = () => {
        const unmountResult = ReactDOM.unmountComponentAtNode(div)
        if (unmountResult && div.parentNode) {
            div.parentNode.removeChild(div)
        }
    }

    const render = () => {
        setTimeout(() => {
            ReactDOM.render(
                <div className={maskClassName || ""} style={maskStyle || undefined}>
                    {content}
                </div>,
                div
            )
        })
    }
    render()

    return {destroy: destory}
}

interface ShowByCustomProps {
    reactNode: ReactNode
}
export const showByCustom = (props: ShowByCustomProps, x?: number, y?: number) => {
    const divExisted = document.getElementById(ContextMenuId)
    const div: HTMLDivElement = divExisted ? (divExisted as HTMLDivElement) : document.createElement("div")
    div.style.left = `${x || coordinate.clientX}px`
    div.style.top = `${y || coordinate.clientY}px`
    div.style.position = "absolute"
    div.style.zIndex = "9999"
    div.id = ContextMenuId
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
            ReactDOM.render(<>{props.reactNode}</>, div)
        })
    }
    render()

    return {destroy: destory}
}
