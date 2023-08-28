import React, {useEffect, useMemo, useState} from 'react';
import {defQueryWebShellRequest, QueryWebShellRequest} from "@/pages/webShell/WebShellViewer";
import {ResizeBox} from "@/components/ResizeBox";
import {WebShellDetail} from "@/pages/webShell/models";
import styles from "@/pages/cve/CVETable.module.scss";
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch";
import {formatDate, formatTimestamp} from "@/utils/timeUtil";
import {YakitCombinationSearch} from "@/components/YakitCombinationSearch/YakitCombinationSearch";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext";
import {
    ArrowCircleRightSvgIcon,
    ChromeFrameSvgIcon,
    IconSolidCodeIcon,
    RefreshIcon,
    SMViewGridAddIcon
} from "@/assets/newIcon";
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize";
import {Divider} from 'antd';
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType";
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag";
import {useDebounceEffect, useDebounceFn, useMemoizedFn, useUpdateEffect} from 'ahooks';
import {genDefaultPagination, PaginationSchema, QueryGeneralResponse} from "@/pages/invoker/schema";
import {CVEDetail} from "@/pages/cve/models";
import {defQueryCVERequest} from "@/pages/cve/CVEViewer";
import style from "@/components/HTTPFlowTable/HTTPFlowTable.module.scss";
import {showResponseViaResponseRaw} from "@/components/ShowInBrowser";
import {yakitNotify} from "@/utils/notification";
import {showDrawer, showModal} from "@/utils/showModal";
import {HTTPFlow, onExpandHTTPFlow} from "@/components/HTTPFlowTable/HTTPFlowTable";
import {ConfigEngineProxy} from "@/utils/ConfigEngineProxy";
import {analyzeFuzzerResponse} from "@/pages/fuzzer/HTTPFuzzerPage";
import {RemarkDetail, WebShellCreatorForm} from "@/pages/webShell/WebShellComp";

export interface WebShellManagerProp {
    available: boolean
    filter: QueryWebShellRequest
    advancedQuery: boolean //是否开启高级查询
    setAdvancedQuery: (b: boolean) => void
}

const {ipcRenderer} = window.require("electron")

function emptyWebshell() {
    return {} as WebShellDetail
}

export const WebShellTable: React.FC<WebShellManagerProp> = React.memo((props) => {
    const {available, advancedQuery, setAdvancedQuery} = props
    const [selected, setSelected] = useState<string>("")
    const [webshell, setWebShell] = useState<WebShellDetail>(emptyWebshell)

    return (
        <>
            {available ? (<ResizeBox
                isVer={true}
                firstMinSize={300}
                secondMinSize={300}
                firstNode={
                    <WebShellTableList
                        available={available}
                        advancedQuery={advancedQuery}
                        setAdvancedQuery={setAdvancedQuery}
                        filter={props.filter}
                        selected={selected}
                        setSelected={setSelected}
                        WebShell={webshell}
                        setWebShell={setWebShell}
                    />
                }
                secondNode={
                    <></>
                }
            />) : (
                <WebShellTableList
                    available={available}
                    advancedQuery={advancedQuery}
                    setAdvancedQuery={setAdvancedQuery}
                    filter={props.filter}
                    selected={selected}
                    setSelected={setSelected}
                    WebShell={webshell}
                    setWebShell={setWebShell}
                />
            )}
        </>
    )
})

interface WebShellTableListProps {
    available: boolean
    filter: QueryWebShellRequest
    selected: string
    setSelected: (s: string) => void
    advancedQuery: boolean //是否开启高级查询
    setAdvancedQuery: (b: boolean) => void
    WebShell: WebShellDetail
    setWebShell: (shell: WebShellDetail) => void
}

