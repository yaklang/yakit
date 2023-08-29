import {yakitFailed} from "@/utils/notification";
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin";
import styles from "@/pages/cve/CVETable.module.scss";
import fuzzerStyles from "@/pages/fuzzer/HttpQueryAdvancedConfig/HttpQueryAdvancedConfig.module.scss";
import React, {useEffect, useState} from "react";
import {useMemoizedFn} from "ahooks";
import {PaginationSchema} from "@/pages/invoker/schema";
import {WebShellTable} from "@/pages/webShell/WebShellTable";
import {defQueryCVERequest, QueryCVERequest} from "@/pages/cve/CVEViewer";
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch";
import {YakitCheckableTagList} from "@/components/YakitCheckableTagList/YakitCheckableTagList";


export interface WebShellManagerViewerProp {
}

const {ipcRenderer} = window.require("electron")


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

    return (
        <>
            <div className={fuzzerStyles["http-query-advanced-config"]}>
                <div className={fuzzerStyles["advanced-config-heard"]}>
                    <span>高级设置</span>
                    <YakitSwitch wrapperClassName={fuzzerStyles["btn-padding-right-0"]} checked={advancedQuery} onChange={setAdvancedQuery}/>
                </div>
                <div className={styles["cve-query-body"]}>
                    <div className={styles["cve-query-text"]}>
                        <span>编解码配置</span>
                    </div>
                    <div className={styles["cve-query-item"]}>
                        <div>利用路径</div>

                    </div>
                    <div className={styles["cve-query-item"]}>
                        <div>利用难度</div>

                    </div>
                    <div className={styles["cve-query-item"]}>
                        <div>漏洞级别</div>

                    </div>
                </div>

            </div>
        </>
    )
}