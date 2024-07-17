import React, {useEffect, useRef, useState} from "react"
import {useMemoizedFn, useClickAway} from "ahooks"
import ReactResizeDetector from "react-resize-detector"
import classNames from "classnames"
import styles from "./YakitResizeBox.module.scss"

// 将像素与number都返回为number
const convertToNumber = (value: string | number): number | null => {
    if (typeof value === "string" && value.endsWith("px")) {
        return parseInt(value, 10)
    } else if (typeof value === "number") {
        return value
    } else {
        return null
    }
}

export interface YakitResizeLineProps {
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

export const YakitResizeLine: React.FC<YakitResizeLineProps> = (props) => {
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

    const lineRef = useRef<HTMLDivElement>(null)

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
        const line = lineRef.current
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
            const body = bodyRef.current
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
        const body = bodyRef.current
        const resize = resizeRef.current

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
    }, [min,max])

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

export interface YakitResizeBoxProps {
    /** 是否为竖向拖拽 默认横向拖拽 */
    isVer?: boolean
    /** 是否拖拽立即生效 默认为拖拽完成生效 */
    dragResize?: boolean
    /** 是否允许拖拽 默认可拖拽 */
    freeze?: boolean
    /** 是否默认展示浅色线条样式 */
    isShowDefaultLineStyle?: boolean
    /** body改变时是否重新计算宽高 */
    isRecalculateWH?: boolean
    /** 线条占据空间的方向 */
    lineDirection?: "top" | "bottom" | "left" | "right"
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
    lineInStyle?: React.CSSProperties
    /** 鼠标抬起时的回调 */
    onMouseUp?: (firstSize:number,secondSizeNum:number) => void
}

