import React, {useEffect, useMemo, useRef, useState} from "react"
import {} from "antd"
import {} from "@ant-design/icons"
import {useCreation, useGetState, useMemoizedFn} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./CodeScanExecuteResult.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {HoldGRPCStreamInfo, HoldGRPCStreamProps} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {EngineConsole} from "@/components/baseConsole/BaseConsole"
import PluginTabs from "@/components/businessUI/PluginTabs/PluginTabs"
import TabPane from "@ant-design/pro-card/lib/components/TabPane"
import {HorizontalScrollCard} from "@/pages/plugins/operator/horizontalScrollCard/HorizontalScrollCard"
const {ipcRenderer} = window.require("electron")
export interface CodeScanExecuteResultProps {
    runtimeId: string
    streamInfo: HoldGRPCStreamInfo
    loading: boolean
    defaultActiveKey?: string
    codeScanExecuteResultWrapper?: string
}
export const CodeScanExecuteResult: React.FC<CodeScanExecuteResultProps> = (props) => {
    const {streamInfo, runtimeId, loading, defaultActiveKey, codeScanExecuteResultWrapper = ""} = props

    const renderTabContent = useMemoizedFn((ele: HoldGRPCStreamProps.InfoTab) => {
        switch (ele.type) {
            case "risk":
                return <></>
            case "http":
                return <></>
            case "console":
                return <EngineConsole isMini={true} />
            default:
                return <></>
        }
    })

    const showTabs = useMemo(() => {
        // if (!tempTotal) {
        //     return streamInfo.tabsState.filter((item) => item.tabName !== "漏洞与风险")
        // }
        return streamInfo.tabsState
    }, [streamInfo.tabsState])

    const tabBarRender = useMemoizedFn((tab: HoldGRPCStreamProps.InfoTab, length: number) => {
        if (tab.type === "risk") {
            return (
                <>
                    {tab.tabName}
                    <span className={styles["plugin-execute-result-tabBar"]}>{length}</span>
                </>
            )
        }

        return tab.tabName
    })

    const cardState = useCreation(() => {
        return streamInfo.cardState.filter((item) => item.tag !== "no display")
    }, [streamInfo.cardState])

    return (
        <div className={classNames(styles["code-scan-execute-result"], codeScanExecuteResultWrapper)}>
            {cardState.length > 0 && (
                <div className={styles["plugin-execute-result-wrapper"]}>
                    <HorizontalScrollCard title={"Data Card"} data={cardState} />
                </div>
            )}
            {showTabs.length > 0 && (
                <PluginTabs defaultActiveKey={defaultActiveKey}>
                    {showTabs.map((ele) => (
                        <TabPane
                            tab={tabBarRender(ele, 1)}
                            key={ele.tabName}
                            className={styles["plugin-execute-result-tabPane"]}
                        >
                            {renderTabContent(ele)}
                        </TabPane>
                    ))}
                </PluginTabs>
            )}
        </div>
    )
}
