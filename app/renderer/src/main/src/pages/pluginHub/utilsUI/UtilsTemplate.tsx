import React, {memo, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {setRemoteValue} from "@/utils/kv"

// import classNames from "classnames"
import styles from "./UtilsTemplate.module.scss"

interface RecycleOptFooterExtraProps {
    visible: boolean
    title: string
    content: string
    cacheKey: string
    onCallback: (isOk: boolean, cache: boolean) => any
}
/** @name 带不再提示选项的二次确认弹框*/
export const NoPromptHint: React.FC<RecycleOptFooterExtraProps> = memo((props) => {
    const {visible, title, content, cacheKey, onCallback} = props

    const [checked, setChecked] = useState<boolean>(false)
    const handleCallback = useMemoizedFn((isOK: boolean) => {
        const check = !!checked
        setChecked(false)
        if (isOK) {
            if (cacheKey && checked) {
                setRemoteValue(cacheKey, `${checked}`)
            }
            onCallback(true, check)
        } else {
            onCallback(false, false)
        }
    })

    const handleOK = useMemoizedFn(() => {
        handleCallback(true)
    })
    const handleCancel = useMemoizedFn(() => {
        handleCallback(false)
    })

    return (
        <YakitHint
            visible={visible}
            title={title || ""}
            content={content || ""}
            onOk={handleOK}
            onCancel={handleCancel}
            footerExtra={
                <YakitCheckbox checked={checked} onChange={(e) => setChecked(e.target.checked)}>
                    下次不再提醒
                </YakitCheckbox>
            }
        />
    )
})
