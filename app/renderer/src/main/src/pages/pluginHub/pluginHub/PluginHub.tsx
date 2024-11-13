import React, {memo, useEffect, useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {PluginToDetailInfo} from "../type"
import {PluginHubList} from "../pluginHubList/PluginHubList"
import {PluginHubDetail, PluginHubDetailRefProps} from "../pluginHubDetail/PluginHubDetail"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemotePluginGV} from "@/enums/plugin"
import {YakitGetOnlinePlugin} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"

import classNames from "classnames"
import "../../plugins/plugins.scss"
import styles from "./PluginHub.module.scss"

// const {ipcRenderer} = window.require("electron")

const wrapperId = "yakit-plugin-hub"

interface PluginHubProps {}

const PluginHub: React.FC<PluginHubProps> = memo((props) => {
    const {} = props

    useEffect(() => {
        getRemoteValue(RemotePluginGV.UpdateLocalPluginForMITMCLI).then((val) => {
            if (val !== "true") {
                setUpdateLocalHint(true)
            }
        })
    }, [])
    const [updateLocalHint, setUpdateLocalHint] = useState<boolean>(false)
    const [allDownloadHint, setAllDownloadHint] = useState<boolean>(false)
    const updateLocalHintOK = useMemoizedFn(() => {
        setRemoteValue(RemotePluginGV.UpdateLocalPluginForMITMCLI, "true")
        setAllDownloadHint(true)
        setUpdateLocalHint(false)
    })
    const updateLocalHintCancel = useMemoizedFn(() => {
        setRemoteValue(RemotePluginGV.UpdateLocalPluginForMITMCLI, "true")
        setUpdateLocalHint(false)
    })

    // 主动打开插件详情页时，是否需要主动跳到指定 tab 页面
    const [autoOpenDetailTab, setAutoOpenDetailTab] = useState<string>()

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
                    setAutoOpenDetailTab={setAutoOpenDetailTab}
                />
            </div>

            {isDetail && (
                <div className={classNames(styles["detail"], {[styles["hidden"]]: hiddenDetail})}>
                    <PluginHubDetail
                        ref={detailRef}
                        rootElementId={wrapperId}
                        onBack={onBack}
                        autoOpenDetailTab={autoOpenDetailTab}
                        setAutoOpenDetailTab={setAutoOpenDetailTab}
                    />
                </div>
            )}

            {/* mitm 新增 cli 参数，需要提示用户自动更新一遍本地插件内容 */}
            <YakitHint
                getContainer={document.getElementById(wrapperId) || undefined}
                wrapClassName={styles["update-local-hint"]}
                visible={updateLocalHint}
                title='更新提示'
                content='由于MITM插件参数升级，需要将插件重新下载一次方可正常使用'
                okButtonText='立即下载'
                cancelButtonText='忽略'
                onOk={updateLocalHintOK}
                onCancel={updateLocalHintCancel}
            />
            {/* 一键下载 */}
            {allDownloadHint && (
                <YakitGetOnlinePlugin visible={allDownloadHint} setVisible={() => setAllDownloadHint(false)} />
            )}
        </div>
    )
})

export default PluginHub
