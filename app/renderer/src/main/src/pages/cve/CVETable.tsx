import React, { useEffect, useMemo, useState } from "react"
import { AutoCard } from "@/components/AutoCard"
import { Divider, Empty, Progress, Space, Table, Tag } from "antd"
import { QueryCVERequest } from "@/pages/cve/CVEViewer"
import { useDebounceEffect, useDebounceFn, useKeyPress, useMemoizedFn } from "ahooks"
import { ExecResult, genDefaultPagination, PaginationSchema, QueryGeneralResponse } from "@/pages/invoker/schema"
import { ResizeBox } from "@/components/ResizeBox"
import { YakitButton } from "@/components/yakitUI/YakitButton/YakitButton"
import { CVEDetail, CVEDetailEx } from "@/pages/cve/models"
import { CVEInspect } from "@/pages/cve/CVEInspect"
import styles from "./CVETable.module.scss"
import { TableVirtualResize } from "@/components/TableVirtualResize/TableVirtualResize"
import { ColumnsTypeProps } from "@/components/TableVirtualResize/TableVirtualResizeType"
import { YakitTag } from "@/components/yakitUI/YakitTag/YakitTag"
import { YakitCombinationSearch } from "@/components/YakitCombinationSearch/YakitCombinationSearch"
import { RefreshIcon, ShieldExclamationIcon, SolidRefreshIcon } from "@/assets/newIcon"
import classNames from "classnames"
import { YakitHint } from "@/components/yakitUI/YakitHint/YakitHint"
import { failed, info, yakitFailed } from "@/utils/notification"
import { randomString } from "@/utils/randomUtil"
import { Uint8ArrayToString } from "@/utils/str"

export interface CVETableProp {
    filter: QueryCVERequest
}

const { ipcRenderer } = window.require("electron")

export const CVETable: React.FC<CVETableProp> = (props) => {
    const [selected, setSelected] = useState<string>("")
    return (
        <>
            <ResizeBox
                isVer={true}
                firstMinSize='200px'
                secondMinSize='200px'
                firstNode={<CVETableList filter={props.filter} selected={selected} setSelected={setSelected} />}
                secondNode={<CVEInspect CVE={selected} onSelectCve={setSelected} />}
            />
        </>
    )
}

