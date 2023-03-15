import ReactDOM from "react-dom"
import React, {memo, ReactNode, useEffect, useRef} from "react"
import {coordinate} from "@/pages/globalVariable"
import {YakitMenu, YakitMenuProp} from "./YakitMenu"

import styles from "./showByRightContext.module.scss"

const ContextMenuId = "yakit-right-context"

/**
 * @name 生成一个鼠标所在坐标位置的展示框(props默认为菜单组件，也可自行传递自定义组件)
 * @description x和y参数为可选参数，填写时将以x-y坐标位展示内容
 */
export const showByRightContext = (props: YakitMenuProp | ReactNode, x?: number, y?: number) => {
    /** body展示的高度和宽度；表示body在浏览器内显示的区域高度和宽度 */
    const clientHeight = document.body.clientHeight
    const clientWidth = document.body.clientWidth
    const divExisted = document.getElementById(ContextMenuId)
    const div: HTMLDivElement = divExisted ? (divExisted as HTMLDivElement) : document.createElement("div")

    let left = x || coordinate.clientX
    let top = y || coordinate.clientY

    if (div.clientWidth > 0 && div.clientHeight > 0) {
        if (div.clientHeight + top > clientHeight) {
            top = top - div.clientHeight
        }
        // 右边宽度不够，向左边移动 reactNode 内容的宽度
        if (div.clientWidth + left > clientWidth) {
            left = left - div.clientWidth
        }
        div.style.left = `${left}px`
        div.style.top = `${top}px`
    } else {
        div.style.left = `-9999px`
        div.style.top = `-9999px`
    }

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

    const offsetPosition = (width: number, height: number) => {
        // 底部高度不够，向上移动 reactNode 内容的高度
        if (height + top > clientHeight) {
            top = top - height
        }
        // 右边宽度不够，向左边移动 reactNode 内容的宽度
        if (width + left > clientWidth) {
            left = left - width
        }
        div.style.left = `${left}px`
        div.style.top = `${top}px`
    }

    const render = () => {
        setTimeout(() => {
            document.addEventListener("click", function onClickOutsize() {
                destory()
                document.removeEventListener("click", onClickOutsize)
            })
            ReactDOM.render(<RightContext data={props} callback={offsetPosition} />, div)
        })
    }
    render()

    return {destroy: destory}
}

interface RightContextProp {
    data: YakitMenuProp | ReactNode
    callback?: (width: number, height: number) => any
}
const RightContext: React.FC<RightContextProp> = memo((props) => {
    const {data, callback} = props

    const wrapperRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if ((wrapperRef.current?.clientWidth || 0) > 0 && (wrapperRef.current?.clientHeight || 0) > 0) {
            if (callback) callback(wrapperRef.current?.clientWidth || 0, wrapperRef.current?.clientHeight || 0)
        }
    }, [wrapperRef])

    return (
        <div className={styles["show-by-right-context-wrapper"]} ref={wrapperRef}>
            {React.isValidElement(data) ? data : <YakitMenu {...(data as YakitMenuProp)} />}
        </div>
    )
})
