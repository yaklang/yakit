import ReactDOM from "react-dom"
import { coordinate } from "../../pages/globalVariable"
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
                ReactDOM.render(<BaseMenu className="right-context-menu" data={data || []} {...restMenu} onClick={onClick}></BaseMenu>, div)
        })
    }
    render()

    return {destroy: destory}
}
