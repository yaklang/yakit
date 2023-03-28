import React, {useEffect, useState} from "react"
import {ResizeBox} from "@/components/ResizeBox"
import {AutoCard} from "@/components/AutoCard"
import {Button, Card, Collapse, Form} from "antd"
import {PaginationSchema} from "@/pages/invoker/schema"
import {MultiSelectForString, SwitchItem} from "@/utils/inputUtil"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {CVETable} from "@/pages/cve/CVETable"
import {useDebounceEffect, useMemoizedFn} from "ahooks"
import styles from "./CVETable.module.scss"
import {yakitFailed} from "@/utils/notification"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {ChevronDownIcon} from "@/assets/newIcon"
import {YakitCheckableTagList} from "@/components/YakitCheckableTagList/YakitCheckableTagList"

const {Panel} = Collapse
export interface QueryCVERequest {
    Pagination?: PaginationSchema

    AccessVector: "NETWORK" | "LOCAL" | "ADJACENT_NETWORK" | "PHYSICAL" | string
    AccessComplexity: "HIGH" | "MEDIUM" | "LOW" | string
    CWE: string
    Year: string
    Severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | string
    Score: number
    Product: string
    ChineseTranslationFirst: boolean
}

export interface CVEViewerProp {}
const {ipcRenderer} = window.require("electron")
export const CVEViewer: React.FC<CVEViewerProp> = (props) => {
    const [params, setParams] = useState<QueryCVERequest>(defQueryCVERequest)
    const [advancedQuery, setAdvancedQuery] = useState<boolean>(true)
    const [loading, setLoading] = useState(false)
    const [available, setAvailable] = useState(false) // cve数据库是否可用
    useEffect(() => {
        onIsCVEDatabaseReady()
    }, [])
    const onIsCVEDatabaseReady = useMemoizedFn(() => {
        setLoading(true)
        ipcRenderer
            .invoke("IsCVEDatabaseReady")
            .then((rsp: {Ok: boolean; Reason: string; ShouldUpdate: boolean}) => {
                console.log("IsCVEDatabaseReady", rsp)
                setAvailable(rsp.Ok)
            })
            .catch((err) => {
                yakitFailed("IsCVEDatabaseReady失败：" + err)
            })
            .finally(() => setTimeout(() => setLoading(false), 200))
    })
    return loading ? (
        <YakitSpin spinning={true} style={{alignItems: "center", paddingTop: 150}} />
    ) : (
        <div className={styles["cve-viewer"]}>
            {available && advancedQuery && (
                <CVEQuery
                    onChange={setParams}
                    defaultParams={params}
                    advancedQuery={advancedQuery}
                    setAdvancedQuery={setAdvancedQuery}
                />
            )}
            <CVETable
                filter={params}
                advancedQuery={advancedQuery}
                setAdvancedQuery={setAdvancedQuery}
                available={available}
            />
        </div>
    )
}

interface CVEQueryProp {
    defaultParams?: QueryCVERequest
    onChange?: (req: QueryCVERequest) => any
    advancedQuery: boolean //是否开启高级查询
    setAdvancedQuery: (b: boolean) => void
}
export const defQueryCVERequest = {
    AccessComplexity: "LOW",
    AccessVector: "NETWORK,ADJACENT_NETWORK",
    CWE: "",
    Product: "",
    Score: 6.0,
    Severity: "HIGH",
    Year: "",
    ChineseTranslationFirst: true
}
const CVEQuery: React.FC<CVEQueryProp> = (props) => {
    const {advancedQuery, setAdvancedQuery} = props
    const [params, setParams] = useState<QueryCVERequest>(props.defaultParams || defQueryCVERequest)

    useEffect(() => {
        if (!props.onChange) {
            return
        }
        props.onChange(params)
    }, [params])

    return (
        <div className={styles["cve-query"]}>
            <div className={styles["cve-query-heard"]}>
                <span>高级查询</span>
                <YakitSwitch checked={advancedQuery} onChange={setAdvancedQuery} />
            </div>
            <div className={styles["cve-query-body"]}>
                <div className={styles["cve-query-text"]}>
                    <span>CVE 查询条件</span>
                    <span
                        className={styles["cve-query-resetting"]}
                        onClick={() => {
                            setParams(defQueryCVERequest)
                        }}
                    >
                        重置
                    </span>
                </div>
                <div className={styles["cve-query-item"]}>
                    <div>利用路径</div>
                    <YakitCheckableTagList
                        data={[
                            {value: "NETWORK", label: "网络"},
                            {value: "ADJACENT_NETWORK", label: "局域网"},
                            {value: "LOCAL", label: "本地"},
                            {value: "PHYSICAL", label: "物理"}
                        ]}
                        value={params.AccessVector.split(",")}
                        setValue={(AccessVector) => setParams({...params, AccessVector: AccessVector.join(",")})}
                    />
                </div>
                <div className={styles["cve-query-item"]}>
                    <div>利用难度</div>
                    <YakitCheckableTagList
                        setValue={(AccessComplexity) =>
                            setParams({...params, AccessComplexity: AccessComplexity.join(",")})
                        }
                        value={params.AccessComplexity.split(",")}
                        data={[
                            {value: "HIGH", label: "困难"},
                            {value: "MEDIUM", label: "一般"},
                            {value: "LOW", label: "容易"}
                        ]}
                    />
                </div>
                <div className={styles["cve-query-item"]}>
                    <div>漏洞级别</div>
                    <YakitCheckableTagList
                        setValue={(Severity) => setParams({...params, Severity: Severity.join(",")})}
                        value={params.Severity.split(",")}
                        data={[
                            {value: "CRITICAL", label: "严重"},
                            {value: "HIGH", label: "高危"},
                            {value: "MEDIUM", label: "中危"},
                            {value: "LOW", label: "低危"}
                        ]}
                    />
                </div>
            </div>
        </div>
    )
}
