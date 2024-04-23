import React, {useState} from "react"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {useMemoizedFn} from "ahooks"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {setRemoteValue} from "@/utils/kv"
import {EngineRemoteGV} from "@/enums/engine"
import {YaklangEngineMode} from "@/yakitGVDefine"

import styles from "./CheckEngineVersion.module.scss"

interface CheckEngineVersionProps {
    engineMode: YaklangEngineMode
    currentVersion: string
    builtInVersion: string
    visible: boolean
    onCancel: (flag: boolean) => any
}

/** @name Yakit软件更新下载弹窗 */
export const CheckEngineVersion: React.FC<CheckEngineVersionProps> = React.memo((props) => {
    const {engineMode, visible, currentVersion, builtInVersion, onCancel} = props

    const [loading, setLoading] = useState<boolean>(false)

    const [noPrompt, setNoPrompt] = useState<boolean>(false)

    const onSubmit = useMemoizedFn(() => {
        if (loading) return
        setRemoteValue(EngineRemoteGV.RemoteCheckEngineVersion, `${noPrompt}`)
        onCancel(true)
        setTimeout(() => {
            setLoading(false)
        }, 500)
    })
    const onClose = useMemoizedFn(() => {
        setRemoteValue(EngineRemoteGV.RemoteCheckEngineVersion, `${noPrompt}`)
        onCancel(false)
    })

    return (
        <YakitHint
            visible={visible}
            title='引擎版本过低'
            content={
                <div>
                    检测到当前使用的引擎版本过低，可能会影响部分功能的使用，建议立即更新引擎版本。
                    <div>当前版本 : {currentVersion}</div>
                    <div>建议版本 : {builtInVersion}</div>
                </div>
            }
            footerExtra={
                <div className={styles["check-engine-version-checkbox"]}>
                    <YakitCheckbox value={noPrompt} onChange={(e) => setNoPrompt(e.target.checked)}>
                        不再提醒
                    </YakitCheckbox>
                </div>
            }
            okButtonText='立即更新'
            okButtonProps={{loading: loading, style: {display: engineMode === "remote" ? "none" : ""}}}
            onOk={onSubmit}
            cancelButtonText={engineMode === "remote" ? "知道了" : "忽略"}
            onCancel={onClose}
        />
    )
})
