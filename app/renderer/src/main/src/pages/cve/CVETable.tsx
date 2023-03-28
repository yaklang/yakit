import React, {useEffect, useMemo, useState} from "react"
import {AutoCard} from "@/components/AutoCard"
import {Divider, Empty, Progress, Space, Table, Tag} from "antd"
import {defQueryCVERequest, QueryCVERequest} from "@/pages/cve/CVEViewer"
import {useDebounceEffect, useDebounceFn, useGetState, useKeyPress, useMemoizedFn} from "ahooks"
import {ExecResult, genDefaultPagination, PaginationSchema, QueryGeneralResponse} from "@/pages/invoker/schema"
import {ResizeBox} from "@/components/ResizeBox"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {CVEDetail, CVEDetailEx} from "@/pages/cve/models"
import {CVEInspect} from "@/pages/cve/CVEInspect"
import styles from "./CVETable.module.scss"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {ColumnsTypeProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitCombinationSearch} from "@/components/YakitCombinationSearch/YakitCombinationSearch"
import {CloudDownloadIcon, RefreshIcon, ShieldExclamationIcon, SolidRefreshIcon} from "@/assets/newIcon"
import classNames from "classnames"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {failed, info, yakitFailed} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import {Uint8ArrayToString} from "@/utils/str"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {openExternalWebsite} from "@/utils/openWebsite"

export interface CVETableProp {
    available: boolean
    filter: QueryCVERequest
    advancedQuery: boolean //是否开启高级查询
    setAdvancedQuery: (b: boolean) => void
}

const {ipcRenderer} = window.require("electron")

export const CVETable: React.FC<CVETableProp> = (props) => {
    const {available, advancedQuery, setAdvancedQuery} = props
    const [selected, setSelected] = useState<string>("")

    return (
        <>
            {available ? (
                <ResizeBox
                    isVer={true}
                    firstMinSize='200px'
                    secondMinSize='200px'
                    firstNode={
                        <CVETableList
                            available={available}
                            advancedQuery={advancedQuery}
                            setAdvancedQuery={setAdvancedQuery}
                            filter={props.filter}
                            selected={selected}
                            setSelected={setSelected}
                        />
                    }
                    secondNode={<CVEInspect CVE={selected} onSelectCve={setSelected} />}
                />
            ) : (
                <CVETableList
                    available={available}
                    advancedQuery={advancedQuery}
                    setAdvancedQuery={setAdvancedQuery}
                    filter={props.filter}
                    selected={selected}
                    setSelected={setSelected}
                />
            )}
        </>
    )
}

interface CVETableListProps {
    available: boolean
    filter: QueryCVERequest
    selected: string
    setSelected: (s: string) => void
    advancedQuery: boolean //是否开启高级查询
    setAdvancedQuery: (b: boolean) => void
}
const CVETableList: React.FC<CVETableListProps> = React.memo((props) => {
    const {available, selected, setSelected, advancedQuery, setAdvancedQuery} = props
    const [params, setParams] = useState<QueryCVERequest>({...props.filter})
    const [loading, setLoading] = useState(false)
    const [pagination, setPagination] = useState<PaginationSchema>(genDefaultPagination(20, 1))
    const [data, setData] = useState<CVEDetail[]>([])
    const [total, setTotal] = useState(0)
    const [isRefresh, setIsRefresh] = useState<boolean>(false) // 刷新表格，滚动至0

    const [searchType, setSearchType] = useState<string>("CVE")
    const [dataBaseUpdateVisible, setDataBaseUpdateVisible] = useState<boolean>(false)

    const [currentSelectItem, setCurrentSelectItem] = useState<CVEDetail>()

    useEffect(() => {
        ipcRenderer.invoke("GetCVE", {CVE: selected}).then((i: CVEDetailEx) => {
            const {CVE} = i
            setCurrentSelectItem(CVE)
        })
    }, [selected])

    useEffect(() => {
        if (advancedQuery) return
        setParams({
            ...defQueryCVERequest,
            Year: params.Year,
            CWE: params.CWE
        })
        setTimeout(() => {
            update(1)
        }, 100)
    }, [advancedQuery])

    useDebounceEffect(
        () => {
            if (advancedQuery) {
                setParams({
                    ...props.filter,
                    Year: params.Year,
                    CWE: params.CWE
                })
                setTimeout(() => {
                    update(1)
                }, 100)
            }
        },
        [props.filter],
        {wait: 200}
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
                    console.info("QueryCVE", finalParams, r)
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
            // {
            //     title: "利用路径",
            //     dataKey: "AccessVector"
            // },
            // {
            //     title: "利用难度",
            //     dataKey: "AccessComplexity"
            // },
            {
                title: "漏洞级别",
                dataKey: "BaseCVSSv2Score",
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
                console.log(111)

                update(1, limit)
            }, 10)
        },
        {wait: 500}
    ).run
    return (
        <div className={styles["cve-list"]}>
            {available ? (
                <TableVirtualResize<CVEDetail>
                    query={params}
                    titleHeight={36}
                    size='middle'
                    renderTitle={
                        <div className={styles["cve-list-title-body"]}>
                            <div className={styles["cve-list-title-left"]}>
                                {!advancedQuery && (
                                    <div className={styles["cve-list-title-query"]}>
                                        <span className={styles["cve-list-title-query-text"]}>高级查询</span>
                                        <YakitSwitch checked={advancedQuery} onChange={setAdvancedQuery} />
                                    </div>
                                )}
                                <div className={styles["cve-list-title"]}>CVE 数据库管理</div>
                            </div>
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
                                                Year: ""
                                            })
                                        }
                                        setSearchType(o)
                                    }}
                                    addonBeforeOption={[
                                        {
                                            label: "CVE",
                                            value: "Year"
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
            ) : (
                <>
                    <div className={styles["cve-list-title"]}>CVE 数据库管理</div>
                    <div className={styles["cve-list-btns"]}>
                        <YakitEmpty title='暂无数据' description='点击下方按钮进行数据库初始化' />
                        <YakitButton
                            type='outline1'
                            icon={<CloudDownloadIcon />}
                            onClick={() => setDataBaseUpdateVisible(true)}
                            style={{marginTop: 16}}
                        >
                            初始化数据库
                        </YakitButton>
                    </div>
                </>
            )}
            <DatabaseUpdateModal
                available={available}
                visible={dataBaseUpdateVisible}
                setVisible={setDataBaseUpdateVisible}
            />
        </div>
    )
})

