import React, {useEffect, useRef, useState} from "react"
import {useDebounce, useDebounceFn, useMemoizedFn, useThrottleFn, useClickAway} from "ahooks"
import classNames from "classnames"
import ReactResizeDetector from "react-resize-detector"
import styles from "./YakitResizeBox.module.scss"

export interface ResizeLineProps {
    isVer?: boolean
    dragResize?: boolean
    minSize?: string | number
    maxSize?: string | number
    bodyRef: any
    resizeRef: any

    onStart?: () => void
    onEnd?: () => void
    onMouseUp: (distance: number) => void
    dragMoveSize: (v: number) => void
}

export const ResizeLine: React.FC<ResizeLineProps> = (props) => {
    const {
        isVer = false,
        dragResize = false,
        minSize,
        maxSize,
        bodyRef,
        resizeRef,
        onStart,
        onEnd,
        onMouseUp,
        dragMoveSize
    } = props

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

    const start = useRef<any>(null)
    const first = useRef<any>(null)
    const isMove = useRef<boolean>(false)
    const moveLen = useRef<any>(null)

    // 解决闭包问题 实时更新状态
    const getIsVer = useMemoizedFn(() => isVer)
    const getDragResize = useMemoizedFn(() => dragResize)
    const mouseDown = (event: any) => {
        if (!lineRef || !lineRef.current) return
        let isVer = getIsVer()
        const line = lineRef.current as unknown as HTMLDivElement
        // willChange性能优化
        line.style.willChange = "transform"
        if (onStart) onStart()
        isMove.current = true
        start.current = isVer ? event.layerY : event.layerX
        first.current = isVer ? event.clientY : event.clientX

        // 生成移动分割线的初始坐标
        if (isVer) line.style.transform = `translateY(${start.current}px)`
        else line.style.transform = `translateX(${start.current}px)`
        line.style.display = "inline-block"
    }

    const mouseMove = (event) => {
        if (isMove.current) {
            const body = bodyRef.current as unknown as HTMLDivElement
            const line = lineRef.current as unknown as HTMLDivElement
            let isVer = getIsVer()
            let dragResize = getDragResize()
            const bodyRect = body.getBoundingClientRect()
            // 计算分割线距离body开始边框和结束边框的距离
            const distance = [
                isVer ? event.clientY - bodyRect.top : event.clientX - bodyRect.left,
                isVer
                    ? body.clientHeight - event.clientY + bodyRect.top
                    : body.clientWidth - event.clientX + bodyRect.left
            ]
            if (distance[0] <= min || distance[1] <= max) {
                if (dragResize) {
                    line.style.display = "none"
                }
            } else {
                line.style.display = "inline-block"
                const second = isVer ? event.clientY : event.clientX
                moveLen.current = start.current + second - first.current
                if (isVer) line.style.transform = `translateY(${start.current + second - first.current}px)`
                else line.style.transform = `translateX(${start.current + second - first.current}px)`
                dragResize && dragResizeBox()
            }
        }
    }

    // 拖拽时重新绘制比例（非常消耗性能）
    const dragResizeBox = () => {
        if (isMove.current) {
            const end = moveLen.current || start.current
            if (end - start.current !== 0) dragMoveSize(end - start.current)
        }
    }

    // 拖拽完成重新绘制比例
    const resetBox = () => {
        if (isMove.current) {
            let dragResize = getDragResize()
            const line = lineRef.current as unknown as HTMLDivElement
            if (onEnd) onEnd()
            line.style.display = "none"
            const end = moveLen.current || start.current
            if (end - start.current !== 0 && !dragResize) onMouseUp(end - start.current)
            isMove.current = false
            moveLen.current = null
            line.style.willChange = "auto"
        }
    }

    const mouseUp = () => {
        resetBox()
    }

    // 监听目标元素外的点击事件（元素外的鼠标松开）
    useClickAway(() => {
        resetBox()
    }, bodyRef)

    useEffect(() => {
        if (!bodyRef || !bodyRef.current) return
        if (!resizeRef || !resizeRef.current) return
        const body = bodyRef.current as unknown as HTMLDivElement
        const resize = resizeRef.current as unknown as HTMLDivElement

        resize.addEventListener("mousedown", mouseDown)
        body.addEventListener("mousemove", mouseMove)
        body.addEventListener("mouseup", mouseUp)
        // 解决有些时候,在鼠标松开的时候,元素仍然可以拖动;
        body.addEventListener("dragstart", (e) => e.preventDefault())
        body.addEventListener("dragend", (e) => e.preventDefault())
        return () => {
            if (resize) {
                resize.removeEventListener("click", mouseDown)
            }
            if (body) {
                body.removeEventListener("mousemove", mouseMove)
                body.removeEventListener("mouseup", mouseUp)
            }
        }
    }, [])

    return (
        <div
            ref={lineRef}
            className={classNames(styles["resize-line-style"], {
                [styles["resize-line-ver"]]: isVer,
                [styles["resize-line-hor"]]: !isVer
            })}
            draggable
        ></div>
    )
}

