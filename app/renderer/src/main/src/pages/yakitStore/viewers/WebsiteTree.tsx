import React, {useEffect, useState, useRef} from "react"
import {Button, Card, Col, Form, Pagination, Row, Space, Spin, Tree, Menu, Popconfirm, Popover, Checkbox} from "antd"
import {AntDTreeData, ConvertWebsiteForestToTreeData, WebsiteForest} from "../../../components/WebsiteTree"
import {HTTPFlowMiniTable} from "../../../components/HTTPFlowMiniTable"
import {genDefaultPagination, QueryGeneralResponse} from "../../invoker/schema"
import {ReloadOutlined, SearchOutlined, DeleteOutlined, SettingOutlined} from "@ant-design/icons"
import {InputItem, SwitchItem} from "../../../utils/inputUtil"
import {showByContextMenu} from "../../../components/functionTemplate/showByContext"
import {HTTPFlow} from "../../../components/HTTPFlowTable/HTTPFlowTable"
import {failed, warn} from "../../../utils/notification"
import style from "./WebsiteTree.module.scss"
import {useGetState, useMemoizedFn} from "ahooks"
import {ExportExcel} from "../../../components/DataExport/DataExport"
import {ChevronDownIcon} from "@/assets/newIcon"
import "./WebsiteTreeStyle.css"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/routes/newRouteConstants"

export interface WebsiteTreeViewerProp {
    pageMode?: boolean
    targets?: string
    interval_seconds?: number

    // 树在垂直方向上节点过多时可外部设置最大高度值
    maxHeight?: number
}

