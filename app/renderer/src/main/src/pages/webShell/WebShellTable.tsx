import React, {useEffect, useMemo, useRef, useState} from 'react';
import {defQueryWebShellRequest, QueryWebShellRequest} from "@/pages/webShell/WebShellViewer";
import {ResizeBox} from "@/components/ResizeBox";
import {ShellType, WebShellDetail} from "@/pages/webShell/models";
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
    RemoveIcon,
    SMViewGridAddIcon, TrashIcon
} from "@/assets/newIcon";
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize";
import {Button, Divider, Space, Tooltip} from 'antd';
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType";
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag";
import {useDebounceEffect, useDebounceFn, useInViewport, useMemoizedFn, useUpdateEffect} from 'ahooks';
import {genDefaultPagination, PaginationSchema, QueryGeneralResponse} from "@/pages/invoker/schema";
import style from "@/components/HTTPFlowTable/HTTPFlowTable.module.scss";
import {showDrawer, showModal} from "@/utils/showModal";
import {RemarkDetail, WebShellCreatorForm} from "@/pages/webShell/WebShellComp";
import {YakitMenu, YakitMenuItemProps} from "@/components/yakitUI/YakitMenu/YakitMenu";
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
import {failed, success} from "@/utils/notification";
import {YakitModalConfirm} from "@/components/yakitUI/YakitModal/YakitModalConfirm";
import {ExclamationCircleOutlined} from '@ant-design/icons';
import {deleteWebShell, featurePing} from "@/pages/webShell/WebShellManager";
import {addToTab} from "@/pages/MainTabs";
import {
    DragonFailIcon,
    DragonSuccessIcon,
    RocketIcon,
    ScorpioFailIcon,
    ScorpioSuccessIcon
} from "@/pages/webShell/icon";
import { YakitDrawer } from '@/components/yakitUI/YakitDrawer/YakitDrawer';
import { WebShellDetailOpt } from './WebShellDetailOpt';
import {menuBodyHeight} from "@/pages/globalVariable"
import { showByRightContext } from '@/components/yakitUI/YakitMenu/showByRightContext';

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
// 抽屉
const cvePageRef = useRef<any>()
const [inViewport] = useInViewport(cvePageRef)
const [visible,setVisible] = useState<boolean>(false)
const [drawerData,setDrawerData] = useState<WebShellDetail>()
const heightDrawer = useMemo(() => {
    return menuBodyHeight.firstTabMenuBodyHeight - 110
}, [menuBodyHeight.firstTabMenuBodyHeight])


const onClose = useMemoizedFn(()=>{
    setVisible(false)
})

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
                width: 55,
                render: (_, i: WebShellDetail) => (
                    i.ShellType === ShellType.Behinder ? (
                            i.Status ? <ScorpioSuccessIcon/> : <ScorpioFailIcon/>
                        ) :
                        (i.Status ? <DragonSuccessIcon/> : <DragonFailIcon/>)

                )
            },
            {
                title: "URL",
                dataKey: "Url",
                render: (_, i: WebShellDetail) => <>
                    {i.Proxy.length > 0 ?
                        <Space><Button size={"small"} type='link' icon={<RocketIcon/>}/>{i.Url} </Space> : i.Url}
                </>


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

                                }}
                            />
                            <div className={style["divider-style"]}></div>

                            <ArrowCircleRightSvgIcon
                                style={{transform:"rotate(-90deg)"}}
                                className={style["icon-style"]}
                                onClick={(e) => {
                                    // addToTab("**webshell-opt", info)
                                    setVisible(true)
                                    setDrawerData(info)
                                    setAdvancedQuery(false)
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
                }).catch((e) => {

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

    const wsmMenuData = [
        {
            key: "webshell-curd", label: "Shell 操作",
            children: [
                {key: "webshell-curd-edit", label: "编辑"},
                {key: "webshell-curd-copy", label: "复制 URL"},
                {key: "webshell-curd-share", label: "分享"},
                {key: "webshell-curd-delete", label: "删除", itemIcon: <TrashIcon/>},
            ]
        },
        {type: "divider"},
        {key: "webshell-feature-ping", label: "验证存活"},
        {key: "webshell-feature-file_tree", label: "验证存活"},
    ]
    const wsmMenuSelect = useMemoizedFn((key: string) => {
        if (!selected) return
        switch (key) {
            case "webshell-curd-edit":
                const edit = showModal({
                    title: "编辑 Shell",
                    width: "60%",
                    content: <WebShellCreatorForm
                        closeModal={() => {
                            edit && edit.destroy()
                            refList()
                        }}
                        isCreate={false}
                        modified={selected}
                    />,
                    modalAfterClose: () => edit && edit.destroy(),
                })
                break
            case "webshell-curd-delete":
                deleteWebShell(selected.Id, selected.Url, refList)
                break
            case "webshell-curd-copy":
                break
            case "webshell-curd-share":
                break
            case "webshell-feature-ping":
                featurePing(selected.Id, refList)
                break
        }
    })

    const onRowContextMenu = (rowData: WebShellDetail, _, event: React.MouseEvent) => {
        if (rowData) {
            setSelected(rowData)
        }
        // showByCustom已废弃，删除，更换为 showByRightContext
        // showByCustom(
        //     {
        //         reactNode: (
        //             <div className={mitmStyles["context-menu-custom"]}>
        //                 <YakitMenu
        //                     data={wsmMenuData as YakitMenuItemProps[]}
        //                     width={150}
        //                     onClick={({key}) => {
        //                         wsmMenuSelect(key)
        //                     }}
        //                 />
        //             </div>
        //         ),
        //         height: 266,
        //         width: 158
        //     },
        //     event.clientX,
        //     event.clientY
        // )
        showByRightContext(
            {
                width: 158,
                data:wsmMenuData as YakitMenuItemProps[],
                onClick:({key}) => {
                    wsmMenuSelect(key)
                }
            },
            event.clientX,
            event.clientY
        )
    }

    return (

        <div className={cveStyles["cve-list"]} ref={cvePageRef}>
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
                                        <div className={cveStyles["cve-list-title"]}>网站管理</div>
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
                                        <YakitButton
                                            type='primary'
                                            onClick={() => {
                                                // setDataBaseUpdateVisible(true)
                                                let m = showModal({
                                                    title: "添加网站",
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
                                            添加网站
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
                 {visible && !!inViewport&&<YakitDrawer
                placement='bottom'
                closable={false}
                onClose={onClose}
                visible={visible && !!inViewport}
                getContainer={cvePageRef.current}
                mask={false}
                style={{height: visible ? heightDrawer : 0}}
                className={cveStyles["shell-table-drawer"]}
                contentWrapperStyle={{boxShadow: "0px -2px 4px rgba(133, 137, 158, 0.2)"}}
                title={<div className={cveStyles["heard-title"]}>{drawerData?.Url}</div>}
                extra={
                    <div className={cveStyles["heard-right-operation"]}>
                        <div onClick={onClose} className={cveStyles["icon-remove"]}>
                            <RemoveIcon />
                        </div>
                    </div>
                }
            >
                {drawerData&&<WebShellDetailOpt id='' webshellInfo={drawerData}/>}
            </YakitDrawer>}
        </div>

    )
})