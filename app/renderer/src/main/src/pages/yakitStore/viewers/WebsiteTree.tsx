import React, {useEffect, useState,useRef} from "react"
import {Button, Card, Col, Form, Pagination, Row, Space, Spin, Tree, Menu,Popconfirm,Popover} from "antd"
import {
    AntDTreeData,
    ConvertWebsiteForestToTreeData,
    WebsiteForest
} from "../../../components/WebsiteTree"
import {HTTPFlowMiniTable} from "../../../components/HTTPFlowMiniTable"
import {genDefaultPagination, QueryGeneralResponse} from "../../invoker/schema"
import {ReloadOutlined, SearchOutlined, DeleteOutlined,SettingOutlined} from "@ant-design/icons"
import {InputItem, SwitchItem} from "../../../utils/inputUtil"
import { showByContextMenu } from "../../../components/functionTemplate/showByContext"
import { HTTPFlow } from "../../../components/HTTPFlowTable/HTTPFlowTable"
import { failed,warn } from "../../../utils/notification"
import style from "./WebsiteTree.module.scss"
import {useGetState, useMemoizedFn} from "ahooks"
import {ExportExcel} from "../../../components/DataExport/DataExport"

import "./WebsiteTreeStyle.css"

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
    const [delUrlArr,setDelUrlArr] = useState<string[]>([])
    const [downLoadUrlArr,setDownLoadUrlArr] = useState<string[]>([])
    const [downLoadUrlPageSize,setDownLoadUrlPageSize] = useState<number>(20)
    const TreeBoxRef = useRef<any>()

    useEffect(()=>{
        setTreeHeight(TreeBoxRef.current.offsetHeight)
    },[])

    const setTreeCheckable = (treeDataRaw:AntDTreeData[],bool=false) => {
        return treeDataRaw.map((item)=>{
            if(!bool){
                if(item.children.length>0){
                    item.children = setTreeCheckable(item.children,true)
                }
                //@ts-ignore
                item.checkable = true
                return item
            }
            else{
                if(item.children.length>0){
                    item.children = setTreeCheckable(item.children,true)
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
            .then((data: { TreeDataJson: Uint8Array }) => {
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
        ipcRenderer
            .invoke("DeleteHTTPFlows", {URLPrefix: fetchDelUrl(node, "")})
            .then((res) => {
                refresh()
            })
    }

    const delManyReord = () => {
        if(delUrlArr.length===0){
            warn("请选择")
            return
        }
        ipcRenderer
            .invoke("DeleteHTTPFlows", {URLPrefixBatch: delUrlArr})
            .then((res) => {
                refresh()
            })
    }

    const fetchUrl = (data: AntDTreeData | any, arr: string[]) => {
        arr.unshift(data.title.indexOf("/") < 0 && !!data?.parent?.title ? `/${data.title}` : data.title)
        if(data?.parent?.title) fetchUrl(data?.parent, arr)
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
           if(downLoadUrlArr.length===0){
            warn("请选择")
            resolve(null)
        } 
        else{
            ipcRenderer.invoke("QueryHTTPFlows", {
            IncludeInUrl:downLoadUrlArr,
            Pagination: {
                ...genDefaultPagination(20),
                Page: page,
                Limit: limit,
                ...query
            }
            }).then((res: QueryGeneralResponse<HTTPFlow>) => {
                const {Data} = res
                //    数据导出
                let exportData: any = []
                    const header: string[] = []
                    const filterVal: string[] = []
                    header.push("URL")
                    filterVal.push("url")
                    // [["test"],["test1"]]
                    exportData = Data.map((item)=>([item.Url]))
                    setDownLoadUrlPageSize(res.Pagination.Limit)
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
                    <Spin spinning={loading} 
                    style={{height:"100%"}}
                    wrapperClassName="Website-tree-spin"
                    >
                        <Card
                            className="Website-tree-card"
                            title={
                                <>
                                <div>
                                  <Space>
                                    业务结构
                                    <Button
                                        type={"link"}
                                        size={"small"}
                                        icon={<ReloadOutlined/>}
                                        onClick={() => {
                                            refresh()
                                        }}
                                    />
                                </Space>  
                                </div>
                                
                                        {
                                            !props.targets ? (
                                                <Space>
                                                    <Form
                                                        size={"small"}
                                                        onSubmitCapture={(e) => {
                                                            e.preventDefault()
            
                                                            refresh()
                                                        }}
                                                        layout={"inline"}
                                                    >
                                                        <InputItem
                                                            label={"URL关键字"}
                                                            value={searchTarget}
                                                            setValue={setSearchTarget}
                                                            width={100}
                                                        />
                                                        <Form.Item style={{marginLeft: 0, marginRight: 0}}>
                                                            <Button
                                                                size={"small"}
                                                                type='link'
                                                                htmlType='submit'
                                                                icon={<SearchOutlined/>}
                                                                style={{marginLeft: 0, marginRight: 0}}
                                                            />
                                                        </Form.Item>
                                                    </Form>
                                                    {/*<Input onBlur={r => setSearchTarget(r.target.value)} size={"small"}/>*/}
                                                </Space>
                                            ) : (
                                                <Space>
                                                    <Form onSubmitCapture={e => {
                                                        e.preventDefault()
                                                    }} size={"small"}>
                                                        <SwitchItem
                                                            label={"自动刷新"} formItemStyle={{marginBottom: 0}}
                                                            value={autoRefresh} setValue={setAutoRefresh}
                                                        />
                                                    </Form>
                                                </Space>
                                            )
                                        }
                                </>
                            }
                            size={"small"}
                            extra={
                                <Popover
                                            overlayClassName={style["http-history-table-drop-down-popover"]}
                                            content={ 
                                        <Menu
                                        className={style["http-history-table-drop-down-batch"]}>
                                            <Menu.Item
                                                onClick={() => {
                                                    delManyReord()
                                                }}
                                            >
                                                批量删除
                                            </Menu.Item>
                                            <Menu.Item>
                                                <ExportExcel fileName="网站树视角" pageSize={downLoadUrlPageSize} text="批量导出" showButton={false} getData={getData} btnProps={{size: "small"}} />
                                            </Menu.Item>
                                        </Menu>
                                        
                                    }
                                    trigger='click'
                                    placement='bottomLeft'
><SettingOutlined />
</Popover>

                               
                                
                            }
                        >
                            <div ref={TreeBoxRef} style={{height:"100%",maxHeight: props.maxHeight}}>
                                <Tree
                                    height={treeHeight}
                                    className='ellipsis-tree'
                                    checkable
                                    onCheck={(checkedKeys,info)=>{
                                        // @ts-ignore
                                        const {children,key,parent,title,urls} = info.node
                                        let node = {
                                            children,
                                            key,
                                            parent,
                                            title,
                                            urls,
                                        }
                                        // @ts-ignore
                                        const delUrlStr = fetchDelUrl(node, "")
                                        // @ts-ignore
                                        const pathStr:string = title
                                        if(info.checked){
                                            setDownLoadUrlArr((item)=>(Array.from(new Set([...item,pathStr]))))
                                            setDelUrlArr((item)=>(Array.from(new Set([...item,delUrlStr]))))
                                        }
                                        else{
                                            setDownLoadUrlArr((value)=>value.filter((item)=>!item.startsWith(pathStr)))
                                            setDelUrlArr((value)=>value.filter((item)=>!item.startsWith(delUrlStr)))
                                        }
                                    }}
                                    showLine={true}
                                    treeData={treeData}
                                    titleRender={(nodeData: any) => {
                                        return (
                                            <div style={{display: "flex", width: "100%"}}>
                                                <span
                                                    title={`${nodeData.title}`}
                                                    className='titleContent'
                                                >
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
                                            path.unshift(
                                                !parent.parent ? parent.title + "/" : parent.title
                                            )
                                            parent = parent.parent
                                        }
                                        const pathStr = (path || []).join("")
                                        setSelected(pathStr)
                                    }}
                                    autoExpandParent={true}
                                    defaultExpandAll={true}
                                    onRightClick={({event, node}) => {
                                        let data = [
                                            {key:'bug-test',title:"发送到漏洞检测"},
                                            {key:'scan-port',title:"发送到端口扫描"},
                                            {key:'brute',title:"发送到爆破"},
                                        ]
                                        if(node.checkable===false){
                                            data.push({key:"del-item",title:"删除该记录"})
                                        }
                                        showByContextMenu(
                                            {
                                                data,
                                                onClick: ({key}) => {
                                                    if(key==="del-item"){
                                                        // @ts-ignore
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
                                                    }}
                                                    ipcRenderer.invoke("QueryHTTPFlows", param).then((data: QueryGeneralResponse<HTTPFlow>) => {
                                                        if(data.Total > 100){
                                                            failed("该节点下的URL数量超过100个，请缩小范围后再重新操作")
                                                            return
                                                        }
                                                        ipcRenderer.invoke("send-to-tab", {
                                                            type: key,
                                                            data:{URL: JSON.stringify(data.Data.map(item => item.Url))}
                                                        })
                                                    })
                                                }
                                            }
                                    )}}
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
