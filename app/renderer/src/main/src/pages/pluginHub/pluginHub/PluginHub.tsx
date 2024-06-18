import React, {memo, useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {PluginToDetailInfo} from "../type"
import {PluginHubList} from "../pluginHubList/PluginHubList"
import {PluginHubDetail, PluginHubDetailRefProps} from "../pluginHubDetail/PluginHubDetail"

import classNames from "classnames"
import "../../plugins/plugins.scss"
import styles from "./PluginHub.module.scss"

const {ipcRenderer} = window.require("electron")

const wrapperId = "yakit-plugin-hub"

interface PluginHubProps {}

export const PluginHub: React.FC<PluginHubProps> = memo((props) => {
    const {} = props

    const [isDetail, setIsDetail] = useState<boolean>(false)
    const handlePluginDetail = useMemoizedFn((info: PluginToDetailInfo) => {
        if (!isDetail) {
            setIsDetail(true)
        }
        sendPluginDetail(info)
    })
    // 回收站页面时，隐藏详情页
    const [hiddenDetail, setHiddenDetail] = useState<boolean>(false)

    /** ---------- 详情组件逻辑 Start ---------- */
    const detailRef = useRef<PluginHubDetailRefProps>(null)
    const sendPluginDetail = useMemoizedFn((info: PluginToDetailInfo) => {
        setTimeout(() => {
            if (detailRef && detailRef.current) {
                detailRef.current.handleSetPlugin({...info})
            }
        }, 50)
    })

    const onBack = useMemoizedFn(() => {
        setIsDetail(false)
    })
    /** ---------- 详情组件逻辑 End ---------- */

    return (
        <div id={wrapperId} className={styles["yakit-plugin-hub"]}>
            <div className={classNames(styles["list"], {[styles["out-list"]]: hiddenDetail || !isDetail})}>
                <PluginHubList
                    rootElementId={wrapperId}
                    isDetail={isDetail}
                    toPluginDetail={handlePluginDetail}
                    setHiddenDetailPage={setHiddenDetail}
                />
            </div>

            {isDetail && (
                <div className={classNames(styles["detail"], {[styles["hidden"]]: hiddenDetail})}>
                    <PluginHubDetail ref={detailRef} onBack={onBack} />
                </div>
            )}
        </div>
    )
})