const {ipcRenderer} = window.require("electron")
export const WebsiteTreeViewer: React.FC<WebsiteTreeViewerProp> = (props) => {
    const [treeData, setTreeData] = useState<AntDTreeData[]>([])
    const [autoRefresh, setAutoRefresh] = useState(!!props.targets)
    const [selected, setSelected] = useState(props.targets)
    const [limit, setLimit] = useState(20)
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [searchTarget, setSearchTarget] = useState(props.targets)
    const [loading, setLoading] = useState(false)
    const [isDelKey, setisDelKey] = useState("")
    const [treeHeight, setTreeHeight] = useState<number>(0)
    const [delUrlArr, setDelUrlArr] = useState<string[]>([])
    const [downLoadUrlArr, setDownLoadUrlArr] = useState<string[]>([])
    const [checkedAll, setCheckedAll] = useState<boolean>(false)
    const [selectedKeys, setSelectedKeys] = useState<string[]>([])
    const TreeBoxRef = useRef<any>()

    useEffect(() => {
        setTreeHeight(TreeBoxRef.current.offsetHeight)
    }, [])

    useEffect(() => {
        if (checkedAll) {
            let pathArr: string[] = []
            let delUrlArr: string[] = []
            treeData.map((node) => {
                const delUrlStr = fetchDelUrl(node, "")
                pathArr.push(delUrlStr)
                const pathStr: string = node.title
                delUrlArr.push(pathStr)
            })
            setDownLoadUrlArr(pathArr)
            setDelUrlArr(delUrlArr)
            setSelectedKeys(treeData.map((ele) => ele.key))
        }
    }, [checkedAll])

    const setTreeCheckable = (treeDataRaw: AntDTreeData[], bool = false) => {
        return treeDataRaw.map((item) => {
            if (!bool) {
                if (item.children.length > 0) {
                    item.children = setTreeCheckable(item.children, true)
                }
                //@ts-ignore
                item.checkable = true
                return item
            } else {
                if (item.children.length > 0) {
                    item.children = setTreeCheckable(item.children, true)
                }
                //@ts-ignore
                item.checkable = false
                return item
            }
        })
    }

    const refresh = () => {
        setLoading(true)
        ipcRenderer
            .invoke("GenerateWebsiteTree", {
                Targets: searchTarget
            })
            .then((data: {TreeDataJson: Uint8Array}) => {
                const treeDataRaw = ConvertWebsiteForestToTreeData(
                    JSON.parse(Buffer.from(data.TreeDataJson).toString("utf8")) as WebsiteForest
                ) as AntDTreeData[]
                const newTreeDataRaw = setTreeCheckable(treeDataRaw)
                setTreeData([...newTreeDataRaw])
                setLoading(false)
            })
    }

    const fetchDelUrl = (node: AntDTreeData, url: string): string => {
        if (!!node.parent) {
            const str = `${node.title[0] === "/" ? "" : "/"}${node.title}${url}`
            return fetchDelUrl(node.parent, str)
        } else {
            return `${node.title}${url}`
        }
    }

    const delReord = (node: AntDTreeData) => {
        ipcRenderer.invoke("DeleteHTTPFlows", {URLPrefix: fetchDelUrl(node, "")}).then((res) => {
            refresh()
        })
    }

    const delManyReord = () => {
        if (delUrlArr.length === 0) {
            warn("请选择")
            return
        }
        let obj: any = {URLPrefixBatch: delUrlArr}
        if (checkedAll) {
            obj = {DeleteAll: true}
        }
        ipcRenderer.invoke("DeleteHTTPFlows", obj).then((res) => {
            setDelUrlArr([])
            refresh()
        })
    }

    const fetchUrl = (data: AntDTreeData | any, arr: string[]) => {
        arr.unshift(data.title.indexOf("/") < 0 && !!data?.parent?.title ? `/${data.title}` : data.title)
        if (data?.parent?.title) fetchUrl(data?.parent, arr)
    }

    // 构建 table
    const uidToNodeMap = new Map<string, AntDTreeData>()
    const viewNode = (node: AntDTreeData) => {
        node.children.map(viewNode)
        uidToNodeMap.set(node.key, node)
    }
    treeData.forEach(viewNode)

    useEffect(() => {
        setSearchTarget(props.targets)
        refresh()
    }, [props.targets])

    useEffect(() => {
        if (!autoRefresh) {
            return
        }

        const id = setInterval(() => {
            if (!autoRefresh) {
                return
            }

            refresh()
        }, 3000)
        return () => {
            clearInterval(id)
        }
    }, [autoRefresh])

    const getData = useMemoizedFn((query) => {
        return new Promise((resolve) => {
            if (downLoadUrlArr.length === 0) {
                warn("请选择")
                resolve(null)
            } else {
                ipcRenderer
                    .invoke("QueryHTTPFlows", {
                        IncludeInUrl: downLoadUrlArr,
                        Pagination: {
                            Page: page,
                            Limit: limit,
                            ...query
                        }
                    })
                    .then((res: QueryGeneralResponse<HTTPFlow>) => {
                        const {Data} = res
                        //    数据导出
                        let exportData: any = []
                        const header: string[] = []
                        const filterVal: string[] = []
                        header.push("URL")
                        filterVal.push("url")
                        // [["test"],["test1"]]
                        exportData = Data.map((item) => [item.Url])
                        resolve({
                            header,
                            exportData,
                            response: res
                        })
                    })
                    .catch((e: any) => {
                        failed("数据导出失败 " + `${e}`)
                    })
            }
        })
    })

    return (
        <>
            <Row gutter={8} style={{height: "100%"}}>
                <Col span={7} style={{height: "100%", overflow: "auto"}}>
                    <Spin spinning={loading} style={{height: "100%"}} wrapperClassName='Website-tree-spin'>
                        <Card
                            className='Website-tree-card'
                            title={
                                <>
                                    <Space direction='vertical' style={{width: "100%"}}>
                                        <div style={{display: "flex", justifyContent: "space-between"}}>
                                            <Space>
                                                业务结构
                                                <Button
                                                    type={"link"}
                                                    size={"small"}
                                                    icon={<ReloadOutlined />}
                                                    onClick={() => {
                                                        refresh()
                                                    }}
                                                />
                                            </Space>
                                            {props.targets && (
                                                <Space>
                                                    <Form
                                                        onSubmitCapture={(e) => {
                                                            e.preventDefault()
                                                        }}
                                                        size={"small"}
                                                    >
                                                        <SwitchItem
                                                            label={"自动刷新"}
                                                            formItemStyle={{marginBottom: 0}}
                                                            value={autoRefresh}
                                                            setValue={setAutoRefresh}
                                                        />
                                                    </Form>
                                                </Space>
                                            )}
                                        </div>

                                        {!props.targets && (
                                            <Form
                                                size={"small"}
                                                onSubmitCapture={(e) => {
                                                    e.preventDefault()

                                                    refresh()
                                                }}
                                                layout={"inline"}
                                                style={{justifyContent: "space-between"}}
                                            >
                                                <InputItem
                                                    label={"URL关键字"}
                                                    value={searchTarget}
                                                    setValue={setSearchTarget}
                                                />
                                                <Form.Item style={{marginLeft: 0, marginRight: 0}}>
                                                    <Button
                                                        size={"small"}
                                                        type='link'
                                                        htmlType='submit'
                                                        icon={<SearchOutlined />}
                                                        style={{marginLeft: 0, marginRight: 0}}
                                                    />
                                                </Form.Item>
                                            </Form>
                                        )}
                                        <div style={{display: "flex", justifyContent: "space-between"}}>
                                            <Checkbox
                                                checked={checkedAll}
                                                onChange={(e) => {
                                                    if (!e.target.checked) {
                                                        setDownLoadUrlArr([])
                                                        setDelUrlArr([])
                                                        setSelectedKeys([])
                                                    }
                                                    setCheckedAll(e.target.checked)
                                                }}
                                            >
                                                全选
                                            </Checkbox>
                                            {delUrlArr.length === 0 ? (
                                                <Button
                                                    size='small'
                                                    disabled={true}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                    }}
                                                >
                                                    批量操作
                                                    <ChevronDownIcon style={{color: "#85899E"}} />
                                                </Button>
                                            ) : (
                                                <Popover
                                                    overlayClassName={style["http-history-table-drop-down-popover"]}
                                                    content={
                                                        <Menu className={style["http-history-table-drop-down-batch"]}>
                                                            <Menu.Item>
                                                                <Popconfirm
                                                                    title={"确定删除选择的URL吗？不可恢复"}
                                                                    onConfirm={() => {
                                                                        delManyReord()
                                                                    }}
                                                                >
                                                                    批量删除
                                                                </Popconfirm>
                                                            </Menu.Item>
                                                            <Menu.Item>
                                                                <ExportExcel
                                                                    fileName='网站树视角'
                                                                    text='批量导出'
                                                                    showButton={false}
                                                                    getData={getData}
                                                                    btnProps={{size: "small"}}
                                                                />
                                                            </Menu.Item>
                                                        </Menu>
                                                    }
                                                    trigger='click'
                                                    placement='bottomLeft'
                                                >
                                                    <Button
                                                        size='small'
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                        }}
                                                    >
                                                        批量操作
                                                        <ChevronDownIcon style={{color: "#85899E"}} />
                                                    </Button>
                                                </Popover>
                                            )}
                                        </div>
                                    </Space>
                                </>
                            }
                            size={"small"}
                            extra={null}
                            style={{borderTop: 0}}
                        >
                            <div ref={TreeBoxRef} style={{height: "100%", maxHeight: props.maxHeight}}>
                                <Tree
                                    height={treeHeight}
                                    className='ellipsis-tree'
                                    checkable
                                    onCheck={(checkedKeys, info) => {
                                        // @ts-ignore
                                        setSelectedKeys(checkedKeys)

                                        const {children, key, parent, title, urls} = info.node
                                        let node = {
                                            children,
                                            key,
                                            parent,
                                            title,
                                            urls
                                        }

                                        const delUrlStr = fetchDelUrl(node, "")

                                        const pathStr: string = title
                                        if (info.checked) {
                                            if (Array.isArray(checkedKeys) && checkedKeys.length === treeData.length) {
                                                setCheckedAll(true)
                                            }
                                            setDownLoadUrlArr((item) => Array.from(new Set([...item, pathStr])))
                                            setDelUrlArr((item) => Array.from(new Set([...item, delUrlStr])))
                                        } else {
                                            setCheckedAll(false)
                                            setDownLoadUrlArr((value) =>
                                                value.filter((item) => !item.startsWith(pathStr))
                                            )
                                            setDelUrlArr((value) => value.filter((item) => !item.startsWith(delUrlStr)))
                                        }
                                    }}
                                    checkedKeys={selectedKeys}
                                    selectable={true}
                                    showLine={true}
                                    treeData={treeData}
                                    titleRender={(nodeData: any) => {
                                        return (
                                            <div style={{display: "flex", width: "100%"}}>
                                                <span title={`${nodeData.title}`} className='titleContent'>
                                                    {nodeData.title}
                                                </span>
                                            </div>
                                        )
                                    }}
                                    onSelect={(key) => {
                                        if (key.length <= 0) {
                                            setisDelKey("")
                                            return
                                        }
                                        const selectedKey = key[0]
                                        const node = uidToNodeMap.get(selectedKey as string)
                                        if (!node) {
                                            return
                                        }
                                        let path = [node.title]
                                        setisDelKey(path[0])

                                        let parent = node.parent
                                        while (!!parent) {
                                            path.unshift(!parent.parent ? parent.title + "/" : parent.title)
                                            parent = parent.parent
                                        }
                                        const pathStr = (path || []).join("")
                                        setSelected(pathStr)
                                        setPage(1)
                                    }}
                                    autoExpandParent={true}
                                    defaultExpandAll={true}
                                    onRightClick={({event, node}) => {
                                        let data = [
                                            {key: "bug-test", title: "发送到漏洞检测"},
                                            {key: "scan-port", title: "发送到端口扫描"},
                                            {key: "brute", title: "发送到爆破"}
                                        ]
                                        if (node.checkable === false) {
                                            data.push({key: "del-item", title: "删除该记录"})
                                        }
                                        showByContextMenu({
                                            data,
                                            onClick: ({key}) => {
                                                if (key === "del-item") {
                                                    delReord(node)
                                                    return
                                                }
                                                let str: string[] = []
                                                fetchUrl(node, str)
                                                const param = {
                                                    SearchURL: str,
                                                    Pagination: {
                                                        ...genDefaultPagination(20),
                                                        Page: 1,
                                                        Limit: 101
                                                    }
                                                }
                                                ipcRenderer
                                                    .invoke("QueryHTTPFlows", param)
                                                    .then((data: QueryGeneralResponse<HTTPFlow>) => {
                                                        if (data.Total > 100) {
                                                            failed("该节点下的URL数量超过100个，请缩小范围后再重新操作")
                                                            return
                                                        }
                                                        const urls = data.Data.map((item) => item.Url)
                                                        switch (key) {
                                                            case "brute":
                                                                emiter.emit(
                                                                    "openPage",
                                                                    JSON.stringify({
                                                                        route: YakitRoute.Mod_Brute,
                                                                        params: {
                                                                            targets: urls.join(",")
                                                                        }
                                                                    })
                                                                )
                                                                break
                                                            case "scan-port":
                                                                emiter.emit(
                                                                    "openPage",
                                                                    JSON.stringify({
                                                                        route: YakitRoute.Mod_ScanPort,
                                                                        params: {
                                                                            targets: urls.join(",")
                                                                        }
                                                                    })
                                                                )
                                                                break
                                                            case "bug-test":
                                                                emiter.emit(
                                                                    "openPage",
                                                                    JSON.stringify({
                                                                        route: YakitRoute.PoC,
                                                                        params: {
                                                                            URL: JSON.stringify(urls)
                                                                        }
                                                                    })
                                                                )
                                                                break
                                                            default:
                                                                break
                                                        }
                                                    })
                                            }
                                        })
                                    }}
                                />
                            </div>
                        </Card>
                    </Spin>
                </Col>
                <Col span={17} style={{height: "100%"}}>
                    <Card
                        size={"small"}
                        className={"flex-card"}
                        title={"HTTP Flow Record"}
                        bodyStyle={{padding: 0}}
                        style={{borderTop: 0}}
                        extra={
                            <Pagination
                                simple={true}
                                defaultCurrent={1}
                                size={"small"}
                                pageSize={limit}
                                current={page}
                                onChange={(page, size) => {
                                    setPage(page)
                                    setLimit(size || 20)
                                }}
                                total={total}
                            />
                        }
                    >
                        <HTTPFlowMiniTable
                            onTotal={setTotal}
                            filter={{
                                SearchURL: selected,
                                Pagination: {
                                    ...genDefaultPagination(20),
                                    Page: page,
                                    Limit: limit
                                }
                            }}
                            source={""}
                        />
                    </Card>
                </Col>
            </Row>
        </>
    )
}
