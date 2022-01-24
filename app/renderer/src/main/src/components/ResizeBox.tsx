import React, {useEffect, useState, useRef} from "react"
import {ResizeLine} from "./ResizeLine"

import "./ResizeBox.css"

export interface ResizeBoxProps {
    isVer?: boolean

    firstRatio?: string
    firstMinSize?: string | number
    firstNode: any

    secondRatio?: string
    secondMinSize?: string | number
    secondNode: any

    style?: React.CSSProperties
    lineStyle?: React.CSSProperties

    onChangeSize?: () => void
}

export const ResizeBox: React.FC<ResizeBoxProps> = (props) => {
    const {
        isVer = false,
        firstRatio = "50%",
        firstMinSize = "100px",
        firstNode,
        secondRatio = "50%",
        secondMinSize = "100px",
        secondNode,
        style,
        lineStyle,
        onChangeSize
    } = props

    const bodyRef = useRef(null)
    const firstRef = useRef(null)
    const secondRef = useRef(null)
    const lineRef = useRef(null)
    const maskRef = useRef(null)

    const moveSize = (size: number) => {
        if (!firstRef || !firstRef.current) return
        if (!secondRef || !secondRef.current) return
        const first = firstRef.current as unknown as HTMLDivElement
        const second = secondRef.current as unknown as HTMLDivElement
        const firstSize = `${isVer ? first.clientHeight + size : first.clientWidth + size}px`
        const secondSize = `${isVer ? second.clientHeight - size : second.clientWidth - size}px`

        if (isVer) {
            first.style.height = firstSize
            second.style.height = secondSize
        } else {
            first.style.width = firstSize
            second.style.width = secondSize
        }

        if (onChangeSize) onChangeSize()
    }

    const bodyResize = () => {
        if (!bodyRef || !bodyRef.current) return
        if (!firstRef || !firstRef.current) return
        if (!secondRef || !secondRef.current) return
        const body = bodyRef.current as unknown as HTMLDivElement
        const first = firstRef.current as unknown as HTMLDivElement
        const second = secondRef.current as unknown as HTMLDivElement
        const bodySize = isVer ? body.clientHeight : body.clientWidth
        const firstSize = isVer ? first.clientHeight : first.clientWidth
        const secondSize = isVer ? second.clientHeight : second.clientWidth

        if (isVer) {
            first.style.height = `${(bodySize * firstSize) / (firstSize + secondSize)}px`
            second.style.height = `${(bodySize * secondSize) / (firstSize + secondSize)}px`
        } else {
            first.style.width = `${(bodySize * firstSize) / (firstSize + secondSize)}px`
            second.style.width = `${(bodySize * secondSize) / (firstSize + secondSize)}px`
        }
    }

    const moveStart = () => {
        if (!maskRef || !maskRef.current) return
        ;(maskRef.current as unknown as HTMLDivElement).style.display = "block"
    }
    const moveEnd = () => {
        if (!maskRef || !maskRef.current) return
        ;(maskRef.current as unknown as HTMLDivElement).style.display = "none"
    }

    useEffect(() => {
        let timer: any = null
        window.onresize = () => {
            if (timer) clearTimeout(timer)
            timer = setTimeout(() => {
                bodyResize()
            }, 50)
        }
    }, [])

    return (
        <div ref={bodyRef} style={{...style, flexFlow: `${isVer ? "column" : "row"}`}} className='resize-box'>
            <div
                ref={firstRef}
                style={{
                    width: `${isVer ? "100%" : firstRatio}`,
                    height: `${isVer ? firstRatio : "100%"}`,
                    padding: `${isVer ? "0 0 2px 0" : "0 2px 0 0 "}`
                }}
            >
                {firstNode}
            </div>
            <div
                ref={lineRef}
                style={{
                    ...lineStyle,
                    width: `${isVer ? "100%" : "4px"}`,
                    height: `${isVer ? "4px" : "100%"}`,
                    cursor: `${isVer ? "row-resize" : "col-resize"}`
                }}
                className='resize-split-line'
            ></div>
            <div
                ref={secondRef}
                style={{
                    width: `${isVer ? "100%" : secondRatio}`,
                    height: `${isVer ? secondRatio : "100%"}`,
                    padding: `${isVer ? "2px 0 0 0" : "0 0 0 2px"}`
                }}
            >
                {secondNode}
            </div>

            <ResizeLine
                isVer={isVer}
                bodyRef={bodyRef}
                resizeRef={lineRef}
                minSize={firstMinSize}
                maxSize={secondMinSize}
                onStart={moveStart}
                onEnd={moveEnd}
                onChangeSize={moveSize}
            ></ResizeLine>

            <div ref={maskRef} className='mask-body'></div>
        </div>
    )
}
