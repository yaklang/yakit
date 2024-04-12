import React, {CSSProperties, memo, useEffect, useMemo, useRef, useState} from "react"
import {YakitCollapseTextProps} from "./YakitCollapseTextType"
import {useMemoizedFn} from "ahooks"
import classNames from "classnames"
import styles from "./YakitCollapseText.module.scss"

/**
 * @name 可展开收起的段落组件
 * @description 只适合纯文字
 */
export const YakitCollapseText: React.FC<YakitCollapseTextProps> = memo((props) => {
    const {content, rows = 3, lineHeight = 16, fontSize = 12, wrapperClassName} = props

    /** 内容行高 */
    const textStyle = useMemo(() => {
        const styles: CSSProperties = {}
        if (fontSize) styles["fontSize"] = `${fontSize || 12}px`
        if (lineHeight) styles["lineHeight"] = `${lineHeight || 16}px`
        if (rows) styles["maxHeight"] = `${rows * (lineHeight || 16)}px`

        return styles
    }, [rows, lineHeight])

    const [showExpand, setShowExpand] = useState<boolean>(false)
    const [isExpand, setIsExpand] = useState<boolean>(false)

    const textRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (textRef && textRef.current) {
            const {clientHeight, scrollHeight} = textRef.current
            if (scrollHeight > clientHeight) {
                setIsExpand(false)
                setShowExpand(true)
            } else {
                setShowExpand(false)
            }
        }
    }, [textRef.current, content])

    /** 是否展开的样式 */
    const expandStyle = useMemo(() => {
        const styles: CSSProperties = {}
        if (showExpand) {
            if (isExpand) {
                styles["maxHeight"] = "unset"
            }
        }
        return styles
    }, [showExpand, isExpand])

    const onExpand = useMemoizedFn(() => {
        setIsExpand(!isExpand)
    })

    return (
        <div className={classNames(styles["yakit-collapse-text"], wrapperClassName)}>
            <div ref={textRef} style={{...textStyle, ...expandStyle}} className={styles["text-wrapper"]}>
                {content}
            </div>
            {showExpand && (
                <div className={styles["expand-btn"]} onClick={onExpand} title={content}>
                    {isExpand ? "收起" : "展开"}
                </div>
            )}
        </div>
    )
})
