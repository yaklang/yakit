import React, {useEffect, useMemo, useRef, useState} from "react"
import {Divider} from "antd"
import {} from "@ant-design/icons"
import {useCreation, useGetState, useInterval, useMemoizedFn, useUpdateEffect} from "ahooks"
import styles from "./CodeScanExecuteResult.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {HoldGRPCStreamProps, StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {EngineConsole} from "@/components/baseConsole/BaseConsole"
import PluginTabs from "@/components/businessUI/PluginTabs/PluginTabs"
import {LocalPluginLog} from "@/pages/plugins/operator/pluginExecuteResult/LocalPluginLog"
import {CodeScanResult} from "../CodeScanResultTable/CodeScanResultTable"
import {CodeScanRisksTable} from "../CodeScanRisksTable/CodeScanRisksTable"
const {ipcRenderer} = window.require("electron")
const {TabPane} = PluginTabs
export interface CodeScanStreamInfo {
    logState: StreamResult.Log[]
}

export interface CodeScanExecuteResultProps {
    runtimeId: string
    streamInfo: CodeScanStreamInfo
    isExecuting: boolean
    defaultActiveKey?: string
    codeScanExecuteResultWrapper?: string
}
export const CodeScanExecuteResult: React.FC<CodeScanExecuteResultProps> = (props) => {
    const {streamInfo, runtimeId, isExecuting, defaultActiveKey, codeScanExecuteResultWrapper = ""} = props

    const [allTotal, setAllTotal] = useState<number>(0)
    const [tempTotal, setTempTotal] = useState<number>(0) // 在risk表没有展示之前得临时显示在tab上得小红点计数
    const [interval, setInterval] = useState<number | undefined>(1000)

    useUpdateEffect(() => {
        setAllTotal(0)
        setTempTotal(0)
        setInterval(1000)
    }, [runtimeId])

    useInterval(() => {
        if (runtimeId) getTotal()
    }, interval)

    const getTotal = useMemoizedFn(() => {
        // const params: QueryRisksRequest = {
        //     ...defQueryRisksRequest,
        //     Pagination: {
        //         ...defQueryRisksRequest.Pagination,
        //         Page: 1,
        //         Limit: 1
        //     },
        //     RuntimeId: runtimeId
        // }
        // apiQueryRisks(params).then((allRes) => {
        //     if (+allRes.Total > 0) {
        //         setTempTotal(+allRes.Total)
        //     }
        // })
    })

    /**
     * 漏洞风险tab没有点击之前，tabContent不会渲染展示；不会请求数据
     * 强制渲染得话，组件内部不会请求数据
     * 采取：没有点击漏洞风险tab之前，由外面根据runtimeId查询是否有数据，有数据就展示对应得tab,以里面传出来得total为准，total>0后停止外面得useInterval，
     */
    const onSetRiskTotal = useMemoizedFn((total) => {
        if (total > 0) {
            setAllTotal(total)
            if (interval) setInterval(undefined)
        }
    })

    const renderTabContent = useMemoizedFn((ele: HoldGRPCStreamProps.InfoTab) => {
        switch (ele.type) {
            case "risk":
                return <CodeScanRisksTable runtimeId={runtimeId} allTotal={allTotal} setAllTotal={onSetRiskTotal} />
            case "result":
                return <CodeScanResult isExecuting={isExecuting} runtimeId={runtimeId} />
            case "log":
                return <LocalPluginLog loading={isExecuting} list={streamInfo.logState} />
            case "console":
                return <EngineConsole isMini={true} />
            default:
                return <></>
        }
    })

    const showTabs = useMemo(() => {
        return [
            {tabName: "审计结果", type: "result"},
            {tabName: "漏洞与风险", type: "risk"},
            {tabName: "日志", type: "log"},
            {tabName: "Console", type: "console"}
        ]
    }, [])

    const tabBarRender = useMemoizedFn((tab: HoldGRPCStreamProps.InfoTab, length: number) => {
        if (tab.type === "risk") {
            return (
                <>
                    {tab.tabName}
                    <span className={styles["code-scan-execute-result-tabBar"]}>{length}</span>
                </>
            )
        }
        return tab.tabName
    })

    const showRiskTotal = useCreation(() => {
        if (allTotal > 0) return allTotal
        return tempTotal
    }, [allTotal, tempTotal])
    return (
        <div className={classNames(styles["code-scan-execute-result"], codeScanExecuteResultWrapper)}>
            {showTabs.length > 0 && (
                <PluginTabs defaultActiveKey={defaultActiveKey}>
                    {showTabs.map((ele) => (
                        <TabPane
                            tab={tabBarRender(ele, showRiskTotal)}
                            key={ele.tabName}
                            className={styles["code-scan-execute-result-tabPane"]}
                        >
                            {renderTabContent(ele)}
                        </TabPane>
                    ))}
                </PluginTabs>
            )}
        </div>
    )
}
