import React, {useEffect, useState} from "react";
import {ResizeBox} from "@/components/ResizeBox";
import {AutoCard} from "@/components/AutoCard";
import {Button, Form} from "antd";
import {PaginationSchema} from "@/pages/invoker/schema";
import {MultiSelectForString} from "@/utils/inputUtil";
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons";
import {CVETable} from "@/pages/cve/CVETable";

export interface QueryCVERequest {
    Pagination?: PaginationSchema

    AccessVector: "NETWORK" | "LOCAL" | "ADJACENT_NETWORK" | "PHYSICAL" | string
    AccessComplexity: "HIGH" | "MIDDLE" | "LOW" | string
    CWE: string
    Year: string
    Severity: "CRITICAL" | "HIGH" | "MIDDLE" | "LOW" | string
    Score: number
    Product: string
}

export interface CVEViewerProp {

}

export const CVEViewer: React.FC<CVEViewerProp> = (props) => {
    const [params, setParams] = useState<QueryCVERequest>({
        AccessComplexity: "LOW",
        AccessVector: "NETWORK",
        CWE: "",
        Product: "",
        Score: 0,
        Severity: "HIGH",
        Year: ""
    });

    return <ResizeBox
        firstNode={<CVEQuery/>}
        freeze={true}
        firstRatio={"300px"}
        firstMinSize={"300px"}
        secondNode={<CVETable filter={params}/>}
    />
};

interface CVEQueryProp {

}

const CVEQuery: React.FC<CVEQueryProp> = (props) => {
    const [params, setParams] = useState<QueryCVERequest>({
        AccessComplexity: "LOW",
        AccessVector: "NETWORK,ADJACENT_NETWORK",
        CWE: "",
        Product: "",
        Score: 6.0,
        Severity: "HIGH",
        Year: ""
    });

    return <AutoCard title={"CVE 查询条件"} bordered={true} hoverable={true} size={"small"} extra={<>
        <Button size={"small"}>重置</Button>
    </>}>
        <Form
            // labelCol={{span: 5}} wrapperCol={{span: 14}}
            layout={"vertical"}
        >
            <Form.Item label={"利用路径"}>
                <YakitRadioButtons size={"small"} options={[
                    {value: "NETWORK", label: "网络"},
                    {value: "ADJACENT_NETWORK", label: "局域网"},
                    {value: "LOCAL", label: "本地"},
                    {value: "PHYSICAL", label: "物理"},
                ]}/>
            </Form.Item>
            <Form.Item label={"利用复杂度"}>
                <YakitRadioButtons
                    size={"small"}
                    options={[
                        {value: "HIGH", label: "难以利用"},
                        {value: "MIDDLE", label: "有一定难度"},
                        {value: "LOW", label: "容易被利用"},
                    ]}
                    value={params.AccessComplexity}
                    onChange={(s) => setParams({...params, AccessComplexity: s.target.value})}/>
            </Form.Item>
        </Form>
    </AutoCard>
};