interface DatabaseUpdateModalProps {
    available: boolean
    visible: boolean
    setVisible: (b: boolean) => void
}
const url = "https://cve-db.oss-cn-beijing.aliyuncs.com/default-cve.db.gzip"
const DatabaseUpdateModal: React.FC<DatabaseUpdateModalProps> = React.memo((props) => {
    const {available, visible, setVisible} = props
    const [token, setToken] = useState(randomString(40))
    const [messages, setMessages, getMessages] = useGetState<string[]>([])
    const [showOk, setShowOk] = useState(true)
    const [error, setError] = useState(false)
    // const [downloadProgress, setDownloadProgress] = useState<DownloadingState>();
    useEffect(() => {
        ipcRenderer.on(`${token}-data`, async (e, data: ExecResult) => {
            if (!data.IsMessage) {
                return
            }
            console.log("data", Uint8ArrayToString(data.Message))
            setMessages([...getMessages(), Uint8ArrayToString(data.Message)])
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            console.log("error", error)
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
        setError(false)
        // setAvailable(false)
        // setOutOfDate(false)
        // ipcRenderer.invoke("IsCVEDatabaseReady").then((rsp: { Ok: boolean; Reason: string; ShouldUpdate: boolean }) => {
        //     setAvailable(rsp.Ok)
        //     setOutOfDate(rsp.ShouldUpdate)
        // }).catch((err) => {
        //     failed("IsCVEDatabaseReady失败：" + err)
        // })
    }, [visible])
    return (
        <YakitHint
            visible={visible}
            title={available ? "CVE数据库更新" : "CVE数据初始化"}
            heardIcon={
                available ? (
                    <SolidRefreshIcon style={{color: "var(--yakit-warning-5)"}} />
                ) : (
                    <ShieldExclamationIcon style={{color: "var(--yakit-warning-5)"}} />
                )
            }
            onCancel={() => {
                setVisible(false)
                ipcRenderer.invoke("cancel-UpdateCVEDatabase", token)
            }}
            onOk={() => {
                setShowOk(false)
                ipcRenderer
                    .invoke("UpdateCVEDatabase", {Proxy: ""}, token)
                    .then(() => {})
                    .catch((e) => {
                        failed(`更新 CVE 数据库失败！${e}`)
                    })
            }}
            okButtonText={available ? "强制更新" : "初始化"}
            isDrag={true}
            mask={false}
            okButtonProps={{style: {display: showOk ? "flex" : "none"}}}
            content={
                <div className={styles["database-update-content"]}>
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
                    {error && (
                        <div>
                            如果更新失败，可点击该地址下载：
                            <a
                                href={url}
                                style={{color: "var(--yakit-primary-5)"}}
                                onClick={() => {
                                    openExternalWebsite(url)
                                }}
                            >
                                {url}
                            </a>
                            , 下载后请将文件放在~/yakit-projects项目文件下
                        </div>
                    )}
                </div>
            }
        />
    )
})
