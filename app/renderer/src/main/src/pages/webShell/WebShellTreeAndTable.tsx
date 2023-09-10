import {TreeNode, YakURLTree, YakURLTreeProp} from "@/pages/yakURLTree/YakURLTree";
import React, {useEffect, useMemo, useState} from "react";
import {ResizeBox} from "@/components/ResizeBox";
import {WebShellDetail} from "@/pages/webShell/models";
import cveStyles from "@/pages/cve/CVETable.module.scss";
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch";
import {
    ArrowCircleRightSvgIcon,
    IconSolidCodeIcon,
    RefreshIcon,
    SMViewGridAddIcon,
    SolidDocumentTextIcon
} from "@/assets/newIcon";
import {YakitCombinationSearch} from "@/components/YakitCombinationSearch/YakitCombinationSearch";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {showModal} from "@/utils/showModal";
import {RemarkDetail, WebShellCreatorForm} from "@/pages/webShell/WebShellComp";
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize";
import {RequestYakURLResponse, YakURLResource} from "@/pages/yakURLTree/data";
import {useDebounceFn, useMemoizedFn} from "ahooks";
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType";
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag";
import {formatTimestamp} from "@/utils/timeUtil";
import style from "@/components/HTTPFlowTable/HTTPFlowTable.module.scss";
import {addToTab} from "@/pages/MainTabs";
import {genDefaultPagination, PaginationSchema} from "@/pages/invoker/schema";
import {QueryWebShellRequest} from "@/pages/webShell/WebShellViewer";
import {Button, Space, Tooltip} from "antd";
import {FileOutlined, FolderOpenOutlined} from "@ant-design/icons";

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

    useEffect(() => {
        console.log("setSelectedNode", selectedNode);
    }, [selectedNode]);

    return (
        <ResizeBox
            freeze={true}
            firstRatio={'20%'}
            firstNode={
                <YakURLTree
                    onDataChange={(newData) => {
                        // 在这里，你可以访问新的 `data` 的值
                        // setTreeData(newData)
                        console.log("WebShellURLTreeAndTable", newData)
                        setData(newData)
                        setTotal(newData.length)
                    }}
                    onNodeSelect={(node) => {
                        console.log("setSelectedNode ", node)
                        setSelectedNode(node)
                    }}
                />
            }
            secondNode={
                <div className={cveStyles["cve-list"]}>
                    <TableVirtualResize<TreeNode>
                        // query={params}
                        titleHeight={36}
                        size='middle'
                        renderTitle={
                            <div className={cveStyles["cve-list-title-body"]}>
                                <div className={cveStyles["cve-list-title-left"]}>
                                    <div className={cveStyles["cve-list-title"]}>文件管理</div>
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
                            </div>
                        }
                        isRefresh={isRefresh}
                        renderKey='key'
                        data={selectedNode.length > 0 ? selectedNode : data}
                        loading={loading}
                        enableDrag={true}
                        columns={columns}
                        // onRowClick={onRowClick}
                        pagination={{
                            page: pagination.Page,
                            limit: pagination.Limit,
                            total,
                            onChange: update
                        }}
                        // onRowContextMenu={onRowContextMenu}
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