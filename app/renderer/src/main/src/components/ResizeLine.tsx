import React, {useEffect, useState, useRef} from "react"

import "./ResizeLine.css"

export interface ResizeLineProps {
    isVer?: boolean
    minSize?: string | number
    maxSize?: string | number
    bodyRef: any
    resizeRef: any

    onChangeSize: (distance: number) => void
}

export const ResizeLine: React.FC<ResizeLineProps> = (props) => {
    const {isVer = false, minSize, maxSize, bodyRef, resizeRef, onChangeSize} = props

    let min, max
    // 判断最小值和最大值是什么类型的值，只支持纯数字和像素
    if (minSize) {
        min = +minSize.toString().split(/px/g)[0] ? +minSize.toString().split(/px/g)[0] : 100
    } else {
        min = 100
    }
    if (maxSize) {
        max = +maxSize.toString().split(/px/g)[0] ? +maxSize.toString().split(/px/g)[0] : 100
    } else {
        max = 100
    }

    const lineRef = useRef(null)

    const move = () => {
        if (!bodyRef || !bodyRef.current) return
        if (!resizeRef || !resizeRef.current) return
        if (!lineRef || !lineRef.current) return

        const body = bodyRef.current as unknown as HTMLDivElement
        const resize = resizeRef.current as unknown as HTMLDivElement
        const line = lineRef.current as unknown as HTMLDivElement

        resize.onmousedown = (e: any) => {
            let isMove = true
            const start = isVer ? e.layerY : e.layerX
            const first = isVer ? e.clientY : e.clientX
            // 生成移动分割线的初始坐标
            if (isVer) line.style.top = `${start}px`
            else line.style.left = `${start}px`
            line.style.display = "inline"

            body.onmousemove = (event: any) => {
                // 计算分割线距离body开始边框和结束边框的距离
                const distance = [
                    isVer ? event.layerY : event.layerX,
                    isVer ? body.clientHeight - event.layerY : body.clientWidth - event.layerX
                ]
                if (distance[0] <= min || distance[1] <= max) return
                const second = isVer ? event.clientY : event.clientX
                if (isVer) line.style.top = `${start + second - first}px`
                else line.style.left = `${start + second - first}px`
            }

            document.onmouseup = (e) => {
                if (!isMove) return

                if (e.clientY > window.innerWidth || e.clientY < 0 || e.clientX < 0 || e.clientX > window.innerHeight) {
                }
                line.style.display = "none"
                body.onmousemove = null
                const end = (isVer ? line.style.top : line.style.left).split("px")[0] || start
                if (end - start !== 0) onChangeSize(end - start)
                isMove = false
            }
        }
    }

    useEffect(() => {
        move()
    }, [])

    return (
        <div
            ref={lineRef}
            className={`resize-line-style ${isVer ? "resize-line-ver" : "resize-line-hor"}`}
            style={isVer ? {top: `0px`} : {left: `0px`}}
        ></div>
    )
}
