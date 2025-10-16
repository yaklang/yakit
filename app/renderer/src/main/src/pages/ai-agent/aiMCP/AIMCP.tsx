import React, {ReactNode, useEffect, useRef, useState} from "react"
import {AIMCPListItemProps, AIMCPListProps, AIMCPProps, AIMCPToolListProps} from "./type"
import styles from "./AIMCP.module.scss"
import {
    GetAllMCPServersRequest,
    GetAllMCPServersResponse,
    MCPServer,
    MCPServerTool,
    UpdateMCPServerRequest
} from "../type/aiMCP"
import {genDefaultPagination} from "@/pages/invoker/schema"
import {useCreation, useInViewport, useMemoizedFn} from "ahooks"
import {grpcDeleteMCPServer, grpcGetAllMCPServers, grpcUpdateMCPServer} from "./utils"
import {YakitRoundCornerTag} from "@/components/yakitUI/YakitRoundCornerTag/YakitRoundCornerTag"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineDesktopcomputerIcon,
    OutlineDotsverticalIcon,
    OutlineExitIcon,
    OutlineGlobealtIcon,
    OutlineInformationcircleIcon,
    OutlinePencilaltIcon,
    OutlinePlayIcon,
    OutlinePlussmIcon,
    OutlineReplyIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {showYakitModal, YakitModalConfirm} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import classNames from "classnames"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {Tooltip} from "antd"
import {AIMCPForm} from "./aiMCPForm/AIMCPForm"
import {omit} from "lodash"
import {AIMCPServerTypeEnum} from "../defaultConstant"

const AIMCP: React.FC<AIMCPProps> = React.memo((props) => {
    const [listType, setListType] = useState<"mcp" | "mcp-tool">("mcp")
    const [currentMCP, setCurrentMCP] = useState<MCPServer>()
    const onSetCurrentMCP = useMemoizedFn((item: MCPServer) => {
        setCurrentMCP(item)
        setListType("mcp-tool")
    })
    const onBack = useMemoizedFn(() => {
        setCurrentMCP(undefined)
        setListType("mcp")
    })
    const renderListContent = useMemoizedFn(() => {
        let content: ReactNode = <></>
        switch (listType) {
            case "mcp":
                content = <AIMCPList setCurrentMCP={onSetCurrentMCP} />
                break
            case "mcp-tool":
                content = <AIMCPToolList item={currentMCP!} onBack={onBack} />
                break
            default:
                break
        }
        return content
    })
    return <>{renderListContent()}</>
})
export default AIMCP

const AIMCPToolList: React.FC<AIMCPToolListProps> = React.memo((props) => {
    const {onBack, item} = props
    return (
        <div className={styles["ai-mcp-list-wrapper"]}>
            <div className={styles["ai-mcp-list-header"]}>
                <div className={styles["ai-mcp-list-header-left"]}>
                    <span>工具列表</span>
                    <Tooltip title='Model Context Protocol(MCP)提供了标准化的Al模型上下文通信协议,支持SSE和WebSocket连接方式'>
                        <OutlineInformationcircleIcon className={styles["info-icon"]} />
                    </Tooltip>
                    <YakitRoundCornerTag>{item.Tools.length}</YakitRoundCornerTag>
                </div>
                <YakitButton type='text' icon={<OutlineReplyIcon />} onClick={onBack}>
                    返回
                </YakitButton>
            </div>
            <RollingLoadList<MCPServerTool>
                data={item.Tools}
                renderRow={(rowData: MCPServerTool, index: number) => {
                    return <React.Fragment key={rowData.Name}></React.Fragment>
                }}
                classNameRow={styles["ai-mcp-list-row"]}
                classNameList={styles["ai-mcp-list"]}
                defItemHeight={120}
                rowKey='Name'
                loadMoreData={() => {}}
                page={1}
                hasMore={false}
                loading={false}
            />
        </div>
    )
})

