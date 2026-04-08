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
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

const {Panel} = Collapse
export interface QueryCVERequest {
    Pagination?: PaginationSchema
    AccessVector: "NETWORK" | "LOCAL" | "ADJACENT_NETWORK" | "PHYSICAL" | string
    AccessComplexity: "HIGH" | "MEDIUM" | "LOW" | string
    CWE: string
    Year: string
    Severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | string
    // Score: number
    Product: string
    // ChineseTranslationFirst: boolean
    Keywords: string
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
export const defQueryCVERequest:QueryCVERequest = {
    AccessComplexity: "",
    AccessVector: "",
    CWE: "",
    Product: "",
    // Score: 6.0,
    Severity: "",
    Year: "",
    // ChineseTranslationFirst: true
    Keywords: ""
}
const CVEQuery: React.FC<CVEQueryProp> = (props) => {
    const {advancedQuery, setAdvancedQuery} = props
    const {t, i18n} = useI18nNamespaces(["cve", "yakitUi"])
    const [params, setParams] = useState<QueryCVERequest>(props.defaultParams || defQueryCVERequest)

    useEffect(() => {
        if (!props.onChange) {
            return
        }
        props.onChange(params)
    }, [params])

    return (
        <div className={styles["cve-query"]} style={{minWidth: i18n.language === "zh" ? 300 : 450}}>
            <div className={styles["cve-query-heard"]}>
                <span>{t("CVEQuery.advancedQuery")}</span>
                <YakitSwitch checked={advancedQuery} onChange={setAdvancedQuery} />
            </div>
            <div className={styles["cve-query-body"]}>
                <div className={styles["cve-query-text"]}>
                    <span>{t("CVEQuery.cveQueryConditions")}</span>
                    <span
                        className={styles["cve-query-resetting"]}
                        onClick={() => {
                            setParams(defQueryCVERequest)
                        }}
                    >
                        {t("YakitButton.reset")}
                    </span>
                </div>
                <div className={styles["cve-query-item"]}>
                    <div>{t("CVEQuery.exploitPath")}</div>
                    <YakitCheckableTagList
                        data={[
                            {value: "NETWORK", label: t("CVEQuery.network")},
                            {value: "ADJACENT_NETWORK", label: t("CVEQuery.adjacentNetwork")},
                            {value: "LOCAL", label: t("CVEQuery.local")},
                            {value: "PHYSICAL", label: t("CVEQuery.physical")}
                        ]}
                        value={params.AccessVector ? params.AccessVector.split(",") : []}
                        setValue={(AccessVector) => setParams({...params, AccessVector: AccessVector.join(",")})}
                    />
                </div>
                <div className={styles["cve-query-item"]}>
                    <div>{t("CVEQuery.exploitDifficulty")}</div>
                    <YakitCheckableTagList
                        setValue={(AccessComplexity) =>
                            setParams({...params, AccessComplexity: AccessComplexity.join(",")})
                        }
                        value={params.AccessComplexity ? params.AccessComplexity.split(",") : []}
                        data={[
                            {value: "HIGH", label: t("CVEQuery.difficult")},
                            {value: "MEDIUM", label: t("CVEQuery.medium")},
                            {value: "LOW", label: t("CVEQuery.easy")}
                        ]}
                    />
                </div>
                <div className={styles["cve-query-item"]}>
                    <div>{t("CVEQuery.vulnerabilityLevel")}</div>
                    <YakitCheckableTagList
                        setValue={(Severity) => setParams({...params, Severity: Severity.join(",")})}
                        value={params.Severity ? params.Severity.split(",") : []}
                        data={[
                            {value: "CRITICAL", label: t("CVEQuery.critical")},
                            {value: "HIGH", label: t("CVEQuery.high")},
                            {value: "MEDIUM", label: t("CVEQuery.medium")},
                            {value: "LOW", label: t("CVEQuery.low")}
                        ]}
                    />
                </div>
            </div>
        </div>
    )
}