const WebShellTableList: React.FC<WebShellTableListProps> = React.memo((props) => {
    const {available, selected, setSelected, advancedQuery, setAdvancedQuery, WebShell, setWebShell} = props
    const [params, setParams] = useState<QueryWebShellRequest>({...props.filter})

    const [data, setData] = useState<WebShellDetail[]>([])
    const [dataBaseUpdateVisible, setDataBaseUpdateVisible] = useState<boolean>(false)

    const [searchType, setSearchType] = useState<string>("")

    const [isRefresh, setIsRefresh] = useState<boolean>(false) // 刷新表格，滚动至0
    const [loading, setLoading] = useState(false)


    const columns: ColumnsTypeProps[] = useMemo<ColumnsTypeProps[]>(() => {
        return [
            {
                title: "ID",
                dataKey: "ID",
                width: 50,
                render: (_, i: WebShellDetail) => (
                    i.Id
                )
            },
            {
                title: "状态",
                dataKey: "Status",
                width: 60,
                render: (_, i: WebShellDetail) => (
                    i.Status ? "🟢" : "🔴"
                )
            },
            {
                title: "URL",
                dataKey: "Url",
                render: (_, i: WebShellDetail) => i.Url
            },
            {
                title: "Type",
                dataKey: "Type",
                width: 70,
                render: (_, i: WebShellDetail) =>
                    <YakitTag color='bluePurple'>
                        {i.ShellScript}
                    </YakitTag>
            },
            {
                title: "OS",
                dataKey: "Os",
                width: 70,
            },
            {
                title: "Tag",
                dataKey: "Tag",
                render: (_, i: WebShellDetail) =>
                    i.Tag ?
                        <YakitTag color='bluePurple'>
                            {i.Tag}
                        </YakitTag> : null
            },
            {
                title: "备注",
                dataKey: "Remark",
                render: (_, i: WebShellDetail) => (
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <div style={{overflow: 'hidden', textOverflow: 'ellipsis'}}>
                            {i.Remark}
                        </div>
                        {i.Remark && (
                            <YakitButton
                                type='primary'
                                onClick={() => {
                                    let m = showModal({
                                        title: "备注",
                                        width: "60%",
                                        content: <RemarkDetail remark={i.Remark}/>,
                                        modalAfterClose: () => m && m.destroy(),
                                    })
                                }}
                                size={"small"}
                            >
                                详情
                            </YakitButton>
                        )}
                    </div>
                )
            },
            {
                title: "添加时间",
                dataKey: "CreatedAt",
                render: (v) => (v ? formatTimestamp(v) : "-"),
                sorterProps: {
                    sorterKey: "created_at",
                    sorter: true
                }
            },
            {
                title: "操作",
                dataKey: "action",
                width: 80,
                fixed: "right",
                render: (_, info: WebShellDetail) => {
                    if (!info.Id) return <></>
                    return (
                        <div className={style["action-btn-group"]}>
                            <IconSolidCodeIcon
                                className={style["icon-style"]}
                                onClick={() => {
                                    let m = showDrawer({
                                        title: "WebShell 编辑",
                                        width: "80%",
                                        content: <div><h1>Codec</h1></div>
                                    })
                                }}
                            />
                            <div className={style["divider-style"]}></div>

                            <ArrowCircleRightSvgIcon
                                className={style["icon-style"]}
                                onClick={(e) => {
                                    let m = showDrawer({
                                        width: "80%",
                                        content: <div> em </div>
                                    })
                                    //     m.destroy()
                                }}
                            />
                        </div>
                    )
                }
            }

        ]
    }, [])
    const onRowClick = useMemoizedFn((record: WebShellDetail) => {
        setSelected(record.Id) // 更新当前选中的行
        setWebShell(record)
    })
    const [pagination, setPagination] = useState<PaginationSchema>({
        ...genDefaultPagination(20, 1),
        OrderBy: "created_at",
        Order: "desc"
    })


    const [total, setTotal] = useState(0)

    useEffect(() => {
        if (advancedQuery) return
        setParams({
            ...defQueryWebShellRequest,
            Tag: params.Tag
        })
        setTimeout(() => {
            update(1)
        }, 100)
    }, [advancedQuery])

    useEffect(() => {
        if (advancedQuery) {
            setParams({
                ...props.filter,
                Tag: params.Tag
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
            ipcRenderer.invoke("QueryWebShells", finalParams)
                .then((r: QueryGeneralResponse<WebShellDetail>) => {
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

    useUpdateEffect(() => {
        if (dataBaseUpdateVisible) return
        update(1)
    }, [dataBaseUpdateVisible])

    const [currentSelectItem, setCurrentSelectItem] = useState<WebShellDetail>()
    useEffect(() => {
        if (!selected) return
        setCurrentSelectItem(WebShell)
    }, [selected])
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

    console.log("currentSelectItem ", currentSelectItem)
    return (

        <div className={styles["cve-list"]}>
            {
                available ? (
                    <>
                        <TableVirtualResize<WebShellDetail>
                            query={params}
                            titleHeight={36}
                            size='middle'
                            renderTitle={
                                <div className={styles["cve-list-title-body"]}>
                                    <div className={styles["cve-list-title-left"]}>
                                        {!advancedQuery && (
                                            <div className={styles["cve-list-title-query"]}>
                                                <span className={styles["cve-list-title-query-text"]}>高级查询</span>
                                                <YakitSwitch checked={advancedQuery} onChange={setAdvancedQuery}/>
                                            </div>
                                        )}
                                        <div className={styles["cve-list-title"]}>WebShell 管理</div>

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
                                                console.log(o)
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
                                                    console.log("inputSearchModuleTypeProps onChange ", e)
                                                },
                                                onSearch: (value) => {
                                                    console.log("inputSearchModuleTypeProps onSearch ", value)
                                                }
                                            }}
                                        />
                                        <Divider type='vertical'/>
                                        <YakitButton
                                            type='primary'
                                            onClick={() => {
                                                // setDataBaseUpdateVisible(true)
                                                let m = showModal({
                                                    title: "添加 Shell",
                                                    width: "60%",
                                                    content: <WebShellCreatorForm />,
                                                    modalAfterClose: () => m && m.destroy(),
                                                })
                                            }}
                                        >
                                            <SMViewGridAddIcon/>
                                            添加 Shell
                                        </YakitButton>
                                    </div>
                                </div>
                            }
                            isRefresh={isRefresh}
                            renderKey='Id'
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
                            isShowTotal={true}
                        />
                    </>
                ) : (
                    <>
                    </>
                )}
        </div>

    )
})