const AIMCPList: React.FC<AIMCPListProps> = React.memo((props) => {
    const {setCurrentMCP} = props
    const [keyWord, setKeyWord] = useState<string>("")
    const [loading, setLoading] = useState<boolean>(false)
    const [spinning, setSpinning] = useState<boolean>(false)
    const [hasMore, setHasMore] = useState<boolean>(false)
    const [isRef, setIsRef] = useState<boolean>(false)
    const [recalculation, setRecalculation] = useState<boolean>(false)
    const [response, setResponse] = useState<GetAllMCPServersResponse>({
        MCPServers: [],
        Pagination: genDefaultPagination(20),
        Total: 0
    })
    const mcpListRef = useRef<HTMLDivElement>(null)
    const [inViewPort = true] = useInViewport(mcpListRef)

    useEffect(() => {
        getList()
    }, [inViewPort])
    const getList = useMemoizedFn(async (page?: number) => {
        setLoading(true)
        const newQuery: GetAllMCPServersRequest = {
            Keyword: keyWord,
            Pagination: {
                ...genDefaultPagination(20),
                OrderBy: "created_at",
                Page: page || 1
            },
            IsShowToolList: false
        }
        if (newQuery.Pagination.Page === 1) {
            setSpinning(true)
        }
        try {
            const res = await grpcGetAllMCPServers(newQuery)
            console.log("grpcGetAllMCPServers-res", res, newQuery)
            if (!res.MCPServers) res.MCPServers = []
            const newPage = +res.Pagination.Page
            const length = newPage === 1 ? res.MCPServers.length : res.MCPServers.length + response.MCPServers.length
            setHasMore(length < +res.Total)
            let newRes: GetAllMCPServersResponse = {
                MCPServers: newPage === 1 ? res?.MCPServers : [...response.MCPServers, ...(res?.MCPServers || [])],
                Pagination: res?.Pagination || {
                    ...genDefaultPagination(20)
                },
                Total: res.Total
            }
            setResponse(newRes)
            if (newPage === 1) {
                setIsRef(!isRef)
            }
        } catch (error) {}
        setTimeout(() => {
            setLoading(false)
            setSpinning(false)
        }, 300)
    })
    const onSearch = useMemoizedFn((value) => {
        setKeyWord(value)
        setTimeout(() => {
            getList()
        }, 200)
    })
    const onPressEnter = useMemoizedFn((e) => {
        onSearch(e.target.value)
    })
    const loadMoreData = useMemoizedFn(() => {
        getList(+response.Pagination.Page + 1)
    })
    const handleNewAIMCP = useMemoizedFn(() => {
        const m = showYakitModal({
            title: "添加MCP Server",
            width: 600,
            content: (
                <AIMCPForm
                    onCancel={() => {
                        m.destroy()
                        getList()
                    }}
                />
            ),
            footer: null
        })
    })
    const onSetData = useMemoizedFn((item: MCPServer) => {
        setResponse((preV) => ({
            ...preV,
            MCPServers: preV.MCPServers.map((ele) => {
                if (ele.ID === item.ID) {
                    return {...ele, Enable: item.Enable}
                }
                return {...ele}
            })
        }))
        setRecalculation((v) => !v)
    })
    return (
        <div className={styles["ai-mcp-list-wrapper"]} ref={mcpListRef}>
            <div className={styles["ai-mcp-list-header"]}>
                <div className={styles["ai-mcp-list-header-left"]}>
                    <span>MCP服务器配置</span>
                    <Tooltip title='Model Context Protocol(MCP)提供了标准化的Al模型上下文通信协议,支持SSE和WebSocket连接方式'>
                        <OutlineInformationcircleIcon className={styles["info-icon"]} />
                    </Tooltip>
                    <YakitRoundCornerTag>{response.Total}</YakitRoundCornerTag>
                </div>
                <YakitButton icon={<OutlinePlussmIcon />} onClick={handleNewAIMCP} />
            </div>
            <YakitInput.Search
                value={keyWord}
                onChange={(e) => setKeyWord(e.target.value)}
                onSearch={onSearch}
                onPressEnter={onPressEnter}
                wrapperStyle={{margin: "0 12px"}}
                allowClear
            />
            <YakitSpin spinning={spinning}>
                <RollingLoadList<MCPServer>
                    data={response.MCPServers}
                    loadMoreData={loadMoreData}
                    renderRow={(rowData: MCPServer, index: number) => {
                        return (
                            <React.Fragment key={rowData.Name}>
                                <AIMCPListItem
                                    item={rowData}
                                    onRefresh={getList}
                                    onSetData={onSetData}
                                    setCurrentMCP={setCurrentMCP}
                                />
                            </React.Fragment>
                        )
                    }}
                    classNameRow={styles["ai-mcp-list-row"]}
                    classNameList={styles["ai-mcp-list"]}
                    page={+response.Pagination.Page}
                    hasMore={hasMore}
                    loading={loading}
                    defItemHeight={84}
                    rowKey='ID'
                    isRef={isRef}
                    recalculation={recalculation}
                />
            </YakitSpin>
        </div>
    )
})