interface CVETableListProps {
    filter: QueryCVERequest
    selected: string
    setSelected: (s: string) => void
}
const CVETableList: React.FC<CVETableListProps> = React.memo((props) => {
    const { selected, setSelected } = props
    const [params, setParams] = useState<QueryCVERequest>({ ...props.filter })
    const [loading, setLoading] = useState(false)
    const [pagination, setPagination] = useState<PaginationSchema>(genDefaultPagination(20, 1))
    const [data, setData] = useState<CVEDetail[]>([])
    const [total, setTotal] = useState(0)
    const [isRefresh, setIsRefresh] = useState<boolean>(false) // 刷新表格，滚动至0

    const [searchType, setSearchType] = useState<string>("CVE")
    const [dataBaseUpdateVisible, setDataBaseUpdateVisible] = useState<boolean>(false)

    const [currentSelectItem, setCurrentSelectItem] = useState<CVEDetail>()

    useEffect(() => {
        ipcRenderer.invoke("GetCVE", { CVE: selected }).then((i: CVEDetailEx) => {
            const { CVE } = i
            setCurrentSelectItem(CVE)
        })
    }, [selected])

    useDebounceEffect(
        () => {
            setParams({
                ...props.filter,
                CVE: params.CVE,
                CWE: params.CWE
            })
            update(1)
        },
        [props.filter],
        { wait: 1000 }
    )
    const update = useMemoizedFn(
        (page?: number, limit?: number, order?: string, orderBy?: string, extraParam?: any) => {
            const paginationProps = {
                Page: page || 1,
                Limit: limit || pagination.Limit
            }
            setLoading(true)
            const finalParams = {
                ...params,
                ...(extraParam ? extraParam : {}),
                Pagination: paginationProps
            }
            // console.info('finalParams', finalParams)
            ipcRenderer
                .invoke("QueryCVE", finalParams)
                .then((r: QueryGeneralResponse<CVEDetail>) => {
                    console.info("QueryCVE", r)
                    const d = Number(paginationProps.Page) === 1 ? r.Data : data.concat(r.Data)
                    setData(d)
                    setPagination(r.Pagination)
                    setTotal(r.Total)
                    if (Number(paginationProps.Page) === 1) {
                        setIsRefresh(!isRefresh)
                    }
                })
                .finally(() => setTimeout(() => setLoading(false), 300))
        }
    )

    useEffect(() => {
        if (dataBaseUpdateVisible) return
        update(1)
    }, [dataBaseUpdateVisible])
    const columns: ColumnsTypeProps[] = useMemo<ColumnsTypeProps[]>(() => {
        return [
            {
                title: "CVE编号",
                dataKey: "CVE",
                width: 160
            },
            {
                title: "概述",
                dataKey: "Title",
                render: (_, i: CVEDetail) => i.Title || i.DescriptionZh || i.DescriptionOrigin
            },
            {
                title: "CWE 编号",
                dataKey: "CWE",
                width: 160,
                render: (text) => (text ? <YakitTag color='bluePurple'>{text}</YakitTag> : "")
            },
            {
                title: "影响产品",
                dataKey: "Product",
                width: 200
            },
            {
                title: "漏洞级别",
                dataKey: "Product",
                width: 120,
                render: (_, i: CVEDetail) => {
                    let color = "success"
                    if (i.BaseCVSSv2Score > 8.0 || i.Severity === "CRITICAL" || i.Severity == "HIGH") {
                        color = "danger"
                    } else if (i.BaseCVSSv2Score > 6.0) {
                        color = "warning"
                    }
                    return (
                        <div
                            className={classNames(styles["cve-list-product-success"], {
                                [styles["cve-list-product-warning"]]: color === "warning",
                                [styles["cve-list-product-danger"]]: color === "danger"
                            })}
                        >
                            <div className={classNames(styles["cve-list-severity"])}>{i.Severity}</div>
                            <span className={classNames(styles["cve-list-baseCVSSv2Score"])}>{i.BaseCVSSv2Score}</span>
                        </div>
                    )
                }
            }
        ]
    }, [])
    const onRowClick = useMemoizedFn((record: CVEDetail) => {
        setSelected(record.CVE) // 更新当前选中的行
        setCurrentSelectItem(record)
    })
    const onTableChange = useDebounceFn(
        (page: number, limit: number, _, filter: any) => {
            setParams({
                ...params,
                ...filter
            })
            setTimeout(() => {
                update(1, limit)
            }, 10)
        },
        { wait: 500 }
    ).run
    return (
        <div className={styles["cve-list"]}>
            <TableVirtualResize<CVEDetail>
                query={params}
                titleHeight={36}
                size='middle'
                renderTitle={
                    <div className={styles["cve-list-title-body"]}>
                        <div className={styles["cve-list-title"]}>CVE 数据库管理</div>
                        <div className={styles["cve-list-title-extra"]}>
                            <YakitCombinationSearch
                                selectProps={{
                                    size: "small"
                                }}
                                beforeOptionWidth={68}
                                valueBeforeOption={searchType}
                                afterModuleType='input'
                                onSelectBeforeOption={(o) => {
                                    if (o === "CVE") {
                                        setParams({
                                            ...params,
                                            CWE: ""
                                        })
                                    }
                                    if (o === "CWE") {
                                        setParams({
                                            ...params,
                                            CVE: ""
                                        })
                                    }
                                    setSearchType(o)
                                }}
                                addonBeforeOption={[
                                    {
                                        label: "CVE",
                                        value: "CVE"
                                    },
                                    {
                                        label: "CWE",
                                        value: "CWE"
                                    }
                                ]}
                                inputSearchModuleTypeProps={{
                                    size: "middle",
                                    value: params[searchType],
                                    onChange: (e) => {
                                        setParams({
                                            ...params,
                                            [searchType]: e.target.value
                                        })
                                    },
                                    onSearch: () => update(1)
                                }}
                            />
                            <Divider type='vertical' />
                            <YakitButton type='primary' onClick={() => setDataBaseUpdateVisible(true)}>
                                <RefreshIcon />
                                数据库更新
                            </YakitButton>
                        </div>
                    </div>
                }
                isRefresh={isRefresh}
                renderKey='CVE'
                data={data}
                loading={loading}
                enableDrag={true}
                columns={columns}
                onRowClick={onRowClick}
                pagination={{
                    page: pagination.Page,
                    limit: pagination.Limit,
                    total,
                    onChange: update
                }}
                currentSelectItem={currentSelectItem}
                onChange={onTableChange}
            />
            <DatabaseUpdateModal visible={dataBaseUpdateVisible} setVisible={setDataBaseUpdateVisible} />
        </div>
    )
})

