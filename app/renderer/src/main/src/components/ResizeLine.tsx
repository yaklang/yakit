import {useMemoizedFn} from "ahooks"
import React, {useEffect, useState, useRef, useMemo, useCallback} from "react"

import "./ResizeLine.css"

export interface ResizeLineProps {
    isVer?: boolean
    minSize?: string | number
    maxSize?: string | number
    bodyRef: any
    resizeRef: any

    onStart?: () => void
    onEnd?: () => void
    onChangeSize: (distance: number) => void
}

export const ResizeLine: React.FC<ResizeLineProps> = (props) => {
    const {isVer = false, minSize, maxSize, bodyRef, resizeRef, onStart, onEnd, onChangeSize} = props

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

    const isver = useMemo(() => {
        return isVer
    }, [isVer])

    // const bodyMouse = (
    //     event: any,
    //     start: any,
    //     first: any,
    //     body: HTMLDivElement,
    //     resize: HTMLDivElement,
    //     line: HTMLDivElement
    // ) => {
    //     const bodyRect = body.getBoundingClientRect()
    //     // 计算分割线距离body开始边框和结束边框的距离
    //     const distance = [
    //         isver ? event.clientY - bodyRect.top : event.clientX - bodyRect.left,
    //         isver ? body.clientHeight - event.clientY + bodyRect.top : body.clientWidth - event.clientX + bodyRect.left
    //     ]
    //     if (distance[0] <= min || distance[1] <= max) return
    //     const second = isver ? event.clientY : event.clientX
    //     if (isver) line.style.top = `${start + second - first}px`
    //     else line.style.left = `${start + second - first}px`
    // }

    // const documentMouse = (
    //     event: any,
    //     start: any,
    //     first: any,
    //     body: HTMLDivElement,
    //     resize: HTMLDivElement,
    //     line: HTMLDivElement
    // ) => {
    //     if (!isMove) return

    //     if (e.clientY > window.innerWidth || e.clientY < 0 || e.clientX < 0 || e.clientX > window.innerHeight) {
    //     }
    //     if (onEnd) onEnd()
    //     line.style.display = "none"
    //     body.onmousemove = null
    //     const end = (isver ? line.style.top : line.style.left).split("px")[0] || start
    //     if (end - start !== 0) onChangeSize(end - start)
    //     isMove = false
    // }
    // const mouseDown = useMemoizedFn((e: any, body: HTMLDivElement, resize: HTMLDivElement, line: HTMLDivElement) => {})

    const getIsVer = useMemoizedFn(() => {
        return isVer
    })

    const move = () => {
        if (!bodyRef || !bodyRef.current) return
        if (!resizeRef || !resizeRef.current) return
        if (!lineRef || !lineRef.current) return

        const body = bodyRef.current as unknown as HTMLDivElement
        const resize = resizeRef.current as unknown as HTMLDivElement
        const line = lineRef.current as unknown as HTMLDivElement
        resize.onmousedown = (e: any) => {
            if (onStart) onStart()
            let isVer = getIsVer()
            let isMove = true
            const start = isVer ? e.layerY : e.layerX
            const first = isVer ? e.clientY : e.clientX
            // 生成移动分割线的初始坐标
            if (isVer) line.style.top = `${start}px`
            else line.style.left = `${start}px`
            line.style.display = "inline-block"

            body.onmousemove = (event: any) => {
                let isVer = getIsVer()
                const bodyRect = body.getBoundingClientRect()
                // 计算分割线距离body开始边框和结束边框的距离
                const distance = [
                    isVer ? event.clientY - bodyRect.top : event.clientX - bodyRect.left,
                    isVer
                        ? body.clientHeight - event.clientY + bodyRect.top
                        : body.clientWidth - event.clientX + bodyRect.left
                ]
                if (distance[0] <= min || distance[1] <= max) return
                const second = isVer ? event.clientY : event.clientX
                if (isVer) line.style.top = `${start + second - first}px`
                else line.style.left = `${start + second - first}px`
            }

            document.onmouseup = (e) => {
                let isVer = getIsVer()
                if (!isMove) return

                if (e.clientY > window.innerWidth || e.clientY < 0 || e.clientX < 0 || e.clientX > window.innerHeight) {
                }
                if (onEnd) onEnd()
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
            style={
                isVer ? {top: `0px`, borderTop: "2px dashed #434344"} : {left: `0px`, borderLeft: "2px dashed #434344"}
            }
            draggable
        ></div>
    )
}
