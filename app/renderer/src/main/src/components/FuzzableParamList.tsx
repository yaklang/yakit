import React, {useEffect, useState} from "react"
import {Typography} from "antd"
import {FuzzableParams} from "./HTTPFlowTable/HTTPFlowTable"
import {HTTPPacketFuzzable} from "./HTTPHistory"
import {YakitPopconfirm} from "./yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitButton} from "./yakitUI/YakitButton/YakitButton"
import {YakitTag} from "./yakitUI/YakitTag/YakitTag"
import {TableVirtualResize} from "./TableVirtualResize/TableVirtualResize"
import {ColumnsTypeProps} from "./TableVirtualResize/TableVirtualResizeType"
import {useCreation} from "ahooks"
import {v4 as uuidv4} from "uuid"
import styles from "./hTTPFlowDetail.module.scss"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

const {ipcRenderer} = window.require("electron")
const {Text} = Typography

export interface FuzzableParamListProp extends HTTPPacketFuzzable {
    data: FuzzableParams[]
    sendToWebFuzzer?: () => any
}

interface FuzzableParamListData extends FuzzableParams {
    /**前端作为唯一key，后端不使用 */
    key: string
}
export const FuzzableParamList: React.FC<FuzzableParamListProp> = (props) => {
    const {t, i18n} = useI18nNamespaces(["history", "yakitUi"])
    const [list, setList] = useState<FuzzableParamListData[]>([])
    useEffect(() => {
        const newList = props.data.map((item, index) => ({
            ...item,
            key: uuidv4()
        }))
        setList(newList)
    }, [props.data])
    const columns: ColumnsTypeProps[] = useCreation<ColumnsTypeProps[]>(() => {
        return [
            {
                title: t("FuzzableParamList.parameterName"),
                dataKey: "ParamName",
                ellipsis: true,
                render: (text) => (
                    <YakitTag enableCopy copyText={text} className={styles["fuzzable-param-list-tag"]}>
                        <span className='content-ellipsis' title={text}>
                            {text}
                        </span>
                    </YakitTag>
                )
            },
            {
                title: t("FuzzableParamList.parameterLocation"),
                dataKey: "Position",
                ellipsis: true,
                render: (text) => (
                    <YakitTag className={styles["fuzzable-param-list-tag"]}>
                        <span className='content-ellipsis' title={text}>
                            {text}
                        </span>
                    </YakitTag>
                )
            },
            {
                title: t("FuzzableParamList.originalParameterValue"),
                dataKey: "OriginValue",
                render: (text) => {
                    const originValueStr = text ? Buffer.from(text).toString() : ""
                    return (
                        <YakitTag enableCopy copyText={originValueStr} className={styles["fuzzable-param-list-tag"]}>
                            <span className='content-ellipsis' title={`${originValueStr}`}>
                                {originValueStr}
                            </span>
                        </YakitTag>
                    )
                }
            },
            {
                title: "IsHTTPS",
                dataKey: "IsHTTPS",
                render: (text) => <YakitTag>{`${text}`}</YakitTag>
            },
            {
                title: t("YakitTable.action"),
                dataKey: "Action",
                fixed: "right",
                width: 150,
                render: (text, i: FuzzableParamListData) => (
                    <div>
                        <YakitPopconfirm
                            title={t("FuzzableParamList.testParameterInWebFuzzer")}
                            onConfirm={(e) => {
                                ipcRenderer.invoke("send-to-tab", {
                                    type: "fuzzer",
                                    data: {
                                        isHttps: i.IsHTTPS,
                                        request: Buffer.from(i.AutoTemplate).toString("utf8")
                                    }
                                })
                                if (props.sendToWebFuzzer) props.sendToWebFuzzer()
                            }}
                        >
                            <YakitButton type={"primary"} size={"small"}>
                                {t("FuzzableParamList.fuzzTestParameter")}
                            </YakitButton>
                        </YakitPopconfirm>
                    </div>
                )
            }
        ]
    }, [i18n.language])
    return (
        <TableVirtualResize<FuzzableParamListData>
            columns={columns}
            data={list}
            renderKey='key'
            isRefresh={false}
            isShowTitle={false}
            titleHeight={0.01}
            containerClassName={styles["fuzzable-param-list-container"]}
            pagination={{
                page: 1,
                limit: 10,
                total: list.length,
                onChange: () => {}
            }}
        />
    )
}
