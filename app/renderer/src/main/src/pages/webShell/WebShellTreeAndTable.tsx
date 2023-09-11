import {TreeNode, YakURLTree, YakURLTreeProp} from "@/pages/yakURLTree/YakURLTree";
import React, {useEffect, useMemo, useState} from "react";
import {ResizeBox} from "@/components/ResizeBox";
import cveStyles from "@/pages/cve/CVETable.module.scss";
import {
    RefreshIcon, TrashIcon,
} from "@/assets/newIcon";
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize";
import {RequestYakURLResponse, YakURLResource} from "@/pages/yakURLTree/data";
import {useDebounceFn, useMemoizedFn} from "ahooks";
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType";
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag";
import {formatTimestamp} from "@/utils/timeUtil";
import {genDefaultPagination, PaginationSchema} from "@/pages/invoker/schema";
import {Button, Divider, Form, Space, Tooltip} from "antd";
import {FileOutlined, FolderOpenOutlined} from "@ant-design/icons";
import {InputItem} from "@/utils/inputUtil";
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {WebShellDetail} from "@/pages/webShell/models";
import {showByCustom} from "@/components/functionTemplate/showByContext";
import mitmStyles from "@/pages/mitm/MITMServerHijacking/MITMServerHijacking.module.scss";
import {YakitMenu, YakitMenuItemProps} from "@/components/yakitUI/YakitMenu/YakitMenu";
import {showModal} from "@/utils/showModal";
import {WebShellCreatorForm} from "@/pages/webShell/WebShellComp";
import {deleteWebShell, featurePing} from "@/pages/webShell/WebShellManager";
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor";
import {requestYakURLList} from "@/pages/yakURLTree/netif";

interface WebShellURLTreeAndTableProp {
}

