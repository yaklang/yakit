import React, {useEffect, useMemo, useRef, useState} from "react"
import {AutoCard} from "@/components/AutoCard"
import {Divider, Empty, Progress, Space, Table, Tag} from "antd"
import {defQueryCVERequest, QueryCVERequest} from "@/pages/cve/CVEViewer"
import {
    useCountDown,
    useDebounceEffect,
    useDebounceFn,
    useGetState,
    useKeyPress,
    useMemoizedFn,
    useUpdateEffect
} from "ahooks"
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
import {
    CheckCircleIcon,
    CloudDownloadIcon,
    RefreshIcon,
    ShieldExclamationIcon,
    SolidRefreshIcon
} from "@/assets/newIcon"
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

export const CVETable: React.FC<CVETableProp> = React.memo((props) => {
    const {available, advancedQuery, setAdvancedQuery} = props
    const [selected, setSelected] = useState<string>("")
    return (
        <>
            {available ? (
                <ResizeBox
                    isVer={true}
                    firstMinSize={300}
                    secondMinSize={300}
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
})

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

    const [searchType, setSearchType] = useState<string>("Year")
    const [dataBaseUpdateVisible, setDataBaseUpdateVisible] = useState<boolean>(false)

    const [currentSelectItem, setCurrentSelectItem] = useState<CVEDetail>()

    useEffect(() => {
        if (!selected) return
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

    useUpdateEffect(() => {
        if (dataBaseUpdateVisible) return
        update(1)
    }, [dataBaseUpdateVisible])

    useEffect(() => {
        if (advancedQuery) {
            setParams({
                ...props.filter,
                Year: params.Year,
                CWE: params.CWE
            })
        }
    }, [props.filter, advancedQuery])

    useDebounceEffect(
        () => {
            update(1)
        },
        [params],
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
                render: (text: string) =>
                    text ? (
                        <>
                            {text.split("|").map((ele) => (
                                <YakitTag color='bluePurple' key={ele}>
                                    {ele}
                                </YakitTag>
                            ))}
                        </>
                    ) : (
                        ""
                    )
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
                    if (i.Severity === "严重") {
                        color = "serious"
                    }
                    if (i.Severity === "高危") {
                        color = "danger"
                    }
                    if (i.Severity === "中危") {
                        color = "warning"
                    }
                    return i.Severity === "-" ? (
                        ""
                    ) : (
                        <div
                            className={classNames(styles["cve-list-product-success"], {
                                [styles["cve-list-product-warning"]]: color === "warning",
                                [styles["cve-list-product-danger"]]: color === "danger",
                                [styles["cve-list-product-serious"]]: color === "serious"
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
                                        if (o === "Year") {
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
                                        onSearch: (value) => {
                                            setParams({
                                                ...params,
                                                [searchType]: value
                                            })
                                            setTimeout(() => {
                                                update(1)
                                            }, 100)
                                        }
                                    }}
                                />
                                <Divider type='vertical' />
                                <YakitButton type='primary' onClick={() => setDataBaseUpdateVisible(true)}>
                                    <RefreshIcon className={styles["refresh-icon"]} />
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
                        <YakitEmpty
                            title='暂无数据'
                            description='点击下方按钮进行数据库初始化,（如已经下载/更新CVE数据库，建议关掉t当前页面后重新打开）'
                        />
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
    available?: boolean
    visible: boolean
    setVisible: (b: boolean) => void
}
const url = "https://cve-db.oss-cn-beijing.aliyuncs.com/default-cve.db.gzip"
export const DatabaseUpdateModal: React.FC<DatabaseUpdateModalProps> = React.memo((props) => {
    const {available, visible, setVisible} = props
    const [token, setToken] = useState(randomString(40))
    const [messages, setMessages, getMessages] = useGetState<string[]>([])
    const [status, setStatus] = useState<"init" | "progress" | "done">("init")
    const [error, setError] = useState<boolean>(false)
    const [percent, setPercent, getPercent] = useGetState<number>(0)

    const [targetDate, setTargetDate] = useState<number>()
    const [countdown] = useCountDown({
        targetDate,
        onEnd: () => {
            setTargetDate(0)
        }
    })

    const errorMessage = useRef<string>("")
    const timer = useRef<number>(0) //超时处理
    const prePercent = useRef<number>(0) // 上一次的进度数值
    useEffect(() => {
        if (countdown === 0) setStatus("done")
    }, [countdown])
    useEffect(() => {
        ipcRenderer.on(`${token}-data`, async (e, data: ExecResult) => {
            if (!data.IsMessage) {
                return
            }
            if (getPercent() === prePercent.current) {
                timer.current += 1
            } else {
                prePercent.current = getPercent()
                timer.current = 0
            }
            if (timer.current > 30) {
                setStatus("init")
                setMessages([])
                setError(true)
                yakitFailed(`[UpdateCVEDatabase] error:连接超时`)
                timer.current = 0
            }
            setPercent(data.Progress)
            setMessages([Uint8ArrayToString(data.Message), ...getMessages()])
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            errorMessage.current = JSON.stringify(error).substring(0, 20)
            yakitFailed(`[UpdateCVEDatabase] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            if (!errorMessage.current.includes("client failed")) {
                info("[UpdateCVEDatabase] finished")
                const n = Math.round(Math.random() * 10 + 5) // 10-15随机数
                setTargetDate(Date.now() + n * 1000)
            } else {
                setStatus("init")
                setMessages([])
                setError(true)
            }
            errorMessage.current = ""
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
        setStatus("init")
        setMessages([])
        setError(false)
        setPercent(0)
        errorMessage.current = ""
    }, [visible])

    const tipNode = useMemo(
        () => (
            <p>
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
            </p>
        ),
        []
    )

    const HintContent = useMemoizedFn(() => {
        switch (status) {
            case "init":
                return (
                    <>
                        <p>
                            {available
                                ? "点击“强制更新”，可更新本地CVE数据库"
                                : "本地CVE数据库未初始化，请点击“初始化”下载CVE数据库"}
                        </p>
                        {tipNode}
                    </>
                )
            case "progress":
                return (
                    <>
                        {tipNode}
                        <div className={styles["download-progress"]}>
                            <Progress
                                strokeColor='#F28B44'
                                trailColor='#F0F2F5'
                                percent={percent}
                                format={(percent) => `已下载 ${percent}%`}
                            />
                        </div>
                        <div className={styles["database-update-messages"]}>
                            {countdown === 0 ? (
                                ""
                            ) : (
                                <p>
                                    CVE 数据库 解压中：
                                    <span style={{color: "var(--yakit-primary-5)"}}>
                                        {Math.round(countdown / 1000)}
                                    </span>{" "}
                                    s
                                </p>
                            )}
                            {messages.map((i) => {
                                return <p>{`${i}`}</p>
                            })}
                        </div>
                    </>
                )
            case "done":
                return <p>需要重启Yakit才能生效，如果重启后还未加载出数据，建议关掉当前页面重新打开。</p>
            default:
                break
        }
    })
    const heardIconRender = useMemoizedFn(() => {
        if (status === "done") {
            return <CheckCircleIcon style={{color: "var(--yakit-success-5)"}} />
        }
        if (available) {
            return <SolidRefreshIcon style={{color: "var(--yakit-warning-5)"}} />
        } else {
            return <ShieldExclamationIcon style={{color: "var(--yakit-warning-5)"}} />
        }
    })
    const titleRender = useMemoizedFn(() => {
        if (status === "done") {
            return "更新完成"
        }
        if (available) {
            return "CVE数据库更新"
        } else {
            return "CVE数据初始化"
        }
    })
    const okButtonTextRender = useMemoizedFn(() => {
        if (status === "done") {
            return "重启"
        }
        if (available) {
            return "强制更新"
        } else {
            return "初始化"
        }
    })
    return (
        <YakitHint
            visible={visible}
            title={titleRender()}
            heardIcon={heardIconRender()}
            onCancel={() => {
                setVisible(false)
                ipcRenderer.invoke("cancel-UpdateCVEDatabase", token)
            }}
            onOk={() => {
                if (status === "done") {
                    ipcRenderer
                        .invoke("relaunch")
                        .then(() => {})
                        .catch((e) => {
                            failed(`重启失败: ${e}`)
                        })
                } else {
                    setStatus("progress")
                    ipcRenderer
                        .invoke("UpdateCVEDatabase", {Proxy: ""}, token)
                        .then(() => {})
                        .catch((e) => {
                            failed(`更新 CVE 数据库失败！${e}`)
                        })
                }
            }}
            okButtonText={okButtonTextRender()}
            isDrag={true}
            mask={false}
            cancelButtonProps={{style: {display: status === "progress" ? "none" : "flex"}}}
            okButtonProps={{style: {display: status === "progress" ? "none" : "flex"}}}
            content={<div className={styles["database-update-content"]}>{HintContent()}</div>}
        />
    )
})
