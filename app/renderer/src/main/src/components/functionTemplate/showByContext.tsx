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

/**
 * @param {ReactNode} reactNode 内容
 * @param {number} height 内容的高度
 * @param {number} width 内容的宽度
 */
interface ShowByCustomProps {
    reactNode: ReactNode
    height: number
    width: number
}
export const showByCustom = (props: ShowByCustomProps, x?: number, y?: number) => {
    const clientHeight = document.body.clientHeight // body展示的高度；表示body在浏览器内显示的区域高度
    const clientWidth = document.body.clientWidth // body展示的宽度；
    const divExisted = document.getElementById(ContextMenuId)
    const div: HTMLDivElement = divExisted ? (divExisted as HTMLDivElement) : document.createElement("div")

    let left = x || coordinate.clientX
    let top = y || coordinate.clientY

    // 底部高度不够，向上移动 reactNode 内容的高度
    if (props.height + top > clientHeight) {
        top = top - props.height
    }
    // 右边宽度不够，向左边移动 reactNode 内容的宽度
    if (props.width + left > clientWidth) {
        left = left - props.width
    }
    div.style.left = `${left}px`
    div.style.top = `${top}px`
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
