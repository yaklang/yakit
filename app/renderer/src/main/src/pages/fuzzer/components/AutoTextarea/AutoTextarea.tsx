import {useMemoizedFn} from "ahooks"
import React, {useRef} from "react"
import styles from "./AutoTextarea.module.scss"
import classNames from "classnames"

interface AutoTextareaProps {
    className?: string
    placeholder?: string
    value?:string
    onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
}
export const AutoTextarea: React.FC<AutoTextareaProps> = React.memo((props) => {
    const {onChange, className = "", ...restProps} = props
    const textareaRef = useRef<any>()
    const heightRef = useRef<number>(0)
    const onChangeText = useMemoizedFn(() => {
        const {scrollHeight} = textareaRef.current
        const height = scrollHeight > 70 ? 70 : scrollHeight
        if (heightRef.current !== height) {
            heightRef.current = height
            textareaRef.current.style.setProperty("--height", `${height}px`)
        }
    })
    return (
        <textarea
            rows={1}
            ref={textareaRef}
            {...restProps}
            className={classNames(styles["auto-textarea"], className)}
            onChange={(e) => {
                e.stopPropagation()
                onChangeText()
                if (onChange) onChange(e)
            }}
        />
    )
})