export const WebShellURLTreeAndTable: React.FC<WebShellURLTreeAndTableProp> = (props) => {
    const [params, setParams] = useState<RequestYakURLResponse>({
        Page: 1,
        PageSize: 20,
        Total: 0,
        Resources: []
    })
    const [isRefresh, setIsRefresh] = useState<boolean>(false)
    const [selected, setSelected] = useState<TreeNode>({} as TreeNode)
    const [selectedNode, setSelectedNode] = useState<TreeNode[]>([])
    const [data, setData] = useState<TreeNode[]>([])
    // const [treeData, setTreeData] = useState<TreeNode[]>([])
    const [loading, setLoading] = useState<boolean>(false)
    const onRowClick = useMemoizedFn((record: TreeNode) => {
        setSelected(record) // 更新当前选中的行
        // setWebShell(record)
        console.log(record)
    })
    const [pagination
        , setPagination] = useState<PaginationSchema>({
        ...genDefaultPagination(20, 1),
        OrderBy: "created_at",
        Order: "desc"
    })

    const [total, setTotal] = useState(0)


    const columns: ColumnsTypeProps[] = useMemo<ColumnsTypeProps[]>(() => {
        return [
            {
                title: "类型",
                dataKey: "Type",
                width: 40,
                render: (_, t: TreeNode) => (
                    t.data?.ResourceType === "dir" ? <FolderOpenOutlined/> : <FileOutlined/>
                )
            },
            {
                title: "名称",
                dataKey: "Name",
                width: 300,
                render: (_, t: TreeNode) => (
                    t.data?.ResourceName
                )
            },
            {
                title: "大小",
                dataKey: "Size",
                width: 300,
                render: (_, t: TreeNode) => (
                    t.data?.SizeVerbose
                )
            },
            {
                title: "修改时间",
                dataKey: "ModifiedTimestamp",
                width: 300,
                render: (_, t: TreeNode) => t.data?.ModifiedTimestamp ? formatTimestamp(t.data?.ModifiedTimestamp) : "-"
            },
            {
                title: "权限",
                dataKey: "Permission",
                width: 300,
                render: (_, t: TreeNode) =>
                    <YakitTag color='bluePurple'>
                        {t.data?.Extra.filter(i => i.Key === 'perm').map(i => i.Value).join('')}
                    </YakitTag>
            }
        ]
    }, [])

    const [currentSelectItem, setCurrentSelectItem] = useState<TreeNode>()
    useEffect(() => {
        if (!selected) return
        setCurrentSelectItem(selected)
    }, [selected])

    const update = useMemoizedFn(
        (page?: number, limit?: number, order?: string, orderBy?: string, extraParam?: any) => {
            const paginationProps = {
                ...pagination,
                Page: page || 1,
                PageSize: 20,
            }
            // setLoading(true)
            const finalParams = {
                ...params,
                ...(extraParam ? extraParam : {}),
                Pagination: paginationProps
            }
        })
    const onTableChange = useDebounceFn(
        (page: number, limit: number, sorter: SortProps, filter: any) => {

            setTimeout(() => {
                // setData()
            }, 10)
        },
        {wait: 500}
    ).run

    const refList = useMemoizedFn(() => {
        setParams({
            Page: 1,
            PageSize: 20,
            Total: 0,
            Resources: []
        })
        setTimeout(() => {
            update()
        }, 10)
    })

    const [currentPath, setCurrentPath] = useState<string>("behinder://C:/Vuln/apache-tomcat-8.5.84/webapps/S2-032?id=2&mode=list")

    const fileMenuData = [
        {
            key: "file-curd", label: "文件操作",
            children: [
                {key: "file-curd-open", label: "打开"},
                {key: "file-curd-edit", label: "编辑"},
                {key: "file-curd-copy", label: "复制文件名"},
                {key: "file-curd-delete", label: "删除", itemIcon: <TrashIcon/>},
            ]
        }
    ]

    const fileMenuSelect = useMemoizedFn((key: string) => {
        if (!selected) return
        switch (key) {
            case "file-curd-open":
                const url = selected.data!.Url
                url.Query = url.Query.map(queryItem => {
                    if (queryItem.Key === 'mode') {
                        return { ...queryItem, Value: 'show' };  // 如果键是 'mode'，则将值改为 'show'
                    } else {
                        return queryItem;  // 否则保持原样
                    }
                });


                requestYakURLList(url, rsp => {
                    const content = rsp.Resources[0]?.Extra.find(extra => extra.Key === 'content')?.Value || '';
                    // 找到回显的结果，并将其值赋给 'content'
                    console.log(content)
                    const edit = showModal({
                        title: "编辑 Shell",
                        width: "60%",
                        content: <YakitEditor
                            type={"yak"}
                            value={content}
                        />,
                        modalAfterClose: () => edit && edit.destroy(),
                    });
                });
                break
        }
    })

    const onRowContextMenu = (rowData: TreeNode, _, event: React.MouseEvent) => {
        if (rowData) {
            setSelected(rowData)
        }
        showByCustom(
            {
                reactNode: (
                    <div className={mitmStyles["context-menu-custom"]}>
                        <YakitMenu
                            data={fileMenuData as YakitMenuItemProps[]}
                            width={150}
                            onClick={({key}) => {
                                fileMenuSelect(key)
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
        <ResizeBox
            freeze={true}
            firstRatio={'20%'}
            firstNode={
                <YakURLTree
                    raw={currentPath}
                    onDataChange={
                        (newData) => {
                            // 在这里，你可以访问新的 `data` 的值
                            // setTreeData(newData)
                            console.log("WebShellURLTreeAndTable", newData)
                            setData(newData)
                            setTotal(newData.length)
                        }
                    }
                    onNodeSelect={
                        (node) => {
                            console.log("setSelectedNode ", node)
                            setSelectedNode(node)
                        }
                    }
                    onCurrentPath={
                        (path) => {
                            console.log("onCurrentPath ", path)
                            setCurrentPath(path)
                        }
                    }
                />
            }
            secondNodeStyle={{height: "100%"}}
            secondNode={
                <div className={cveStyles["cve-list"]}>
                    <TableVirtualResize<TreeNode>
                        // query={params}
                        titleHeight={36}
                        size='middle'
                        renderTitle={
                            <div className={cveStyles["cve-list-title-body"]}>
                                <div className={cveStyles["cve-list-title-left"]}>
                                    <div className={cveStyles["cve-list-title"]}>文件列表</div>
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
                                    <div className={cveStyles["cve-list-total"]}>
                                        <span>Total</span>
                                        <span className={cveStyles["cve-list-total-number"]}>{total}</span>
                                    </div>
                                </div>
                                <div className={cveStyles["cve-list-title-extra"]} style={{width: "70%"}}>
                                    <span style={{paddingRight: "5px"}}>Path:</span>
                                    <YakitInput
                                        onChange={(e) => setCurrentPath(e.target.value)}
                                        value={currentPath}
                                    />
                                    <>
                                        <Divider type='vertical' style={{margin: "0px 8px 0px 0px", top: 1}}/>
                                        <YakitButton >你好</YakitButton>
                                        <Divider type='vertical' style={{margin: "0px 8px 0px 0px", top: 1}}/>
                                        <YakitButton >你好</YakitButton>
                                        <Divider type='vertical' style={{margin: "0px 8px 0px 0px", top: 1}}/>
                                        <YakitButton >你好</YakitButton>
                                        <Divider type='vertical' style={{margin: "0px 8px 0px 0px", top: 1}}/>
                                        <YakitButton >你好</YakitButton>
                                        <Divider type='vertical' style={{margin: "0px 8px 0px 0px", top: 1}}/>
                                        <YakitButton >你好</YakitButton>
                                    </>
                                </div>

                            </div>
                        }
                        isRefresh={isRefresh}
                        renderKey='key'
                        data={selectedNode.length > 0 ? selectedNode : data}
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
                </div>

            }
        />
    )
}


interface WebShellURLTreeProp {
}

export const WebShellURLTree: React.FC<WebShellURLTreeProp> = (props) => {

    return (
        <>
            <p>WebShellURLTree</p>
        </>
    )
}