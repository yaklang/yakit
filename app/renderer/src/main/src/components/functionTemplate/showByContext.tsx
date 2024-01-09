import {CSSProperties, ReactNode} from "react"
import ReactDOM from "react-dom"
import {coordinate} from "../../pages/globalVariable"
import {BaseMenu, BaseMenuProps} from "../baseTemplate/BaseMenu"
import {createRoot} from "react-dom/client"
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
    /**ContextMenu 根节点 */
    let contextMenuRootDiv

    const destory = () => {
        if (contextMenuRootDiv) {
            contextMenuRootDiv.unmount()
        }
    }

    const render = () => {
        setTimeout(() => {
            document.addEventListener("click", function onClickOutsize() {
                destory()
                document.removeEventListener("click", onClickOutsize)
            })
            document.addEventListener("contextmenu", function onContextMenuOutsize() {
                destory()
                document.removeEventListener("contextmenu", onContextMenuOutsize)
            })
            if ((props.data || []).length > 0) {
                contextMenuRootDiv = createRoot(div)
                contextMenuRootDiv.render(
                    <BaseMenu
                        className='right-context-menu'
                        data={data || []}
                        {...restMenu}
                        onClick={onClick}
                    ></BaseMenu>
                )
            }
        })
    }
    render()

    return {destroy: destory}
}
