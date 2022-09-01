import React, { useEffect, useRef, useState } from "react"
import { ResizeLine } from "./ResizeLine"
import { useDebounce, useDebounceFn, useMemoizedFn, useThrottleFn } from "ahooks"
import ReactResizeDetector from "react-resize-detector"

import "./ResizeBox.css"

export interface ResizeBoxProps {
    isVer?: boolean
    freeze?: boolean
    firstRatio?: string
    firstMinSize?: string | number
    firstNode: any

    secondRatio?: string
    secondMinSize?: string | number
    secondNode: any

    style?: React.CSSProperties
    lineStyle?: React.CSSProperties

    onChangeSize?: () => void
    layoutTrigger?: any
}

export const ResizeBox: React.FC<ResizeBoxProps> = React.memo((props) => {
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
    const [bodyWidth, setBodyWidth] = useState<number>(0)
    const [bodyHeight, setBodyHeight] = useState<number>(0)
    let firstRenderRef = useRef<boolean>(true)
    let perBodyWidth = useRef<number>()
    let perBodyHeight = useRef<number>()

    const moveSize = useMemoizedFn((size: number) => {
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
    })

    const bodyResize = (bodysize?: number) => {
        if (!bodyRef || !bodyRef.current) return
        if (!firstRef || !firstRef.current) return
        if (!secondRef || !secondRef.current) return
        const body = bodyRef.current as unknown as HTMLDivElement
        const first = firstRef.current as unknown as HTMLDivElement
        const second = secondRef.current as unknown as HTMLDivElement
        const bodySize = bodysize || (isVer ? body.clientHeight : body.clientWidth)
        const firstSize = isVer ? first.clientHeight : first.clientWidth
        const secondSize = isVer ? second.clientHeight : second.clientWidth
        if (bodySize) {
            if (isVer) {
                first.style.height = `${(bodySize * firstSize) / (firstSize + secondSize)}px`
                second.style.height = `${(bodySize * secondSize) / (firstSize + secondSize)}px`
            } else {
                first.style.width = `${(bodySize * firstSize) / (firstSize + secondSize)}px`
                second.style.width = `${(bodySize * secondSize) / (firstSize + secondSize)}px`
            }
        }
    }

    const moveStart = useMemoizedFn(() => {
        if (!maskRef || !maskRef.current) return
            ; (maskRef.current as unknown as HTMLDivElement).style.display = "block"
    })
    const moveEnd = useMemoizedFn(() => {
        if (!maskRef || !maskRef.current) return
            ; (maskRef.current as unknown as HTMLDivElement).style.display = "none"
    })

    useEffect(() => {
        if (firstRenderRef.current) return
        bodyResize()
    }, [bodyWidth, bodyHeight])

    return (
        <div ref={bodyRef} style={{ ...style, flexFlow: `${isVer ? "column" : "row"}` }} className='resize-box'>
            <ReactResizeDetector
                onResize={(width, height) => {
                    if (!width || !height) return
                    console.log("width", width, height)

                    if (firstRenderRef.current) {
                        perBodyWidth.current = width
                        perBodyHeight.current = height
                        firstRenderRef.current = false
                        return
                    }
                    if (isVer) {
                        if (perBodyHeight.current === height) return
                        setBodyHeight(height)
                    } else {
                        if (perBodyWidth.current === width) return
                        setBodyWidth(width)
                    }
                }}
                handleWidth={true}
                handleHeight={true}
                refreshMode={"debounce"}
                refreshRate={50}
            />
            <div
                ref={firstRef}
                style={{
                    width: isVer ? "100%" : firstRatio === "50%" ? `calc(100% - ${secondRatio})` : firstRatio,
                    height: isVer ? firstRatio : "100%",
                    padding: `${isVer ? "0 0 3px 0" : "0 3px 0 0 "}`,
                    overflow: "hidden"
                }}
            >
                {typeof firstNode === "function" ? firstNode() : firstNode}
            </div>
            <div
                ref={lineRef}
                style={{
                    ...(props.freeze ? undefined : lineStyle),
                    width: `${isVer ? "100%" : "6px"}`,
                    height: `${isVer ? "6px" : "100%"}`,
                    cursor: `${isVer ? "row-resize" : "col-resize"}`
                }}
                className={props.freeze ? undefined : "resize-split-line"}
            />
            <div
                ref={secondRef}
                style={{
                    width: isVer ? "100%" : firstRatio === "50%" ? secondRatio : `calc(100% - ${firstRatio})`,
                    height: isVer ? secondRatio : "100%",
                    padding: `${isVer ? "3px 0 0 0" : "0 0 0 3px"}`,
                    overflow: "hidden"
                }}
            >
                {typeof secondNode === "function" ? secondNode() : secondNode}
            </div>
            {!props.freeze && (
                <ResizeLine
                    isVer={isVer}
                    bodyRef={bodyRef}
                    resizeRef={lineRef}
                    minSize={firstMinSize}
                    maxSize={secondMinSize}
                    onStart={moveStart}
                    onEnd={moveEnd}
                    onChangeSize={moveSize}
                />
            )}
            <div ref={maskRef} className='mask-body' />
        </div>
    )
})
