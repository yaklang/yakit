import React, { useEffect, useState } from "react";
import { ResizeBox } from "@/components/ResizeBox";
import { AutoCard } from "@/components/AutoCard";
import { Button, Card, Form } from "antd";
import { PaginationSchema } from "@/pages/invoker/schema";
import { MultiSelectForString, SwitchItem } from "@/utils/inputUtil";
import { YakitRadioButtons } from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons";
import { CVETable } from "@/pages/cve/CVETable";
import { useDebounceEffect } from "ahooks";
import styles from "./CVETable.module.scss";
import { yakitFailed } from "@/utils/notification";
import { YakitSpin } from "@/components/yakitUI/YakitSpin/YakitSpin";

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

export interface CVEViewerProp {

}
const { ipcRenderer } = window.require("electron")
export const CVEViewer: React.FC<CVEViewerProp> = (props) => {
    const [params, setParams] = useState<QueryCVERequest>({
        AccessComplexity: "",
        AccessVector: "",
        CWE: "",
        Product: "",
        Score: 0,
        Severity: "",
        Year: "", ChineseTranslationFirst: true
    });
    const [advancedQuery, setAdvancedQuery] = useState<boolean>(true)
    const [loading, setLoading] = useState(false)
    const [available, setAvailable] = useState(false)// cve数据库是否可用
    useEffect(() => {
        setLoading(true)
        ipcRenderer.invoke("IsCVEDatabaseReady").then((rsp: { Ok: boolean; Reason: string; ShouldUpdate: boolean }) => {
            setAvailable(rsp.Ok)
        }).catch((err) => {
            yakitFailed("IsCVEDatabaseReady失败：" + err)
        })
            .finally(() => setTimeout(() => setLoading(false), 200))
    }, [])
    return loading ? <YakitSpin spinning={true} style={{ alignItems: 'center', paddingTop: 150 }} /> : <div className={styles['cve-viewer']} >
        {available && advancedQuery && <CVEQuery onChange={setParams} defaultParams={params} />}
        <CVETable filter={params} advancedQuery={advancedQuery} setAdvancedQuery={setAdvancedQuery} available={available} />
    </div>
};

interface CVEQueryProp {
    defaultParams?: QueryCVERequest
    onChange?: (req: QueryCVERequest) => any
}

const CVEQuery: React.FC<CVEQueryProp> = (props) => {
    const [params, setParams] = useState<QueryCVERequest>(props.defaultParams || {
        AccessComplexity: "LOW",
        AccessVector: "NETWORK,ADJACENT_NETWORK",
        CWE: "",
        Product: "",
        Score: 6.0,
        Severity: "HIGH",
        Year: "", ChineseTranslationFirst: true
    });

    useDebounceEffect(() => {
        if (!props.onChange) {
            return
        }
        props.onChange(params)
    }, [params], { wait: 700 })

    return <Card title={"CVE 查询条件"} bordered={true} hoverable={true}
        style={{ width: 300 }} size={"small"} extra={<>
            <Button size={"small"}>重置</Button>
        </>}>
        <Form
            // labelCol={{span: 5}} wrapperCol={{span: 14}}
            layout={"vertical"}
        >
            {/* <SwitchItem label={"有中文数据"}
                setValue={ChineseTranslationFirst => setParams({ ...params, ChineseTranslationFirst })}
                value={params.ChineseTranslationFirst} /> */}
            <MultiSelectForString
                label={"利用路径"}
                setValue={AccessVector => setParams({ ...params, AccessVector })}
                data={[
                    { value: "NETWORK", label: "网络" },
                    { value: "ADJACENT_NETWORK", label: "局域网" },
                    { value: "LOCAL", label: "本地" },
                    { value: "PHYSICAL", label: "物理" },
                ]}
                value={params.AccessVector}
            />
            <MultiSelectForString
                label={"利用难度"}
                setValue={AccessComplexity => setParams({ ...params, AccessComplexity })} value={params.AccessComplexity}
                data={[
                    { value: "HIGH", label: "难以利用" },
                    { value: "MEDIUM", label: "有一定难度" },
                    { value: "LOW", label: "容易被利用" },
                ]}
            />
            <MultiSelectForString
                label={"漏洞级别"}
                setValue={Severity => setParams({ ...params, Severity })} value={params.Severity}
                data={[
                    { value: "CRITICAL", label: "严重" },
                    { value: "HIGH", label: "高危" },
                    { value: "MEDIUM", label: "中危" },
                    { value: "LOW", label: "低危" },
                ]}
            />
        </Form>
    </Card>
};