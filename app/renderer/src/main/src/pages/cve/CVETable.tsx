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
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
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
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"
import {showByContextMenu} from "@/components/functionTemplate/showByContext"
import {formatDate, formatTimestamp} from "@/utils/timeUtil"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {YakitAutoComplete} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"

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
    const [pagination, setPagination] = useState<PaginationSchema>({
        ...genDefaultPagination(20, 1),
        OrderBy: "published_date",
        Order: "desc"
    })
    const [data, setData] = useState<CVEDetail[]>([])
    const [total, setTotal] = useState(0)
    const [isRefresh, setIsRefresh] = useState<boolean>(false) // 刷新表格，滚动至0

    const [searchType, setSearchType] = useState<string>("Keywords")
    const [dataBaseUpdateVisible, setDataBaseUpdateVisible] = useState<boolean>(false)
    const [dataBaseUpdateLatestMode, setDataBaseUpdateLatestMode] = useState<boolean>(false)

    const [updateTime, setUpdateTime] = useState<number>() // 数据库更新时间

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
            Keywords: params.Keywords,
            CWE: params.CWE
        })
        setTimeout(() => {
            update(1)
        }, 100)
    }, [advancedQuery])

    useEffect(() => {
        const finalParams = {
            ...params,
            Pagination: pagination
        }
        ipcRenderer.invoke("QueryCVE", finalParams).then((r: QueryGeneralResponse<CVEDetail>) => {
            if (r.Data.length > 0) {
                setUpdateTime(r.Data[0].UpdatedAt)
            }
        })
    }, [])

    useUpdateEffect(() => {
        if (dataBaseUpdateVisible) return
        update(1)
    }, [dataBaseUpdateVisible])

    useEffect(() => {
        if (advancedQuery) {
            setParams({
                ...props.filter,
                Keywords: params.Keywords,
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
                ...pagination,
                Page: page || 1,
                Limit: limit || pagination.Limit
            }
            setLoading(true)
            const finalParams = {
                ...params,
                ...(extraParam ? extraParam : {}),
                Pagination: paginationProps
            }
            ipcRenderer
                .invoke("QueryCVE", finalParams)
                .then((r: QueryGeneralResponse<CVEDetail>) => {
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
            },
            {
                title: "披露时间",
                dataKey: "PublishedAt",
                render: (v) => (v ? formatTimestamp(v) : "-"),
                sorterProps: {
                    sorterKey: "published_date",
                    sorter: true
                }
            },
            {
                title: "更新时间",
                dataKey: "LastModifiedData",
                render: (v) => (v ? formatTimestamp(v) : "-"),
                sorterProps: {
                    sorterKey: "last_modified_data",
                    sorter: true
                }
            }
        ]
    }, [])
    const onRowClick = useMemoizedFn((record: CVEDetail) => {
        setSelected(record.CVE) // 更新当前选中的行
        setCurrentSelectItem(record)
    })
    const onTableChange = useDebounceFn(
        (page: number, limit: number, sorter: SortProps, filter: any) => {
            setParams({
                ...params,
                ...filter
            })
            setPagination({
                ...pagination,
                Order: sorter.order === "asc" ? "asc" : "desc",
                OrderBy: sorter.order === "none" ? "published_date" : sorter.orderBy
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
                                <div className={styles["cve-list-total"]}>
                                    <span>Total</span>
                                    <span className={styles["cve-list-total-number"]}>{total}</span>
                                </div>
                                <div className={styles["cve-list-time"]}>
                                    更新时间:{updateTime ? formatDate(updateTime) : "-"}
                                </div>
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
                                        if (o === "Keywords") {
                                            setParams({
                                                ...params,
                                                CWE: ""
                                            })
                                        }
                                        if (o === "CWE") {
                                            setParams({
                                                ...params,
                                                Keywords: ""
                                            })
                                        }
                                        setSearchType(o)
                                    }}
                                    addonBeforeOption={[
                                        {
                                            label: "CVE",
                                            value: "Keywords"
                                        },
                                        {
                                            label: "CWE",
                                            value: "CWE"
                                        }
                                    ]}
                                    inputSearchModuleTypeProps={{
                                        size: "middle",
                                        value: params[searchType],
                                        placeholder: searchType === "Keywords" ? "CVE编号或关键字搜索" : "CEW编号搜索",
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
                                <YakitButton
                                    type='primary'
                                    onClick={() => {
                                        // setDataBaseUpdateVisible(true)
                                        showByRightContext({
                                            data: [
                                                {label: "只更新最新数据", key: "update-latest-data"},
                                                {label: "全量更新", key: "update-full-data"}
                                            ],
                                            onClick: (e) => {
                                                switch (e.key) {
                                                    case "update-latest-data":
                                                        setDataBaseUpdateLatestMode(true)
                                                        setDataBaseUpdateVisible(true)
                                                        return
                                                    case "update-full-data":
                                                        setDataBaseUpdateLatestMode(false)
                                                        setDataBaseUpdateVisible(true)
                                                        return
                                                }
                                            }
                                        })
                                    }}
                                >
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
                            description='点击下方按钮进行数据库初始化,（如已经下载/更新CVE数据库，建议关掉当前页面后重新打开）'
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
                latestMode={dataBaseUpdateLatestMode}
                visible={dataBaseUpdateVisible}
                setVisible={setDataBaseUpdateVisible}
            />
        </div>
    )
})

interface DatabaseUpdateModalProps {
    latestMode?: boolean
    available?: boolean
    visible: boolean
    setVisible: (b: boolean) => void
}

const url = "https://cve-db.oss-cn-beijing.aliyuncs.com/default-cve.db.gzip"
export const DatabaseUpdateModal: React.FC<DatabaseUpdateModalProps> = React.memo((props) => {
    const {available, visible, setVisible, latestMode} = props
    const [token, setToken] = useState(randomString(40))
    const [messages, setMessages, getMessages] = useGetState<string[]>([])
    const [status, setStatus] = useState<"init" | "progress" | "done">("init")
    const [error, setError] = useState<boolean>(false)
    const [percent, setPercent, getPercent] = useGetState<number>(0)

    const [proxy, setProxy] = useState<string>("")
    const [httpProxyList, setHttpProxyList] = useState<string[]>([])

    const errorMessage = useRef<string>("")
    const timer = useRef<number>(0) //超时处理
    const prePercent = useRef<number>(0) // 上一次的进度数值

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
            setPercent(Math.ceil(data.Progress))
            setMessages([Uint8ArrayToString(data.Message), ...getMessages()])
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            errorMessage.current = JSON.stringify(error).substring(0, 20)
            yakitFailed(`[UpdateCVEDatabase] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            // if (!errorMessage.current.includes("client failed")) {
            if (!errorMessage.current) {
                info("[UpdateCVEDatabase] finished")
                setStatus("done")
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
    }, [latestMode])
    useEffect(() => {
        if (!visible) return
        setStatus("init")
        setMessages([])
        setError(false)
        setPercent(0)
        errorMessage.current = ""
        getProxyListAndProxy()
    }, [visible])
    /**@description 获取代理list历史 和代理 */
    const getProxyListAndProxy = useMemoizedFn(() => {
        getRemoteValue("cveProxyList").then((listString) => {
            try {
                if (listString) {
                    const list: string[] = JSON.parse(listString) || []
                    setHttpProxyList(list)
                }
            } catch (error) {
                yakitFailed("CVE代理list获取失败:" + error)
            }
        })
        getRemoteValue("cveProxy").then((v) => {
            try {
                if (v) {
                    setProxy(v)
                }
            } catch (error) {
                yakitFailed("CVE代理获取失败:" + error)
            }
        })
    })
    const addProxyList = useMemoizedFn((url) => {
        if(!url)return
        const index = httpProxyList.findIndex((u) => u === url)
        if (index !== -1) return
        httpProxyList.push(url)
        setRemoteValue("cveProxyList", JSON.stringify(httpProxyList.filter((_, index) => index < 10)))
    })
    const tipNode = useMemo(
        () =>
            latestMode ? (
                <p>
                    差量更新数据仅更新最新数据
                    <br />
                    （OpenAI 可能暂未翻译）
                    <br />
                    被拒绝的 CVE 将不会更新
                </p>
            ) : (
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
        [props.latestMode]
    )

    const HintContent = useMemoizedFn(() => {
        switch (status) {
            case "init":
                return (
                    <>
                        {latestMode && (
                            <div className={styles["hint-content-proxy"]}>
                                <span style={{width: 75}}>设置代理：</span>
                                <YakitAutoComplete
                                    options={httpProxyList.map((item) => ({value: item, label: item}))}
                                    placeholder='设置代理'
                                    value={proxy}
                                    onChange={(v) => {
                                        setProxy(v)
                                        // addProxyList(proxy)
                                    }}
                                />
                            </div>
                        )}
                        <p>
                            {available
                                ? latestMode
                                    ? "差量更新数据库仅更新最新数据"
                                    : "点击“强制更新”，可更新本地CVE数据库"
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

        if (props.latestMode) {
            return "CVE 差量最新数据更新"
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

        if (props.latestMode) {
            return "更新最新数据"
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
                    if (latestMode) {
                        addProxyList(proxy)
                        setRemoteValue("cveProxy", proxy)
                    }
                    setStatus("progress")
                    const params = {
                        Proxy: props.latestMode ? proxy : "",
                        JustUpdateLatestCVE: props.latestMode
                    }
                    ipcRenderer
                        .invoke("UpdateCVEDatabase", params, token)
                        .then(() => {})
                        .catch((e) => {
                            failed(`更新 CVE 数据库失败！${e}`)
                        })
                }
            }}
            okButtonText={okButtonTextRender()}
            isDrag={true}
            mask={false}
            cancelButtonProps={{style: {display: status === "progress" && !props.latestMode ? "none" : "flex"}}}
            okButtonProps={{style: {display: status === "progress" ? "none" : "flex"}}}
            content={<div className={styles["database-update-content"]}>{HintContent()}</div>}
        />
    )
})