export const YakitResizeBox: React.FC<YakitResizeBoxProps> = React.memo((props) => {
    const {
        isVer = false,
        dragResize = false,
        freeze = true,
        isShowDefaultLineStyle = true,
        isRecalculateWH = true,
        lineDirection,
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
        lineInStyle,
        onMouseUp
    } = props

    const bodyRef = useRef<HTMLDivElement>(null)
    const firstRef = useRef<HTMLDivElement>(null)
    const secondRef = useRef<HTMLDivElement>(null)
    const lineRef = useRef<HTMLDivElement>(null)
    const maskRef = useRef<HTMLDivElement>(null)
    const [bodyWidth, setBodyWidth] = useState<number>(0)
    const [bodyHeight, setBodyHeight] = useState<number>(0)
    let firstRenderRef = useRef<boolean>(true)
    let perBodyWidth = useRef<number>()
    let perBodyHeight = useRef<number>()

    // 拖拽时移动 缓存
    const dragFirstSize = useRef<number>()
    const dragSecondSize = useRef<number>()

    // 最小值（存在 firstMinSize + secondMinSize > 整个控件）对此特殊情况额外处理，按照比例直接分配
    const [FirstMinSize, setFirstMinSize] = useState<string | number>()
    const [SecondMinSize, setSecondMinSize] = useState<string | number>(secondMinSize)

    useEffect(() => {
        setFirstMinSize(firstMinSize)
    }, [firstMinSize])

    // 特殊情况处理
    const specialSizeFun = useMemoizedFn((size: number) => {
        const firstMin = convertToNumber(firstMinSize)
        const secondMin = convertToNumber(secondMinSize)
        if (firstMin && secondMin) {
            const limitMax = size - 8 //(拖拽线条预留 8)
            if (firstMin + secondMin > limitMax) {
                const ratioFirst = firstMin / (firstMin + secondMin)
                const ratioSecond = secondMin / (firstMin + secondMin)
                const countFirst = Math.floor(limitMax * ratioFirst)
                const countSecond = Math.floor(limitMax * ratioSecond)
                // 考虑余数，将多余的部分分配给其中一个值
                const remainder = limitMax - (countFirst + countSecond)
                // 此处，将余数都分配给 First，可以根据需求调整
                const adjustedCountFirst = countFirst + remainder
                setFirstMinSize(adjustedCountFirst)
                setSecondMinSize(countSecond)
            }
        }
    })

    // 拖拽时移动
    const dragMoveSize = useMemoizedFn((size: number) => {
        if (!firstRef || !firstRef.current) return
        if (!secondRef || !secondRef.current) return
        if (!dragFirstSize.current || !dragSecondSize.current) return
        const first = firstRef.current
        const second = secondRef.current
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
        const first = firstRef.current
        const second = secondRef.current
        const firstSizeNum = isVer ? first.clientHeight + size : first.clientWidth + size
        const secondSizeNum = isVer ? second.clientHeight - size : second.clientWidth - size
        const firstSize = `${firstSizeNum}px`
        const secondSize = `${secondSizeNum}px`

        if (isVer) {
            first.style.height = firstSize
            second.style.height = secondSize
        } else {
            first.style.width = firstSize
            second.style.width = secondSize
        }

        if (onMouseUp) onMouseUp(firstSizeNum,secondSizeNum)
    })
    // 页面大小变化时重新计算 第一/第二 块内容宽高
    const bodyResize = (bodysize?: number) => {
        if (!isRecalculateWH) return
        if (!bodyRef || !bodyRef.current) return
        if (!firstRef || !firstRef.current) return
        if (!secondRef || !secondRef.current) return
        const body = bodyRef.current
        const first = firstRef.current
        const second = secondRef.current
        const bodySize = bodysize || (isVer ? body.clientHeight : body.clientWidth)
        const firstSize = isVer ? first.clientHeight : first.clientWidth
        const secondSize = isVer ? second.clientHeight : second.clientWidth

        if (bodySize) {
            // 重新计算时按照之前比例赋予新宽高
            if (isVer) {
                const firstHeight = (bodySize * firstSize) / (firstSize + secondSize)
                const secondHeight = (bodySize * secondSize) / (firstSize + secondSize)
                first.style.height = `${firstHeight}px`
                second.style.height = `${secondHeight}px`
            } else {
                const firstWidth = (bodySize * firstSize) / (firstSize + secondSize)
                const secondWidth = (bodySize * secondSize) / (firstSize + secondSize)
                first.style.width = `${firstWidth}px`
                second.style.width = `${secondWidth}px`
            }
        }
    }
    // 拖动开始 - 鼠标按下
    const moveStart = useMemoizedFn(() => {
        if (!maskRef || !maskRef.current) return
        maskRef.current.style.display = "block"
        // 实时拖动缓存
        if (!firstRef || !firstRef.current) return
        if (!secondRef || !secondRef.current) return
        if (dragResize) {
            const first = firstRef.current
            const second = secondRef.current
            dragFirstSize.current = isVer ? first.clientHeight : first.clientWidth
            dragSecondSize.current = isVer ? second.clientHeight : second.clientWidth
        }
    })
    // 拖动结束 - 鼠标抬起
    const moveEnd = useMemoizedFn(() => {
        if (!maskRef || !maskRef.current) return
        maskRef.current.style.display = "none"
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
                    specialSizeFun(isVer ? height : width)
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
                    minWidth: isVer ? "auto" : FirstMinSize,
                    minHeight: isVer ? FirstMinSize : "auto",
                    height: isVer
                        ? firstRatio === "50%"
                            ? `calc(100% - ${secondRatio} - ${freeze ? "8px" : "0px"})`
                            : firstRatio
                        : "100%",
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
                        cursor: `${isVer ? "row-resize" : "col-resize"}`,
                        ...lineStyle
                    }}
                    className={classNames(styles["resize-split-line"], {
                        [styles["resize-split-line-top"]]: lineDirection === "top" && isVer,
                        [styles["resize-split-line-bottom"]]: lineDirection === "bottom" && isVer,
                        [styles["resize-split-line-left"]]: lineDirection === "left" && !isVer,
                        [styles["resize-split-line-right"]]: lineDirection === "right" && !isVer
                    })}
                >
                    <div
                        style={{
                            ...lineInStyle
                        }}
                        className={classNames({
                            [styles["resize-split-line-in"]]: isShowDefaultLineStyle,
                            [styles["resize-split-line-in-hide"]]: !isShowDefaultLineStyle,
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
                    minWidth: isVer ? "auto" : SecondMinSize,
                    minHeight: isVer ? SecondMinSize : "auto",
                    height: isVer
                        ? firstRatio === "50%"
                            ? secondRatio
                            : `calc(100% - ${firstRatio} - ${freeze ? "8px" : "0px"})`
                        : "100%",
                    padding: `${isVer ? "2px 0 0 0" : "0 0 0 2px"}`,
                    overflow: "hidden",
                    ...secondNodeStyle
                }}
            >
                {typeof secondNode === "function" ? secondNode() : secondNode}
            </div>
            {freeze && (
                <YakitResizeLine
                    isVer={isVer}
                    bodyRef={bodyRef}
                    resizeRef={lineRef}
                    minSize={FirstMinSize}
                    maxSize={SecondMinSize}
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