export interface ResizeBoxProps {
    /** 是否为竖向拖拽 默认横向拖拽 */
    isVer?: boolean
    /** 是否拖拽立即生效 默认为拖拽完成生效 */
    dragResize?: boolean
    /** 是否允许拖拽 默认可拖拽 */
    freeze?: boolean
    /** 第一块所占比例 支持 百分比/像素 */
    firstRatio?: string
    /** 第一块最小大小 */
    firstMinSize?: string | number
    /** 第一块内容 */
    firstNode: any
    /** 第一块内容box样式 */
    firstNodeStyle?: React.CSSProperties

    /** 第二块所占比例 支持 百分比/像素 */
    secondRatio?: string
    /** 第二块最小大小 */
    secondMinSize?: string | number
    /** 第二块内容 */
    secondNode: any
    /** 第二块内容box样式 */
    secondNodeStyle?: React.CSSProperties

    /** 主样式 */
    style?: React.CSSProperties
    /** 不允许拖动时 拖拽线样式 */
    lineStyle?: React.CSSProperties
    /** 鼠标抬起时的回调 */
    onMouseUp?: () => void
}

export const ResizeBox: React.FC<ResizeBoxProps> = React.memo((props) => {
    const {
        isVer = false,
        dragResize = false,
        freeze = true,
        firstRatio = "50%",
        firstMinSize = "100px",
        firstNode,
        firstNodeStyle,
        secondRatio = "50%",
        secondMinSize = "100px",
        secondNode,
        secondNodeStyle,
        style,
        lineStyle,
        onMouseUp
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

    // 拖拽时移动 缓存
    const dragFirstSize = useRef<number>()
    const dragSecondSize = useRef<number>()

    // 拖拽时移动
    const dragMoveSize = useMemoizedFn((size: number) => {
        if (!firstRef || !firstRef.current) return
        if (!secondRef || !secondRef.current) return
        if (!dragFirstSize.current || !dragSecondSize.current) return
        const first = firstRef.current as unknown as HTMLDivElement
        const second = secondRef.current as unknown as HTMLDivElement
        const firstSize = `${dragFirstSize.current + size}px`
        const secondSize = `${dragSecondSize.current - size}px`
        if (isVer) {
            first.style.height = firstSize
            second.style.height = secondSize
        } else {
            first.style.width = firstSize
            second.style.width = secondSize
        }
    })

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

        if (onMouseUp) onMouseUp()
    })
    // 页面大小变化时重新计算 第一/第二 块内容宽高
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
            // 重新计算时按照之前比例赋予新宽高
            if (isVer) {
                first.style.height = `${(bodySize * firstSize) / (firstSize + secondSize)}px`
                second.style.height = `${(bodySize * secondSize) / (firstSize + secondSize)}px`
            } else {
                first.style.width = `${(bodySize * firstSize) / (firstSize + secondSize)}px`
                second.style.width = `${(bodySize * secondSize) / (firstSize + secondSize)}px`
            }
        }
    }
    // 拖动开始 - 鼠标按下
    const moveStart = useMemoizedFn(() => {
        if (!maskRef || !maskRef.current) return
        ;(maskRef.current as unknown as HTMLDivElement).style.display = "block"
        // 实时拖动缓存
        if (!firstRef || !firstRef.current) return
        if (!secondRef || !secondRef.current) return
        if (dragResize) {
            const first = firstRef.current as unknown as HTMLDivElement
            const second = secondRef.current as unknown as HTMLDivElement
            dragFirstSize.current = isVer ? first.clientHeight : first.clientWidth
            dragSecondSize.current = isVer ? second.clientHeight : second.clientWidth
        }
    })
    // 拖动结束 - 鼠标抬起
    const moveEnd = useMemoizedFn(() => {
        if (!maskRef || !maskRef.current) return
        ;(maskRef.current as unknown as HTMLDivElement).style.display = "none"
        // 实时拖动缓存-还原
        dragFirstSize.current = undefined
        dragSecondSize.current = undefined
    })

    useEffect(() => {
        if (firstRenderRef.current) return
        bodyResize()
    }, [bodyWidth, bodyHeight])

    return (
        <div ref={bodyRef} style={{...style, flexFlow: `${isVer ? "column" : "row"}`}} className={styles["resize-box"]}>
            <ReactResizeDetector
                onResize={(width, height) => {
                    if (!width || !height) return
                    // 第一次进入时记录宽高 优化后续性能
                    if (firstRenderRef.current) {
                        perBodyWidth.current = width
                        perBodyHeight.current = height
                        firstRenderRef.current = false
                        return
                    }
                    if (isVer) {
                        if (perBodyHeight.current === height) return
                        perBodyHeight.current = height
                        setBodyHeight(height)
                    } else {
                        if (perBodyWidth.current === width) return
                        perBodyWidth.current = width
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
                    height: isVer ? (firstRatio === "50%" ? `calc(100% - ${secondRatio} - 6px)` : firstRatio) : "100%",
                    padding: `${isVer ? "0 0 2px 0" : "0 2px 0 0 "}`,
                    overflow: "hidden",
                    ...firstNodeStyle
                }}
            >
                {typeof firstNode === "function" ? firstNode() : firstNode}
            </div>
            {freeze ? (
                <div
                    ref={lineRef}
                    style={{
                        width: `${isVer ? "100%" : "8px"}`,
                        height: `${isVer ? "8px" : "100%"}`,
                        cursor: `${isVer ? "row-resize" : "col-resize"}`
                    }}
                    className={classNames({
                        [styles["resize-split-line"]]: freeze
                    })}
                >
                    <div
                        className={classNames(styles["resize-split-line-in"], {
                            [styles["resize-split-line-in-ver"]]: isVer,
                            [styles["resize-split-line-in-nover"]]: !isVer
                        })}
                    />
                </div>
            ) : (
                <div style={lineStyle} />
            )}
            <div
                ref={secondRef}
                style={{
                    width: isVer ? "100%" : firstRatio === "50%" ? secondRatio : `calc(100% - ${firstRatio})`,
                    height: isVer ? (firstRatio === "50%" ? secondRatio : `calc(100% - ${firstRatio} - 6px)`) : "100%",
                    padding: `${isVer ? "2px 0 0 0" : "0 0 0 2px"}`,
                    overflow: "hidden",
                    ...secondNodeStyle
                }}
            >
                {typeof secondNode === "function" ? secondNode() : secondNode}
            </div>
            {freeze && (
                <ResizeLine
                    isVer={isVer}
                    bodyRef={bodyRef}
                    resizeRef={lineRef}
                    minSize={firstMinSize}
                    maxSize={secondMinSize}
                    onStart={moveStart}
                    onEnd={moveEnd}
                    onMouseUp={moveSize}
                    dragMoveSize={dragMoveSize}
                    dragResize={dragResize}
                />
            )}
            {/* 拖拽时给予遮罩层 */}
            <div ref={maskRef} className={styles["mask-body"]} />
        </div>
    )
})