const AIMCPListItem: React.FC<AIMCPListItemProps> = React.memo((props) => {
    const {item, onRefresh, setCurrentMCP, onSetData} = props

    const [visible, setVisible] = useState<boolean>(false)
    const [stopVisible, setStopVisible] = useState<boolean>(false)

    const [stopLoading, setStopLoading] = useState<boolean>(false)

    const onStart = useMemoizedFn((e) => {
        e.stopPropagation()
        updateMCPServer(true)
    })
    const onStop = useMemoizedFn((e) => {
        e.stopPropagation()
        updateMCPServer(false)
    })

    const updateMCPServer = useMemoizedFn((enable: boolean) => {
        setStopLoading(true)
        const updateValue: UpdateMCPServerRequest = {
            ...item,
            Enable: enable
        }
        // 更新
        grpcUpdateMCPServer(updateValue)
            .then(() => {
                onSetData({...item, Enable: enable})
            })
            .finally(() =>
                setTimeout(() => {
                    setStopVisible(false)
                    setStopLoading(false)
                }, 200)
            )
    })

    const menuSelect = useMemoizedFn((key: string) => {
        switch (key) {
            case "edit":
                onEdit()
                break
            case "delete":
                onDelete()
                break
            default:
                break
        }
        setVisible(false)
    })
    const onEdit = useMemoizedFn(() => {
        if (item.Enable) return
        const defaultValues: UpdateMCPServerRequest = omit(item, ["Tools"])
        const m = showYakitModal({
            title: "修改MCP",
            width: "50%",
            content: (
                <AIMCPForm
                    defaultValues={defaultValues}
                    onCancel={() => {
                        onRefresh()
                        m.destroy()
                    }}
                />
            ),
            footer: null
        })
    })
    const onDelete = useMemoizedFn(() => {
        if (item.Enable) return
        const m = YakitModalConfirm({
            width: 420,
            type: "white",
            onCancelText: "取消",
            onOkText: "删除",
            okButtonProps: {colors: "danger"},
            title: "删除MCP Server",
            content: "确定删除该MCP Server吗?",
            onOk: () => {
                grpcDeleteMCPServer({ID: item.ID}).then(() => {
                    onRefresh()
                    m.destroy()
                })
            },
            onCancel: () => m.destroy()
        })
    })

    const infoByType = useCreation(() => {
        let desc: string = ""
        let typeNode: ReactNode = <></>
        switch (item.Type) {
            case AIMCPServerTypeEnum.SSE:
                desc = `地址: ${item.URL}`
                typeNode = (
                    <YakitTag size='small' color='blue' className={styles["ai-mcp-type-tag"]}>
                        <OutlineGlobealtIcon className={styles["type-icon"]} />
                        sse
                    </YakitTag>
                )
                break

            case AIMCPServerTypeEnum.Stdio:
                desc = `命令: ${item.Command}`
                typeNode = (
                    <YakitTag size='small' color='green' className={styles["ai-mcp-type-tag"]}>
                        <OutlineDesktopcomputerIcon className={styles["type-icon"]} />
                        stdio
                    </YakitTag>
                )
                break

            default:
                break
        }
        return {
            desc,
            typeNode
        }
    }, [item.Type])
    const localModelMenu: YakitMenuItemType[] = useCreation(() => {
        let menu: YakitMenuItemType[] = [
            {
                key: "edit",
                label: "编辑",
                itemIcon: <OutlinePencilaltIcon />
            },
            {
                key: "delete",
                label: "删除",
                type: "danger",
                itemIcon: <OutlineTrashIcon />
            }
        ]
        return menu
    }, [])
    return (
        <div className={styles["ai-mcp-list-item"]} onClick={() => setCurrentMCP(item)}>
            <div className={styles["ai-mcp-heard"]}>
                <div className={styles["ai-mcp-heard-left"]}>
                    <div className={styles["ai-mcp-heard-left-name"]}>{item.Name}</div>
                    {infoByType.typeNode}
                </div>

                <div className={styles["ai-mcp-heard-extra"]}>
                    <div
                        className={classNames(styles["ai-mcp-heard-extra-btns"], {
                            [styles["ai-mcp-heard-extra-btns-hover"]]: visible || stopVisible || !item.Enable
                        })}
                        onClick={(e) => {
                            e.stopPropagation()
                        }}
                    >
                        {item.Enable ? (
                            <YakitPopconfirm
                                title={`确定要停用 ${item.Name} 吗？`}
                                onConfirm={onStop}
                                onCancel={() => setStopVisible(false)}
                                visible={stopVisible}
                                onVisibleChange={setStopVisible}
                                trigger={"click"}
                                okButtonProps={{loading: stopLoading}}
                            >
                                <YakitButton type='text' colors='danger' icon={<OutlineExitIcon />}>
                                    停用
                                </YakitButton>
                            </YakitPopconfirm>
                        ) : (
                            <YakitButton type='text' onClick={onStart} icon={<OutlinePlayIcon />}>
                                启用
                            </YakitButton>
                        )}
                        {!item.Enable && (
                            <YakitDropdownMenu
                                menu={{
                                    data: localModelMenu,
                                    onClick: ({key}) => menuSelect(key)
                                }}
                                dropdown={{
                                    trigger: ["click", "contextMenu"],
                                    placement: "bottomLeft",
                                    visible: visible,
                                    onVisibleChange: setVisible
                                }}
                            >
                                <YakitButton
                                    isActive={visible}
                                    type='text2'
                                    size='small'
                                    icon={<OutlineDotsverticalIcon />}
                                />
                            </YakitDropdownMenu>
                        )}
                    </div>
                </div>
            </div>
            <div className={styles["ai-mcp-description"]}>{infoByType.desc}</div>

            {/* {removeVisible && (
                <AILocalModelListItemPromptHint
                    title='删除模型'
                    content={`确认删除模型${item.Name}吗？确认删除源文件则自定义添加的模型文件会被一起删除`}
                    onOk={onDelete}
                    onCancel={onCancelRemove}
                />
            )} */}
        </div>
    )
})
