import React, {useEffect, useMemo, useState} from 'react';
import {defQueryWebShellRequest, QueryWebShellRequest} from "@/pages/webShell/WebShellViewer";
import {ResizeBox} from "@/components/ResizeBox";
import {WebShellDetail} from "@/pages/webShell/models";
import cveStyles from "@/pages/cve/CVETable.module.scss";
import mitmStyles from "@/pages/mitm/MITMServerHijacking/MITMServerHijacking.module.scss";
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch";
import {formatTimestamp} from "@/utils/timeUtil";
import {YakitCombinationSearch} from "@/components/YakitCombinationSearch/YakitCombinationSearch";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {
    ArrowCircleRightSvgIcon,
    IconSolidCodeIcon,
    RefreshIcon,
    SMViewGridAddIcon
} from "@/assets/newIcon";
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize";
import {Button, Divider, Space, Tooltip} from 'antd';
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType";
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag";
import {useDebounceEffect, useDebounceFn, useMemoizedFn, useUpdateEffect} from 'ahooks';
import {genDefaultPagination, PaginationSchema, QueryGeneralResponse} from "@/pages/invoker/schema";
import style from "@/components/HTTPFlowTable/HTTPFlowTable.module.scss";
import {showDrawer, showModal} from "@/utils/showModal";
import {RemarkDetail, WebShellCreatorForm} from "@/pages/webShell/WebShellComp";
import {showByCustom} from "@/components/functionTemplate/showByContext";
import {YakitMenu} from "@/components/yakitUI/YakitMenu/YakitMenu";
import {
    availableColors,
    CalloutColor,
    onRemoveCalloutColor,
    onSendToTab
} from "@/components/HTTPFlowTable/HTTPFlowTable";
import {execPacketScan} from "@/pages/packetScanner/PacketScanner";
import {packetScanDefaultValue} from "@/pages/packetScanner/DefaultPacketScanGroup";
import {callCopyToClipboard} from "@/utils/basic";
import {showResponseViaHTTPFlowID} from "@/components/ShowInBrowser";

export interface WebShellManagerProp {
    available: boolean
    filter?: QueryWebShellRequest
    advancedQuery: boolean //是否开启高级查询
    setAdvancedQuery: (b: boolean) => void
}

const {ipcRenderer} = window.require("electron")

function emptyWebshell() {
    return {} as WebShellDetail
}

export const WebShellTable: React.FC<WebShellManagerProp> = React.memo((props) => {
    const {available, advancedQuery, setAdvancedQuery} = props
    const [selected, setSelected] = useState<WebShellDetail>(emptyWebshell)
    // const [webshell, setWebShell] = useState<WebShellDetail>(emptyWebshell)

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
                        // filter={props.filter}
                        selected={selected}
                        setSelected={setSelected}
                        // WebShell={webshell}
                        // setWebShell={setWebShell}
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
                    // filter={props.filter}
                    selected={selected}
                    setSelected={setSelected}
                    // WebShell={webshell}
                    // setWebShell={setWebShell}
                />
            )}
        </>
    )
})

interface WebShellTableListProps {
    available: boolean
    filter?: QueryWebShellRequest
    selected: WebShellDetail
    setSelected: (s: WebShellDetail) => void
    advancedQuery: boolean //是否开启高级查询
    setAdvancedQuery: (b: boolean) => void
    // WebShell: WebShellDetail
    // setWebShell: (shell: WebShellDetail) => void
}

const WebShellTableList: React.FC<WebShellTableListProps> = React.memo((props) => {
    // const {available, selected, setSelected, advancedQuery, setAdvancedQuery, WebShell, setWebShell} = props
    const {available, selected, setSelected, advancedQuery, setAdvancedQuery} = props
    const [params, setParams] = useState<QueryWebShellRequest>({
        Tag: "",
        Pagination: genDefaultPagination(200)
    })

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
                width: 50,
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
                width: 80,
                render: (_, i: WebShellDetail) =>
                    i.Tag ?
                        <YakitTag color='bluePurple'>
                            {i.Tag}
                        </YakitTag> : null
            },
            {
                title: "备注",
                dataKey: "Remark",
                width: 120,
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
        setSelected(record) // 更新当前选中的行
        // setWebShell(record)
        console.log(record)
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
        setCurrentSelectItem(selected)
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

    const refList = useMemoizedFn(() => {
        setParams({
            Tag: "",
            Pagination: genDefaultPagination(20)
        })
        setTimeout(() => {
            update()
        }, 10)
    })

    const [isEdit, setIsEdit] = useState<boolean>(false)

    const wsmMenuData = [
        {key: "webshell-edit", label: "编辑"},
        {key: "webshell-ping", label: "验证存活"},
    ]
    const wsmMenuSelect = useMemoizedFn((key: string) => {
        if (!selected) return
        switch (key) {
            case "webshell-edit":
                setIsEdit(true)
                let m = showModal({
                    title: "编辑 Shell",
                    width: "60%",
                    content: <WebShellCreatorForm
                        closeModal={() => {
                            m && m.destroy()
                            refList()
                        }}
                        isCreate={false}
                        modified={selected}
                    />,
                    modalAfterClose: () => m && m.destroy(),
                })
                break
        }
    })

    const onRowContextMenu = (rowData: WebShellDetail, _, event: React.MouseEvent) => {
        if (rowData) {
            setSelected(rowData)
        }
        showByCustom(
            {
                reactNode: (
                    <div className={mitmStyles["context-menu-custom"]}>
                        <YakitMenu
                            data={wsmMenuData}
                            width={150}
                            onClick={({key}) => {
                                wsmMenuSelect(key)
                            }}
                        />
                    </div>
                ),
                height: 266,
                width: 158
            },
            event.clientX,
            event.clientY
        )
    }

    return (

        <div className={cveStyles["cve-list"]}>
            {
                available ? (
                    <>
                        <TableVirtualResize<WebShellDetail>
                            query={params}
                            titleHeight={36}
                            size='middle'
                            renderTitle={
                                <div className={cveStyles["cve-list-title-body"]}>
                                    <div className={cveStyles["cve-list-title-left"]}>
                                        {!advancedQuery && (
                                            <div className={cveStyles["cve-list-title-query"]}>
                                                <span className={cveStyles["cve-list-title-query-text"]}>高级设置</span>
                                                <YakitSwitch checked={advancedQuery} onChange={setAdvancedQuery}/>
                                            </div>
                                        )}
                                        <div className={cveStyles["cve-list-title"]}>WebShell 管理</div>
                                        <Space>
                                            <Tooltip title='刷新会重置所有查询条件'>
                                                <Button
                                                    size={"small"}
                                                    type={"link"}
                                                    onClick={() => {
                                                        refList()
                                                    }}
                                                    icon={<RefreshIcon/>}
                                                />
                                            </Tooltip>
                                        </Space>
                                    </div>
                                    <div className={cveStyles["cve-list-title-extra"]}>
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
                                                    content: <WebShellCreatorForm
                                                        closeModal={() => {
                                                            m && m.destroy()
                                                            refList()
                                                        }}
                                                        isCreate={true}
                                                    />,
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
                            onRowContextMenu={onRowContextMenu}
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