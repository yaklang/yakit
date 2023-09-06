import ReactDOM from "react-dom"
import React, {memo, ReactNode, useEffect, useRef} from "react"
import {coordinate} from "@/pages/globalVariable"
import {YakitMenu, YakitMenuProp} from "./YakitMenu"

import styles from "./showByRightContext.module.scss"

const roundDown = (value: number) => {
    return Math.floor(value)
}

const genX = (client, coordinate, target) => {
    if (target + coordinate > client) {
        return coordinate - target - 6
    } else {
        return coordinate + 6
    }
}
const genY = (client, coordinate, target) => {
    const heightDiff = target + coordinate - client
    if (heightDiff <= -10) {
        return coordinate + 6
    }
    if (heightDiff > -10 && coordinate > target + 6) {
        return coordinate - target - 6
    }
    if (heightDiff > -10 && coordinate <= target + 6) {
        return coordinate - heightDiff - 6
    }
}

const ContextMenuId = "yakit-right-context"

/**
 * @name 生成一个鼠标所在坐标位置的展示框(props默认为菜单组件，也可自行传递自定义组件)
 * @description x和y参数为可选参数，填写时将以x-y坐标位展示内容
 */
export const showByRightContext = (props: YakitMenuProp | ReactNode, x?: number, y?: number, isForce?: boolean) => {
    let divExisted = document.getElementById(ContextMenuId)

    if (isForce) {
        if (divExisted) divExisted.remove()
        divExisted = null
    }

    const div: HTMLDivElement = divExisted ? (divExisted as HTMLDivElement) : document.createElement("div")

    /** body展示的高度和宽度；表示body在浏览器内显示的区域高度和宽度 */
    const clientHeight = roundDown(document.body.getBoundingClientRect().height || 0)
    const clientWidth = roundDown(document.body.getBoundingClientRect().width || 0)
    /** 鼠标坐标 */
    let left = x || coordinate.clientX
    let top = y || coordinate.clientY
    /** 右键展示元素宽高 */
    const divWidth = roundDown(div.getBoundingClientRect().width || 0)
    const divHeight = roundDown(div.getBoundingClientRect().height || 0)

    if (divWidth > 0 && divHeight > 0) {
        // y坐标计算
        top = genY(clientHeight, top, divHeight)
        // x坐标计算
        left = genX(clientWidth, left, divWidth)
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
        // y坐标计算
        top = genY(clientHeight, top, height)
        // x坐标计算
        left = genX(clientWidth, left, width)
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
