import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import React, {useEffect, useMemo, useRef, useState} from "react"
import {genDefaultPagination, QueryGeneralRequest, QueryGeneralResponse} from "../invoker/schema"
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {useCreation, useDebounceEffect, useMemoizedFn} from "ahooks"
import {OutlineRefreshIcon, OutlineSearchIcon, OutlineTrashIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {yakitNotify} from "@/utils/notification"
import {Divider} from "antd"
import {YakitMenuItemProps} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {TrashIcon} from "@/assets/newIcon"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/enums/yakitRoute"
import {onRemoveToolFC} from "@/utils/deleteTool"
import {ExportExcel} from "@/components/DataExport/DataExport"
import {formatJson} from "../yakitStore/viewers/base"
import {useCampare} from "@/hook/useCompare/useCompare"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {SolidPaperairplaneIcon} from "@/assets/icon/solid"
import styles from "./DomainAssetPage.module.scss"
const {ipcRenderer} = window.require("electron")

const batchRefreshMenuData: YakitMenuItemProps[] = [
    {
        key: "noResetRefresh",
        label: "仅刷新"
    },
    {
        key: "resetRefresh",
        label: "重置查询条件刷新"
    }
]

interface Domain {
    ID?: number
    DomainName: string
    IPAddr: string
    HTTPTitle: string
}
interface QueryDomainsRequest extends QueryGeneralRequest {
    Network?: string
    DomainKeyword?: string
    Title?: string
}
export interface DomainAssetPageProps {}
export const DomainAssetPage: React.FC<DomainAssetPageProps> = (props) => {
    const [isRefresh, setIsRefresh] = useState<boolean>(false)
    const [allCheck, setAllCheck] = useState<boolean>(false)
    const [selectList, setSelectList] = useState<Domain[]>([])
    const isInitRequestRef = useRef<boolean>(true)
    const [query, setQuery] = useState<QueryDomainsRequest>({
        Pagination: genDefaultPagination(20)
    })
    const [loading, setLoading] = useState(false)
    const [response, setResponse] = useState<QueryGeneralResponse<Domain>>({
        Data: [],
        Pagination: genDefaultPagination(20),
        Total: 0
    })

    useEffect(() => {
        update(1)
    }, [])

    const columns: ColumnsTypeProps[] = [
        {
            title: "域名",
            dataKey: "DomainName",
            ellipsis: true,
            filterProps: {
                filterKey: "DomainKeyword",
                filtersType: "input",
                filterIcon: <OutlineSearchIcon className={styles["filter-icon"]} />
            },
            render: (text) => text || "-"
        },
        {
            title: "IP",
            dataKey: "IPAddr",
            ellipsis: true,
            filterProps: {
                filterKey: "Network",
                filtersType: "input",
                filterIcon: <OutlineSearchIcon className={styles["filter-icon"]} />
            },
            render: (text) => text || "-"
        },
        {
            title: "HTMLTitle",
            dataKey: "HTMLTitle",
            ellipsis: true,
            filterProps: {
                filterKey: "Title",
                filtersType: "input",
                filterIcon: <OutlineSearchIcon className={styles["filter-icon"]} />
            },
            render: (text) => text || "-"
        },
        {
            title: "操作",
            dataKey: "action",
            width: 60,
            fixed: "right",
            render: (_, record: Domain) => (
                <>
                    <YakitButton
                        type='text'
                        danger
                        onClick={(e) => {
                            e.stopPropagation()
                            onRemoveSingle(record.DomainName, record.ID)
                        }}
                        icon={<OutlineTrashIcon />}
                    />
                </>
            )
        }
    ]

    const compareSelectList = useCampare(selectList)
    const selectedRowKeys = useCreation(() => {
        return selectList.map((item) => (item.ID || "").toString()).filter((item) => item !== "")
    }, [compareSelectList])
    const selectNum = useMemo(() => {
        if (allCheck) return response.Total
        else return selectList.length
    }, [allCheck, compareSelectList, response.Total])

    const onSelectAll = useMemoizedFn((newSelectedRowKeys: string[], selected: Domain[], checked: boolean) => {
        if (checked) {
            setAllCheck(true)
            setSelectList(response.Data)
        } else {
            setAllCheck(false)
            setSelectList([])
        }
    })

    const onChangeCheckboxSingle = useMemoizedFn((c: boolean, key: string, selectedRows: Domain) => {
        if (c) {
            setSelectList((s) => [...s, selectedRows])
        } else {
            setAllCheck(false)
            setSelectList((s) => s.filter((ele) => ele.ID !== selectedRows.ID))
        }
    })

    const onTableChange = useMemoizedFn((page: number, limit: number, newSort: SortProps, filter: any) => {
        const newQuery = {
            ...query,
            ...filter
        }
        setQuery(newQuery)
    })

    useDebounceEffect(
        () => {
            // 初次不通过此处请求数据
            if (!isInitRequestRef.current) {
                update(1)
            }
        },
        [query],
        {
            wait: 200,
            leading: true
        }
    )

    const update = useMemoizedFn((page: number) => {
        const paginationProps = {
            ...query.Pagination,
            Page: page,
            Limit: 20
        }
        const finalParams: QueryDomainsRequest = {
            ...query,
            Pagination: paginationProps
        }
        const isInit = page === 1
        isInitRequestRef.current = false
        ipcRenderer
            .invoke("QueryDomains", finalParams)
            .then((res: QueryGeneralResponse<Domain>) => {
                const d = isInit ? res.Data : (response?.Data || []).concat(res.Data)
                setResponse({
                    ...res,
                    Data: d
                })
                if (isInit) {
                    setIsRefresh((prevIsRefresh) => !prevIsRefresh)
                    setSelectList([])
                    setAllCheck(false)
                } else {
                    if (allCheck) {
                        setSelectList(d)
                    }
                }
            })
            .catch((e: any) => {
                yakitNotify("error", "QueryExecHistory failed: " + `${e}`)
            })
    })

    const onRemoveSingle = (DomainName: string, ID?: number) => {
        ipcRenderer
            .invoke("DeleteDomains", {
                DomainKeyword: DomainName
            })
            .then(() => {
                setSelectList((s) => s.filter((ele) => ele.ID !== ID))
                setResponse({
                    ...response,
                    Data: response.Data.filter((item) => item.ID !== ID),
                    Total: response.Total - 1 > 0 ? response.Total - 1 : 0
                })
            })
            .catch((e) => {
                yakitNotify("error", `DelDomain failed: ${e}`)
            })
    }

    const getData = useMemoizedFn((params) => {
        return new Promise((resolve) => {
            ipcRenderer
                .invoke("QueryDomains", {
                    ...query,
                    Pagination: {
                        ...params
                    }
                })
                .then((res: QueryGeneralResponse<any>) => {
                    const {Data} = res
                    // 数据导出
                    let exportData: any = []
                    const header: string[] = []
                    const filterVal: string[] = []
                    columns.forEach((item) => {
                        if (item.dataKey !== "action") {
                            header.push(item.title)
                            filterVal.push(item.dataKey)
                        }
                    })
                    exportData = formatJson(filterVal, Data)
                    resolve({
                        header,
                        exportData,
                        response: res
                    })
                })
                .catch((e) => {
                    yakitNotify("error", "数据导出失败 " + `${e}`)
                })
        })
    })

    const onSendMenuSelect = (key: string) => {
        switch (key) {
            case "发送到漏洞检测":
                if (allCheck) {
                    yakitNotify("warning", "该批量操作不支持全选")
                    return
                }
                emiter.emit(
                    "openPage",
                    JSON.stringify({
                        route: YakitRoute.PoC,
                        params: {
                            URL: JSON.stringify(selectList.map((item) => item.DomainName))
                        }
                    })
                )
                break
            case "发送到爆破":
                if (allCheck) {
                    yakitNotify("warning", "该批量操作不支持全选")
                    return
                }
                emiter.emit(
                    "openPage",
                    JSON.stringify({
                        route: YakitRoute.Mod_Brute,
                        params: {
                            targets: selectList.map((item) => item.DomainName).join(",")
                        }
                    })
                )
                break
            default:
                break
        }
    }

    const onRemoveMultiple = () => {
        const transferParams = {
            selectedRowKeys: response.Total === selectNum ? [] : selectedRowKeys,
            params: query,
            interfaceName: "DeleteDomains",
            selectedRowKeysNmae: "IDs"
        }
        setLoading(true)
        onRemoveToolFC(transferParams)
            .then(() => {
                setQuery({
                    Pagination: genDefaultPagination(20)
                })
                setSelectList([])
                setAllCheck(false)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    }

    const onRefreshMenuSelect = (key: string) => {
        switch (key) {
            case "noResetRefresh":
                update(1)
                break
            case "resetRefresh":
                setQuery({
                    Pagination: genDefaultPagination(20)
                })
                break
            default:
                break
        }
    }

    return (
        <div className={styles["NewDomainAssetPage"]}>
            <TableVirtualResize<Domain>
                loading={loading}
                query={query}
                isRefresh={isRefresh}
                titleHeight={42}
                title={
                    <div className={styles["virtual-table-header-wrap"]}>
                        <div className={styles["virtual-table-heard-left"]}>
                            <div className={styles["virtual-table-heard-left-item"]}>
                                <span className={styles["virtual-table-heard-left-text"]}>Total</span>
                                <span className={styles["virtual-table-heard-left-number"]}>{response.Total}</span>
                            </div>
                            <Divider type='vertical' />
                            <div className={styles["virtual-table-heard-left-item"]}>
                                <span className={styles["virtual-table-heard-left-text"]}>Selected</span>
                                <span className={styles["virtual-table-heard-left-number"]}>{selectNum}</span>
                            </div>
                        </div>
                    </div>
                }
                extra={
                    <div className={styles["domainAsset-table-extra"]}>
                        <ExportExcel getData={getData} btnProps={{size: "small"}} fileName='域名资产' />
                        <YakitDropdownMenu
                            menu={{
                                data: [
                                    {key: "发送到漏洞检测", label: "发送到漏洞检测"},
                                    {key: "发送到爆破", label: "发送到爆破"}
                                ],
                                onClick: ({key}) => {
                                    onSendMenuSelect(key)
                                }
                            }}
                            dropdown={{
                                trigger: ["click"],
                                placement: "bottomLeft",
                                disabled: selectNum === 0
                            }}
                        >
                            <YakitButton type='primary' icon={<SolidPaperairplaneIcon />}>
                                发送到...
                            </YakitButton>
                        </YakitDropdownMenu>
                        <YakitPopconfirm
                            title={selectNum > 0 ? "确定删除勾选数据吗？" : "确定清空列表数据吗?"}
                            onConfirm={() => {
                                onRemoveMultiple()
                            }}
                            placement='bottomRight'
                        >
                            <YakitButton type='outline1' colors='danger' icon={<TrashIcon />}>
                                {selectNum > 0 ? "删除" : "清空"}
                            </YakitButton>
                        </YakitPopconfirm>
                        <YakitDropdownMenu
                            menu={{
                                data: batchRefreshMenuData,
                                onClick: ({key}) => {
                                    onRefreshMenuSelect(key)
                                }
                            }}
                            dropdown={{
                                trigger: ["hover"],
                                placement: "bottom"
                            }}
                        >
                            <YakitButton type='text2' icon={<OutlineRefreshIcon />} />
                        </YakitDropdownMenu>
                    </div>
                }
                data={response.Data}
                enableDrag={false}
                renderKey='ID'
                columns={columns}
                useUpAndDown
                onChange={onTableChange}
                pagination={{
                    total: response.Total,
                    limit: response.Pagination.Limit,
                    page: response.Pagination.Page,
                    onChange: (page) => {
                        update(page)
                    }
                }}
                rowSelection={{
                    isAll: allCheck,
                    type: "checkbox",
                    selectedRowKeys,
                    onSelectAll,
                    onChangeCheckboxSingle
                }}
            ></TableVirtualResize>
        </div>
    )
}
