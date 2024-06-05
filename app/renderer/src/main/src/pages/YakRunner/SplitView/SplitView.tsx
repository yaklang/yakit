import React, {memo, useEffect, useRef, useState} from "react"
import {useCreation, useMemoizedFn, useThrottleFn} from "ahooks"
import {OffsetCoordinate, SashMouseFunc, SplitViewPositionProp, SplitViewProp} from "./SplitViewType"
import {calculateOffsetRange, generateKnownSplitSize, offsetSplitPosition, resizedSplitSize} from "./utils"
import {v4 as uuidv4} from "uuid"

import classNames from "classnames"
import styles from "./SplitView.module.scss"

export const SplitView: React.FC<SplitViewProp> = memo((props) => {
    const {isVertical = false, elements = [], minWidth = 220, minHeight = 200, isLastHidden} = props

    const [isVer, _] = useState<boolean>(isVertical || false)

    const wrapperRef = React.useRef<HTMLDivElement>(null)
    const wrapperId = useCreation(() => uuidv4(), [])

    // 分屏总(宽|高)是否超过容器(宽|高)
    const [isOver, setIsOver] = useState<boolean>(false)

    /** ---------- view信息相关逻辑 Start ---------- */
    /** view的唯一ID */
    const viewIDs = useRef<string[]>([])
    /** view的width|height|left|top */
    const positions = useRef<SplitViewPositionProp[]>([])
    /** view对应div的dom实例 */
    const divs = useRef<HTMLDivElement[] | null[]>([])

    // 计算各个view的唯一id
    const setViewIDs = useMemoizedFn(() => {
        const newLength = elements.length
        const oldLength = viewIDs.current.length
        if (newLength === oldLength) return
        if (newLength > oldLength) {
            for (let i = oldLength; i < newLength; i++) {
                viewIDs.current.push(uuidv4())
            }
        }
        if (newLength < oldLength) {
            viewIDs.current = [...viewIDs.current.slice(0, newLength)]
        }
    })

    /** 分割线的唯一ID */
    const sashIDs = useRef<string[]>([])
    /** 分割线对应div的dom实例 */
    const sashDivs = useRef<HTMLDivElement[] | null[]>([])

    // 计算各个sash的唯一id
    const setSashIDs = useMemoizedFn(() => {
        const newLength = elements.length - 1
        const oldLength = sashIDs.current.length
        if (newLength === oldLength) return
        if (newLength > oldLength) {
            for (let i = oldLength; i < newLength; i++) {
                sashIDs.current.push(uuidv4())
            }
        }
        if (newLength < oldLength) {
            sashIDs.current = [...viewIDs.current.slice(0, newLength)]
        }
    })

    // 计算各个view的位置和尺寸信息
    const setPosition = useMemoizedFn(() => {
        if (!wrapperRef || !wrapperRef.current) return

        const {width, height} = wrapperRef.current.getBoundingClientRect()
        const long = isVer ? height : width
        const min = isVer ? minHeight : minWidth
        const length = elements.length
        // 这里的乘1是指分割线的占位宽度
        const viewsMinLong = length * min + (length - 1) * 1
        if (viewsMinLong >= long) setIsOver(true)
        else setIsOver(false)

        const sizes = generateKnownSplitSize({
            isVertical: isVer,
            wrapperLong: long,
            minLong: min,
            length: length,
            isOver: viewsMinLong >= long
        })
        positions.current = [...sizes]
        setViewAndSashStyle()
    })
    /** 设置view和sash的样式 */
    const setViewAndSashStyle = useMemoizedFn(() => {
        if (positions.current.length <= 0) return
        for (let i = 0; i < positions.current.length; i++) {
            const {width, height, left, top} = positions.current[i]

            // 设置view的样式
            const divDom = divs.current[i]
            if (divDom) {
                if (isVer) {
                    divDom.style.height = `${height}px`
                    divDom.style.top = `${top}px`
                    // 以下代码为对第二块的隐藏 而不销毁重新创建
                    if(isLastHidden && i === 0){
                        divDom.style.height = "100%"
                    }
                    divDom.style.display = "block"
                    if(isLastHidden && positions.current.length=== i+1){
                        divDom.style.display = "none"
                    }
                } else {
                    divDom.style.width = `${width}px`
                    divDom.style.left = `${left}px`
                }
            }

            // 设置sash的样式
            if (i === 0) continue
            const sashDom = sashDivs.current[i - 1]
            if (sashDom) {
                if (isVer) {
                    sashDom.style.top = `${top - 1}px`
                } else {
                    sashDom.style.left = `${left - 1}px`
                }
            }
        }
    })

    useEffect(() => {
        setViewIDs()
        setSashIDs()
        setPosition()
    }, [elements.length,isLastHidden])
    /** ---------- view信息相关逻辑 End ---------- */

    /** ---------- 监听容器整体尺寸大小变化 Start ---------- */
    const onWrapperResize = useThrottleFn(
        useMemoizedFn((size: DOMRectReadOnly) => {
            // 判断分屏总(宽|高)是否超过容器(宽|高)
            const {width, height} = size
            const long = isVer ? height : width
            const min = isVer ? minHeight : minWidth
            const length = elements.length
            // 这里的乘1是指分割线的占位宽度
            const viewsMinLong = length * min + (length - 1) * 1
            if (viewsMinLong >= long) setIsOver(true)
            else setIsOver(false)

            const sizes = resizedSplitSize({
                isVertical: isVer,
                resizeLong: long,
                minLong: min,
                positions: positions.current,
                isOver: viewsMinLong >= long
            })
            if (!sizes) return
            positions.current = [...sizes]
            setViewAndSashStyle()
        }),
        {wait: 10}
    ).run

    const wrapperResizeObserver = useCreation(() => {
        return new ResizeObserver((entries: ResizeObserverEntry[]) => {
            for (let entry of entries) {
                try {
                    const {dataset} = (entry.target as HTMLDivElement) || {}
                    if (!dataset) continue
                    const {splitViewId} = dataset || {}
                    if (splitViewId === wrapperId) {
                        onWrapperResize(entry.contentRect)
                        break
                    }
                } catch (error) {}
            }
        })
    }, [])

    const isListener = React.useRef<boolean>(false)
    useEffect(() => {
        if (isListener.current) return
        if (wrapperRef && wrapperRef.current) {
            isListener.current = true
            wrapperResizeObserver.observe(wrapperRef.current)
        }
    }, [wrapperRef.current])
    useEffect(() => {
        return () => {
            if (isListener.current) isListener.current = false
            if (wrapperRef.current) wrapperResizeObserver.unobserve(wrapperRef.current)
        }
    }, [])
    /** ---------- 监听组件整体尺寸大小变化 End ---------- */

    /** ---------- 分割线移动逻辑 Start ---------- */
    // 是否进入移动分割线状态
    const [isDown, setIsDown] = useState<boolean>(false)
    // 正在移动的分割线索引
    const indexSash = useRef<number>(-1)
    // 分割线开始移动的起始位置
    const startOffset = useRef<OffsetCoordinate>({x: -1, y: -1})
    const alreadyOffset = useRef<number>(0)

    const onSashMouseDown: SashMouseFunc = useMemoizedFn((index, e) => {
        if (isOver) {
            setIsDown(false)
            indexSash.current = -1
            startOffset.current = {x: -1, y: -1}
            alreadyOffset.current = 0
            return
        }
        setIsDown(true)
        indexSash.current = index
        startOffset.current = {x: e.clientX, y: e.clientY}
        alreadyOffset.current = 0
    })

    const onSashMouseUp = useMemoizedFn((e: MouseEvent) => {
        setIsDown(false)
        indexSash.current = -1
        startOffset.current = {x: -1, y: -1}
        alreadyOffset.current = 0
    })

    const onSashMove = useMemoizedFn((e: MouseEvent) => {
        if (isOver) return
        if (!isDown) return
        if (indexSash.current < 0) return
        if (startOffset.current.x < 0 || startOffset.current.y < 0) return

        positionMoveing(indexSash.current, e)
    })
    const positionMoveing = useThrottleFn(
        useMemoizedFn((index: number, e: MouseEvent) => {
            const {clientX, clientY} = e
            const coordnate = isVer ? clientY : clientX

            let range = [0, 0]
            if (wrapperRef.current) {
                range = calculateOffsetRange({
                    length: elements.length,
                    sashIndex: index,
                    rect: wrapperRef.current.getBoundingClientRect(),
                    isVertical: isVer,
                    minLong: isVer ? minHeight : minWidth
                })
            }
            if (range[0] === 0 && range[1] === 0) return
            // 防止鼠标不在分割线位置时,持续移动
            if (coordnate < range[0] || coordnate > range[1]) return

            const offset = isVer ? clientY - startOffset.current.y : clientX - startOffset.current.x

            const pss = offsetSplitPosition({
                isVertical: isVer,
                minLong: isVer ? minHeight : minWidth,
                positions: positions.current,
                index: index,
                offset: offset - alreadyOffset.current
            })
            alreadyOffset.current = offset

            if (!pss) return

            positions.current = [...pss]
            setViewAndSashStyle()
        }),
        {wait: 5}
    ).run

    useEffect(() => {
        if (wrapperRef.current) {
            document.addEventListener("mouseup", onSashMouseUp)
            wrapperRef.current.addEventListener("mousemove", onSashMove)
            return () => {
                document?.removeEventListener("mouseup", onSashMouseUp)
                wrapperRef.current?.removeEventListener("mousemove", onSashMove)
            }
        }
    }, [wrapperRef.current])
    /** ---------- 分割线移动逻辑 End ---------- */

    return (
        <div ref={wrapperRef} data-split-view-id={wrapperId} className={styles["split-view"]}>
            {/* 位移线 */}
            <div className={classNames(styles["sash-container"], {[styles["hover"]]: !isOver})}>
                {elements.map((item, index) => {
                    if (index === elements.length - 1) return null
                    return (
                        <div
                            ref={(ref) => (sashDivs.current[index] = ref)}
                            key={sashIDs[index] || `sash-${wrapperId}-${index}`}
                            className={classNames(styles["split-view-sash"], {
                                [styles["vertical"]]: isVer,
                                [styles["horizontal"]]: !isVer,
                                [styles["active"]]: isDown && indexSash.current === index
                            })}
                            onMouseDown={(e) => onSashMouseDown(index, e)}
                        ></div>
                    )
                })}
            </div>

            {/* 分屏区域 */}
            <div
                className={classNames(styles["split-view-element"], {
                    [styles["vertical"]]: isVer,
                    [styles["horizontal"]]: !isVer,
                    [styles["active"]]: isDown
                })}
            >
                <div className={styles["split-view-container"]}>
                    {elements.map((item, index) => {
                        return (
                            <div
                                ref={(ref) => (divs.current[index] = ref)}
                                key={viewIDs[index] || `view-${wrapperId}-${index}`}
                                className={styles["element-view"]}
                                style={{minWidth: minWidth}}
                            >
                                {elements[index]?.element || null}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
})