interface DatabaseUpdateModalProps {
    visible: boolean
    setVisible: (b: boolean) => void
}
const DatabaseUpdateModal: React.FC<DatabaseUpdateModalProps> = React.memo((props) => {
    const { visible, setVisible } = props
    const [token, setToken] = useState(randomString(40))
    const [messages, setMessages] = useState<string[]>([])
    const [available, setAvailable] = useState(false)
    const [outOfDate, setOutOfDate] = useState(false)
    const [showOk, setShowOk] = useState(true)
    // const [downloadProgress, setDownloadProgress] = useState<DownloadingState>();
    useEffect(() => {
        ipcRenderer.on(`${token}-data`, async (e, data: ExecResult) => {
            if (!data.IsMessage) {
                return
            }
            setMessages([...messages, Uint8ArrayToString(data.Message)])
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            yakitFailed(`[UpdateCVEDatabase] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            info("[UpdateCVEDatabase] finished")
            setVisible(false)
        })
        return () => {
            ipcRenderer.invoke("cancel-UpdateCVEDatabase", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [])
    useEffect(() => {
        if (!visible) return
        setShowOk(true)
        setMessages([])
        setAvailable(false)
        setOutOfDate(false)
        ipcRenderer.invoke("IsCVEDatabaseReady").then((rsp: { Ok: boolean; Reason: string; ShouldUpdate: boolean }) => {
            setAvailable(rsp.Ok)
            setOutOfDate(rsp.ShouldUpdate)
        })
    }, [visible])
    return (
        <YakitHint
            visible={visible}
            title={showOk ? "CVE数据初始化" : "CVE数据库更新"}
            heardIcon={
                showOk ? (
                    <ShieldExclamationIcon style={{ color: "var(--yakit-warning-5)" }} />
                ) : (
                    <SolidRefreshIcon style={{ color: "var(--yakit-warning-5)" }} />
                )
            }
            onCancel={() => {
                setVisible(false)
            }}
            onOk={() => {
                setShowOk(false)
                ipcRenderer
                    .invoke("UpdateCVEDatabase", { Proxy: "" }, token)
                    .then(() => { })
                    .catch((e) => {
                        failed(`更新 CVE 数据库失败！${e}`)
                    })
            }}
            okButtonText={available ? "强制更新" : "初始化"}
            isDrag={true}
            mask={false}
            okButtonProps={{ style: { display: showOk ? "flex" : "none" } }}
            content={
                <div>
                    <p>
                        {available
                            ? "点击“强制更新”，可更新本地CVE数据库"
                            : "本地CVE数据库未初始化，请点击“初始化”下载CVE数据库"}
                    </p>
                    {/* {downloadProgress && <Progress percent={
                downloading ? Math.floor((downloadProgress?.percent || 0) * 100) : 100
            }/>}
            {downloadProgress && downloading && <Space>
                <Tag>剩余时间:{downloadProgress?.time.remaining}</Tag>
                <Tag>已下载用时:{downloadProgress?.time.elapsed}</Tag>
                <Tag>
                    下载速度:约{((downloadProgress?.speed || 0) / 1000000).toFixed(2)}M/s
                </Tag>
            </Space>} */}
                    <div className={styles["database-update-messages"]}>
                        {messages.map((i) => {
                            return <p>{`${i}`}</p>
                        })}
                    </div>
                </div>
            }
        />
    )
})
