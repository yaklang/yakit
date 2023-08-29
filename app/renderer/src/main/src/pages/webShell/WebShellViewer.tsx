import {yakitFailed} from "@/utils/notification";
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin";
import styles from "@/pages/cve/CVETable.module.scss";
import fuzzerStyles from "@/pages/fuzzer/HttpQueryAdvancedConfig/HttpQueryAdvancedConfig.module.scss";
import React, {useEffect, useState} from "react";
import {useCreation, useMemoizedFn} from "ahooks";
import {PaginationSchema} from "@/pages/invoker/schema";
import {WebShellTable} from "@/pages/webShell/WebShellTable";
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch";
import {Divider, Form, Tooltip} from "antd";
import {FromLayoutProps} from "@/pages/invoker/YakScriptCreator";
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {HollowLightningBoltIcon, InformationCircleIcon, PlusSmIcon} from "@/assets/newIcon";
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber";
import {CustomCodecList} from "@/pages/webShell/CustomCodec";


export interface WebShellManagerViewerProp {
}

const {ipcRenderer} = window.require("electron")
const {YakitPanel} = YakitCollapse


export const WebShellViewer: React.FC<WebShellManagerViewerProp> = (props) => {
    const [params, setParams] = useState<QueryWebShellRequest>(defQueryWebShellRequest)
    const [advancedQuery, setAdvancedQuery] = useState<boolean>(true)
    const [loading, setLoading] = useState(false)
    const [available, setAvailable] = useState(false)
    useEffect(() => {
        onIsCVEDatabaseReady()
    }, [])
    const onIsCVEDatabaseReady = useMemoizedFn(() => {
        setLoading(true)
        setAvailable(true)
        setTimeout(() => setLoading(false), 200)
    })
    console.log(loading, available, advancedQuery)
    return loading ? (
        <YakitSpin spinning={true} style={{alignItems: "center", paddingTop: 150}}/>
    ) : (
        <div className={styles["cve-viewer"]}>
            {available && advancedQuery && (
                <WebShellQuery
                    onChange={setParams}
                    defaultParams={params}
                    advancedQuery={advancedQuery}
                    setAdvancedQuery={setAdvancedQuery}
                />
            )}
            <WebShellTable
                filter={params}
                advancedQuery={advancedQuery}
                setAdvancedQuery={setAdvancedQuery}
                available={available}
            />
        </div>
    )
}

export interface QueryWebShellRequest {
    Pagination?: PaginationSchema
    Tag: string
}

export const defQueryWebShellRequest: QueryWebShellRequest = {
    Tag: ""
}

interface WebShellQueryProp {
    defaultParams?: QueryWebShellRequest
    onChange?: (req: QueryWebShellRequest) => any
    advancedQuery: boolean //是否开启高级查询
    setAdvancedQuery: (b: boolean) => void
}

const WebShellQuery: React.FC<WebShellQueryProp> = (props) => {
    const {advancedQuery, setAdvancedQuery} = props
    const [params, setParams] = useState<QueryWebShellRequest>(props.defaultParams || defQueryWebShellRequest)
    useEffect(() => {
        if (!props.onChange) {
            return
        }
        props.onChange(params)
    }, [params])

    const [activeKey, setActiveKey] = useState<string[]>() // Collapse打开的key
    const onSwitchCollapse = useMemoizedFn((key) => {
        setActiveKey(key)
    })
    const [customCodecList, setCustomCodecList] = useState<string[]>(["json","xx ","我"]) // Collapse打开的key


    return (
        <>
            <div className={fuzzerStyles["http-query-advanced-config"]}>
                <div className={fuzzerStyles["advanced-config-heard"]}>
                    <span>高级设置</span>
                    <YakitSwitch wrapperClassName={fuzzerStyles["btn-padding-right-0"]} checked={advancedQuery}
                                 onChange={setAdvancedQuery}/>
                </div>
                <Form
                    colon={false}
                    size='small'
                    labelCol={{ span: 10 }}
                    wrapperCol={{ span: 14 }}
                    style={{ overflowY: "auto" }}
                >
                    <YakitCollapse
                        activeKey={activeKey}
                        onChange={(key) => onSwitchCollapse(key)}
                        destroyInactivePanel={true}
                        type='grey'
                    >
                        <YakitPanel
                            header={
                                <div className={fuzzerStyles["matchers-panel"]}>
                                    WebShell 编解码器
                                    <div className={fuzzerStyles["matchers-number"]}>{customCodecList?.length}</div>
                                </div>
                            }
                            key='数据提取器'
                            extra={
                                <>
                                    <Divider type='vertical' style={{ margin: 0 }} />
                                    <YakitButton
                                        type='text'
                                        size='small'
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            if (activeKey?.findIndex((ele) => ele === "数据提取器") === -1) {
                                                onSwitchCollapse([...activeKey, "数据提取器"])
                                            }
                                            // onAddMatchingAndExtractionCard("extractors")
                                        }}
                                        className={fuzzerStyles["btn-padding-right-0"]}
                                    >
                                        添加/调试
                                        <HollowLightningBoltIcon />
                                    </YakitButton>
                                </>
                            }
                        >
                            <CustomCodecList
                                customCodecValue={ { customCodecList }}
                                onAdd={() => {
                                    console.log(1111)}}
                                onRemove={()=>{
                                    console.log(2222)}}
                                onEdit={()=>{
                                    console.log(3333)}}
                            />
                        </YakitPanel>
                    </YakitCollapse>

                </Form>

            </div>
        </>
    )
}