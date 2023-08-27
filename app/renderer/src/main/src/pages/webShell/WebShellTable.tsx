import React, {useMemo, useState} from 'react';
import {QueryWebShellRequest} from "@/pages/webShell/WebShellViewer";
import {CVEInspect} from "@/pages/cve/CVEInspect";
import {ResizeBox} from "@/components/ResizeBox";
import {WebShellDetail} from "@/pages/webShell/models";
import {CVEDetail} from "@/pages/cve/models";
import styles from "@/pages/cve/CVETable.module.scss";
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch";
import {formatDate, formatTimestamp} from "@/utils/timeUtil";
import {YakitCombinationSearch} from "@/components/YakitCombinationSearch/YakitCombinationSearch";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext";
import {RefreshIcon} from "@/assets/newIcon";
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize";
import {QueryCVERequest} from "@/pages/cve/CVEViewer";
import {Divider} from 'antd';
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType";
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag";
import {useDebounceFn, useMemoizedFn} from 'ahooks';
import classNames from 'classnames';
import {genDefaultPagination, PaginationSchema, QueryGeneralResponse} from "@/pages/invoker/schema";

export interface WebShellManagerProp {
    available: boolean
    filter: QueryWebShellRequest
    advancedQuery: boolean //是否开启高级查询
    setAdvancedQuery: (b: boolean) => void
}


export const WebShellTable: React.FC<WebShellManagerProp> = React.memo((props) => {
    const {available, advancedQuery, setAdvancedQuery} = props
    const [selected, setSelected] = useState<string>("")
    const [webshell, setWebShell] = useState<WebShellDetail>({} as WebShellDetail)


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

    const [searchType, setSearchType] = useState<string>("")

    const [isRefresh, setIsRefresh] = useState<boolean>(false) // 刷新表格，滚动至0
    const [loading, setLoading] = useState(false)


    const columns: ColumnsTypeProps[] = useMemo<ColumnsTypeProps[]>(() => {
        return [
            {
                title: "ID",
                dataKey: "ID",
                width: 50
            },
            {
                title: "状态",
                dataKey: "Status",
                width: 70,
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
                render: (text: string) =>
                    <YakitTag color='bluePurple'>
                        {text}
                    </YakitTag>
            },
            {
                title: "影响产品",
                dataKey: "Product",
            },
            {
                title: "漏洞级别",
                dataKey: "BaseCVSSv2Score",
            },
            {
                title: "添加时间",
                dataKey: "CreatedAt",
                render: (v) => (v ? formatTimestamp(v) : "-"),
                sorterProps: {
                    sorterKey: "created_at",
                    sorter: true
                }
            }
        ]
    }, [])
    const onRowClick = useMemoizedFn((record: WebShellDetail) => {
        setSelected(record.Id) // 更新当前选中的行
        // setCVE(record)
    })
    const [pagination, setPagination] = useState<PaginationSchema>({
        ...genDefaultPagination(20, 1),
        OrderBy: "created_at",
        Order: "desc"
    })
    const [total, setTotal] = useState(0)
    const update = useMemoizedFn(
        (page?: number, limit?: number, order?: string, orderBy?: string, extraParam?: any) => {
            const paginationProps = {
                ...pagination,
                Page: page || 1,
                Limit: limit || pagination.Limit
            }
            setLoading(true)

        }
    )
    const [currentSelectItem, setCurrentSelectItem] = useState<WebShellDetail>()
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
                                                showByRightContext({
                                                    data: [
                                                        {label: "只更新最新数据", key: "update-latest-data"},
                                                        {label: "全量更新", key: "update-full-data"}
                                                    ],
                                                    onClick: (e) => {
                                                        console.log("showByRightContext onClick ", e)
                                                    }
                                                })
                                            }}
                                        >
                                            <RefreshIcon/>
                                            数据库更新
                                        </YakitButton>
                                    </div>
                                </div>
                            }
                            isRefresh={isRefresh}
                            renderKey='WebShell'
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
                    </>
                ) : (
                    <>
                    </>
                )}
        </div>

    )
})